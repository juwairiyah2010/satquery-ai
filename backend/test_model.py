"""
test_model.py
Standalone script to verify the VLM loads and performs inference correctly
BEFORE wiring up the full FastAPI stack.

Usage:
  python test_model.py
  python test_model.py --image path/to/my_satellite.jpg --question "What do you see?"

The script will download the model weights on first run (may take several minutes).
"""

import argparse
import time
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="SatQuery AI — standalone model test")
    parser.add_argument(
        "--image", default=None,
        help="Path to a test image (PNG/JPEG). If omitted, creates a synthetic test image."
    )
    parser.add_argument(
        "--question", default="Describe what you see in this satellite image.",
        help="Question to ask the VLM."
    )
    parser.add_argument(
        "--model-id", default=None,
        help="Override the model ID (default: llava-hf/llava-1.5-7b-hf)."
    )
    args = parser.parse_args()

    # Override env var if CLI arg given
    if args.model_id:
        import os
        os.environ["SATQUERY_MODEL_ID"] = args.model_id

    # -------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("  SatQuery AI — Model Standalone Test")
    print("=" * 60)

    # -------------------------------------------------------------------------
    print("\n[1/4] Importing model_handler ...")
    try:
        import model_handler
    except ImportError as e:
        print(f"  ERROR: {e}")
        print("  Make sure you are running from the backend/ directory and all requirements are installed.")
        sys.exit(1)

    # -------------------------------------------------------------------------
    print(f"\n[2/4] Loading model: {model_handler.MODEL_ID}")
    print("  This may take several minutes on first run (downloading ~13 GB of weights).")
    t0 = time.time()
    model_handler.load_model()
    elapsed = time.time() - t0
    print(f"  ✓ Model loaded in {elapsed:.1f}s")
    info = model_handler.get_model_info()
    print(f"  Device: {info['device']} | Quantized: {info['quantized']}")

    # -------------------------------------------------------------------------
    print("\n[3/4] Preparing test image ...")
    if args.image:
        from PIL import Image
        img = Image.open(args.image).convert("RGB")
        print(f"  Loaded image: {args.image} ({img.width}×{img.height})")
    else:
        from PIL import Image, ImageDraw
        import random
        # Create a synthetic "aerial view" with colored patches
        img = Image.new("RGB", (512, 512), (34, 85, 34))  # Green base (vegetation)
        draw = ImageDraw.Draw(img)
        # Blue water body
        draw.ellipse([80, 200, 280, 380], fill=(30, 120, 200))
        # Grey urban area
        draw.rectangle([320, 60, 490, 220], fill=(160, 160, 160))
        # Brown bare soil
        draw.rectangle([30, 30, 200, 120], fill=(139, 115, 85))
        print("  Created synthetic 512×512 test image with vegetation, water, urban, and bare soil regions.")

    # -------------------------------------------------------------------------
    print(f"\n[4/4] Running inference ...")
    print(f"  Question: \"{args.question}\"")
    t1 = time.time()
    answer, confidence = model_handler.answer_query(img, args.question)
    elapsed = time.time() - t1

    print("\n" + "=" * 60)
    print("  RESULT")
    print("=" * 60)
    print(f"  Answer     : {answer}")
    print(f"  Confidence : {confidence:.2%}")
    print(f"  Inference  : {elapsed:.2f}s")
    print("=" * 60)
    print("\n✓ Test passed — model is working correctly!\n")


if __name__ == "__main__":
    main()
