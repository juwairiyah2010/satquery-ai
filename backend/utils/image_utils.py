"""
image_utils.py
Utilities for loading, validating, and preprocessing uploaded satellite images.
"""
import io
from pathlib import Path
from typing import Tuple

from PIL import Image, UnidentifiedImageError

# Allowed MIME types / extensions for satellite images
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB hard limit
TARGET_MAX_DIM = 1024  # Resize longest side to this if larger


def validate_and_load_image(file_bytes: bytes, filename: str) -> Image.Image:
    """
    Validate the uploaded file and return a PIL Image in RGB mode.

    Raises:
        ValueError: if the file is not a valid image or its format is unsupported.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. "
            f"Please upload one of: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    if len(file_bytes) > MAX_SIZE_BYTES:
        raise ValueError(
            f"File too large ({len(file_bytes) / 1_048_576:.1f} MB). "
            f"Maximum allowed size is {MAX_SIZE_BYTES // 1_048_576} MB."
        )

    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Detects truncated / corrupt files
    except UnidentifiedImageError:
        raise ValueError("Cannot identify the image file. It may be corrupt or not a valid image.")
    except Exception as exc:
        raise ValueError(f"Invalid image: {exc}")

    # Re-open after verify() (verify() consumes the stream)
    img = Image.open(io.BytesIO(file_bytes))
    img = img.convert("RGB")
    return img


def resize_if_needed(img: Image.Image, max_dim: int = TARGET_MAX_DIM) -> Image.Image:
    """
    Resize image so the longest side is at most max_dim, preserving aspect ratio.
    """
    w, h = img.size
    longest = max(w, h)
    if longest <= max_dim:
        return img
    scale = max_dim / longest
    new_w, new_h = int(w * scale), int(h * scale)
    return img.resize((new_w, new_h), Image.LANCZOS)


def get_image_metadata(img: Image.Image, filename: str) -> dict:
    """
    Return a small metadata dict for the frontend preview panel.
    """
    return {
        "filename": filename,
        "width": img.width,
        "height": img.height,
        "mode": img.mode,
    }
