"""
app.py
SatQuery AI — FastAPI application entry point.

Exposes:
  GET  /health        → model/service health check
  POST /query         → main inference endpoint (multipart: file + question)
  GET  /model-info    → metadata about the loaded VLM

Run with:
  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from controller import classify_task
import model_handler
from utils.image_utils import validate_and_load_image, resize_if_needed, get_image_metadata
from utils.trace_logger import build_trace

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("satquery.app")

# ---------------------------------------------------------------------------
# Lifespan: load model once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== SatQuery AI starting — loading VLM model ===")
    try:
        model_handler.load_model()
        logger.info("=== Model loaded successfully. Ready to serve requests. ===")
    except Exception as exc:
        logger.error(f"=== CRITICAL: Model failed to load: {exc} ===")
        logger.warning("Server will start but /query will return 503 until model is available.")
    yield
    logger.info("=== SatQuery AI shutting down ===")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SatQuery AI",
    description="Vision-language assistant for satellite & remote-sensing image analysis.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Quick liveness + model readiness check."""
    info = model_handler.get_model_info()
    return {
        "status": "ok" if info["loaded"] else "model_loading",
        "model": info,
    }


@app.get("/model-info")
async def model_info():
    """Return metadata about the loaded VLM."""
    return model_handler.get_model_info()


@app.post("/query")
async def query(
    file: UploadFile = File(..., description="Satellite image (PNG/JPEG/TIFF)"),
    question: str = Form(..., description="Plain-English question about the image"),
):
    """
    Main inference endpoint.
    Accepts a satellite image and a question, returns a natural-language answer
    along with a confidence score and an execution trace.
    """

    # --- 1. Input validation ---
    question = question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    if not model_handler.is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="Model is still loading. Please wait a moment and try again."
        )

    # --- 2. Load & validate image ---
    try:
        file_bytes = await file.read()
        image = validate_and_load_image(file_bytes, file.filename or "upload.png")
        image = resize_if_needed(image)
        img_meta = get_image_metadata(image, file.filename or "upload.png")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error reading image")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {exc}")

    # --- 3. Classify task ---
    task_type, classify_reason = classify_task(question)
    logger.info(f"Task classified as '{task_type}' | Q: {question[:80]}")

    # --- 4. Build trace ---
    model_info = model_handler.get_model_info()
    trace = build_trace(task_type=task_type, model_used=model_info["display_name"])
    trace.add_step(
        step="image_validation",
        detail=f"Image '{img_meta['filename']}' validated — {img_meta['width']}×{img_meta['height']}px RGB",
    )
    trace.add_step(
        step="task_classification",
        detail=f"Classified as '{task_type}'. {classify_reason}",
    )

    # --- 5. Route to appropriate handler ---
    if task_type == "vqa":
        try:
            answer, confidence = model_handler.answer_query(image, question)
            trace.add_step(
                step="vlm_inference",
                detail=f"LLaVA-1.5 inference complete. Confidence heuristic: {confidence:.2%}",
            )
            trace.add_step(step="response_ready", detail="Answer generated and ready to return.")
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        except Exception as exc:
            logger.exception("VLM inference error")
            raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}")

    else:
        # Graceful placeholder for unimplemented task types
        placeholders = {
            "change_detection": (
                "Change detection is planned for Phase 2 — showing task classification only. "
                "I detected that you're asking about temporal changes or comparisons between images. "
                "This feature will use a specialized bi-temporal encoder to compare two satellite images.",
                0.0,
            ),
            "segmentation": (
                "Semantic segmentation is planned for Phase 2 — showing task classification only. "
                "I detected that you're asking for pixel-level segmentation or boundary delineation. "
                "This feature will use a segmentation model to produce a labeled map.",
                0.0,
            ),
            "counting": (
                "Object counting is planned for Phase 2 — showing task classification only. "
                "I detected that you're asking to count objects in the image. "
                "This feature will use a detection model to count and localize objects.",
                0.0,
            ),
        }
        answer, confidence = placeholders.get(
            task_type,
            (f"Task type '{task_type}' is not yet implemented.", 0.0)
        )
        trace.add_step(
            step="placeholder_response",
            detail=f"Task type '{task_type}' is planned for Phase 2. Returning placeholder.",
            status="warn",
        )

    return JSONResponse({
        "answer": answer,
        "confidence": confidence,
        "task_type": task_type,
        "image_meta": img_meta,
        "trace": trace.to_dict(),
    })


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal error occurred. Please try again."},
    )
