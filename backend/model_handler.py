"""
model_handler.py
Loads a Vision-Language Model (VLM) once at startup and provides
the answer_query(image, question) interface used by the FastAPI endpoint.

Model choice: LLaVA-1.5-7B via HuggingFace transformers
  - Well-supported by transformers without extra dependencies
  - Works on CPU (slowly) and GPU (fast with 4-bit quant via bitsandbytes)

The module exposes:
  load_model()       → called once at startup
  answer_query(img, question) → returns (answer_str, confidence_float)
  is_model_loaded()  → health-check helper
"""

import os
import time
import logging
from typing import Optional, Tuple

from PIL import Image

logger = logging.getLogger("satquery.model")

# ---------------------------------------------------------------------------
# Configuration — can be overridden via environment variables
# ---------------------------------------------------------------------------
MODEL_ID = os.getenv("SATQUERY_MODEL_ID", "llava-hf/llava-1.5-7b-hf")
USE_4BIT = os.getenv("SATQUERY_4BIT", "true").lower() == "true"  # quantize if GPU present
MAX_NEW_TOKENS = int(os.getenv("SATQUERY_MAX_TOKENS", "512"))

# ---------------------------------------------------------------------------
# Global singletons (loaded once, reused per request)
# ---------------------------------------------------------------------------
_processor = None
_model = None
_device = None
_model_name_display = MODEL_ID.split("/")[-1]


def is_model_loaded() -> bool:
    return _model is not None and _processor is not None


def load_model() -> None:
    """
    Load the VLM processor + model into memory.
    Called once during FastAPI lifespan startup.
    Handles GPU/CPU detection and optional 4-bit quantisation.
    """
    global _processor, _model, _device

    import torch
    from transformers import LlavaNextProcessor, LlavaNextForConditionalGeneration, BitsAndBytesConfig

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"[ModelHandler] Loading {MODEL_ID} on device={_device} ...")

    _processor = LlavaNextProcessor.from_pretrained(MODEL_ID)

    # Use 4-bit quantisation if CUDA is available and bitsandbytes is installed
    quant_config = None
    if _device == "cuda" and USE_4BIT:
        try:
            quant_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
            )
            logger.info("[ModelHandler] Using 4-bit NF4 quantisation.")
        except Exception as e:
            logger.warning(f"[ModelHandler] Could not configure 4-bit quant: {e}. Falling back to fp16.")

    load_kwargs = {"device_map": "auto"} if _device == "cuda" else {}
    if quant_config:
        load_kwargs["quantization_config"] = quant_config
    else:
        if _device == "cuda":
            load_kwargs["torch_dtype"] = "auto"

    _model = LlavaNextForConditionalGeneration.from_pretrained(MODEL_ID, **load_kwargs)

    if _device == "cpu":
        _model = _model.to("cpu")

    _model.eval()
    logger.info(f"[ModelHandler] Model '{MODEL_ID}' loaded successfully on {_device}.")


def _build_prompt(question: str) -> str:
    """
    Construct the instruction-tuned conversation prompt for LLaVA-1.5.
    LLaVA-1.5 uses the Vicuna chat template:
      USER: <image>\n{question} ASSISTANT:
    """
    return f"USER: <image>\nYou are an expert satellite image analyst. Answer the following question about the satellite/aerial image concisely and accurately.\nQuestion: {question}\nASSISTANT:"


def answer_query(image: Image.Image, question: str) -> Tuple[str, float]:
    """
    Run VLM inference on a PIL image + question string.

    Returns:
        answer (str):       The model's natural-language answer
        confidence (float): A heuristic confidence score 0.0–1.0
    """
    if not is_model_loaded():
        raise RuntimeError("Model is not loaded. Call load_model() first.")

    import torch

    prompt = _build_prompt(question)
    inputs = _processor(text=prompt, images=image, return_tensors="pt")
    inputs = {k: v.to(_device) for k, v in inputs.items()}

    t0 = time.time()
    with torch.no_grad():
        output = _model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,          # Greedy for deterministic demo output
            temperature=1.0,
            output_scores=True,
            return_dict_in_generate=True,
        )
    elapsed = time.time() - t0
    logger.info(f"[ModelHandler] Inference completed in {elapsed:.2f}s")

    # Decode generated tokens (excluding the input prompt tokens)
    input_len = inputs["input_ids"].shape[-1]
    generated_ids = output.sequences[0][input_len:]
    answer = _processor.decode(generated_ids, skip_special_tokens=True).strip()

    # Heuristic confidence: average max softmax probability over generated tokens
    confidence = _compute_confidence(output.scores, generated_ids)

    return answer, confidence


def _compute_confidence(scores, generated_ids) -> float:
    """
    Heuristic confidence score derived from token-level max log-probabilities.
    Returns a value in [0.0, 1.0].
    """
    try:
        import torch
        import torch.nn.functional as F

        if scores is None or len(scores) == 0:
            return 0.75  # Fallback placeholder

        # Gather max probability at each generated token position
        max_probs = []
        for score_tensor in scores:
            probs = F.softmax(score_tensor[0], dim=-1)
            max_probs.append(probs.max().item())

        avg_max_prob = sum(max_probs) / len(max_probs)
        # Clamp to a reasonable range (VLMs tend toward very high top-1 probs)
        confidence = min(0.98, max(0.30, avg_max_prob))
        return round(confidence, 4)

    except Exception:
        return 0.75  # Graceful fallback


def get_model_info() -> dict:
    """Return metadata about the currently loaded model for the trace panel."""
    return {
        "model_id": MODEL_ID,
        "display_name": _model_name_display,
        "device": _device or "not_loaded",
        "quantized": USE_4BIT and (_device == "cuda"),
        "loaded": is_model_loaded(),
    }
