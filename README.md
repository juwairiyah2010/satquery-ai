# SatQuery AI 🛰️

> **Interactive Vision-Language Assistant for Satellite & Remote-Sensing Image Analysis**

A hackathon-ready, full-stack MVP that lets you upload a satellite/aerial image, ask a plain-English question about it, and receive an AI-generated answer with a confidence score and an execution trace — all powered by **LLaVA-1.5-7B** via Hugging Face Transformers.

---

## Architecture

```
satquery-ai/
├── backend/                      # Python FastAPI server
│   ├── app.py                    # API entry point (POST /query, GET /health)
│   ├── controller.py             # Keyword-based task classifier
│   ├── model_handler.py          # LLaVA-1.5-7B loader & inference
│   ├── utils/
│   │   ├── image_utils.py        # Image validation & resizing
│   │   └── trace_logger.py       # Execution trace builder
│   ├── test_model.py             # Standalone VLM smoke test
│   ├── sample_images/            # Placeholder for demo images
│   └── requirements.txt
└── frontend/                     # React (Vite) application
    └── src/
        ├── App.jsx               # 3-panel layout
        └── components/
            ├── UploadPanel.jsx   # Drag-and-drop image upload
            ├── ChatBox.jsx       # NL question input
            ├── ResultView.jsx    # Answer + confidence bar
            └── TracePanel.jsx    # Collapsible execution trace
```

---

## ⚙️ Hardware Requirements

| Setup | Expected Inference Speed |
|---|---|
| NVIDIA GPU (8 GB+ VRAM) | ~3–10 seconds per query (4-bit quantised) |
| Apple Silicon (M1/M2/M3) | ~30–90 seconds (CPU mode) |
| CPU-only PC (16 GB RAM) | 2–5 minutes per query |

> **Note:** The model weights are ~13 GB. They are downloaded automatically from Hugging Face on first run.  
> Set `SATQUERY_4BIT=true` (default) to enable 4-bit NF4 quantisation on CUDA GPUs.

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- Git
- (Optional but strongly recommended) NVIDIA GPU with CUDA 11.8+

---

### 1 — Clone & navigate

```bash
git clone <your-repo-url>
cd satquery-ai
```

---

### 2 — Backend setup

```bash
cd backend

# Create & activate a virtual environment
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**GPU note (Windows/Linux):** If you have an NVIDIA GPU, install the CUDA-enabled PyTorch *before* the rest:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

---

### 3 — Test the model (strongly recommended before starting the API)

This will download the model weights (~13 GB) and run a smoke test:

```bash
python test_model.py
```

You should see output like:
```
✓ Model loaded in 42.3s
Answer     : This satellite image shows a mix of vegetation (green areas), ...
Confidence : 91.25%
```

Pass a custom image and question:
```bash
python test_model.py --image path/to/your/image.jpg --question "Are there any buildings?"
```

---

### 4 — Start the FastAPI backend

```bash
# From the backend/ directory (with venv active)
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Verify it's running:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "ok", "model": {"model_id": "llava-hf/llava-1.5-7b-hf", ...}}
```

**Test the /query endpoint with curl:**
```bash
curl -X POST http://localhost:8000/query \
  -F "file=@sample_images/test.jpg" \
  -F "question=What land cover types are visible?"
```

---

### 5 — Start the React frontend

```bash
cd ../frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Open your browser at **http://localhost:5173**

---

## 🌐 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SATQUERY_MODEL_ID` | `llava-hf/llava-1.5-7b-hf` | HuggingFace model ID |
| `SATQUERY_4BIT` | `true` | Enable 4-bit NF4 quantization (CUDA only) |
| `SATQUERY_MAX_TOKENS` | `512` | Max tokens to generate |
| `VITE_API_URL` | `` (empty) | Frontend API base URL (empty = use Vite proxy) |

---

## 🗺️ Task Classification Rules

The controller uses keyword matching (no ML) to route queries:

| Task Type | Trigger Keywords |
|---|---|
| `change_detection` | change, before/after, compare, deforestation, flood, temporal... |
| `segmentation` | segment, boundary, mask, outline, delineate... |
| `counting` | how many, count, number of, total number... |
| `vqa` | *(default — everything else)* |

Only `vqa` calls the VLM. Other types return a Phase-2 placeholder message.

---

## 📡 API Reference

### `POST /query`
**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | Satellite image (PNG/JPEG/TIFF, max 50 MB) |
| `question` | string | Plain-English question |

**Response:**
```json
{
  "answer": "The image shows a mix of dense forest ...",
  "confidence": 0.8831,
  "task_type": "vqa",
  "image_meta": { "filename": "sentinel2.jpg", "width": 1024, "height": 1024, "mode": "RGB" },
  "trace": {
    "task_type": "vqa",
    "model_used": "llava-1.5-7b-hf",
    "total_elapsed_ms": 7432.1,
    "steps": [
      { "step": "image_validation",    "detail": "...", "status": "ok", "duration_ms": null },
      { "step": "task_classification", "detail": "...", "status": "ok", "duration_ms": null },
      { "step": "vlm_inference",       "detail": "...", "status": "ok", "duration_ms": null },
      { "step": "response_ready",      "detail": "...", "status": "ok", "duration_ms": null }
    ]
  }
}
```

### `GET /health`
Returns model load status and device info.

### `GET /model-info`
Returns detailed model metadata.

---

## 🔧 Troubleshooting

**"Model is still loading" error**  
Wait 1–2 minutes after starting the server. The model loads in the background.

**Out of Memory (OOM) on GPU**  
Set `SATQUERY_4BIT=true` (already default). If still OOM, your GPU may have insufficient VRAM — the model will fall back to CPU automatically.

**TIFF images not displaying in browser**  
The browser cannot render TIFFs directly; the upload panel shows a generic file icon. The image is still sent to the backend correctly for inference.

**Slow inference on CPU**  
Expected — LLaVA-1.5-7B on CPU takes 2–5 minutes. For the demo, pre-run a query and show the result rather than live inference.

---

## 🛣️ Phase 2 Roadmap

- **Change Detection**: Bi-temporal encoder comparing before/after image pairs
- **Semantic Segmentation**: Pixel-level land cover classification  
- **Object Counting**: Detect and count buildings, vehicles, trees
- **GeoTIFF Support**: Parse and display geographic coordinates & projection info
- **Session History**: Store and replay previous queries
