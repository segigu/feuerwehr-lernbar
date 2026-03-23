#!/usr/bin/env python3
"""Colorize B&W figures from FwDV1 using OpenAI GPT Image API."""

import os
import sys
import time
import base64
import logging
from pathlib import Path
from PIL import Image
from openai import OpenAI, RateLimitError, APIError

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
SRC_DIR = SCRIPT_DIR / "fdv1_figures"
OUT_DIR = SCRIPT_DIR / "fdv1_figures_color"
ERROR_LOG = OUT_DIR / "colorize_errors.log"

# API config
MODEL = "gpt-image-1"
MAX_RETRIES = 5
PROMPT = (
    "Colorize this black-and-white photograph. "
    "Preserve every detail exactly as-is: all people, poses, equipment, "
    "text, labels, and composition must remain identical. "
    "Add realistic, vivid, saturated colors appropriate for firefighting "
    "equipment and uniforms. Make it look like a modern high-quality color photograph. "
    "Do not add, remove, or change any objects or text."
)


def load_api_key():
    """Load OPENAI_API_KEY from .env file."""
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1]
    raise ValueError(f"OPENAI_API_KEY not found in {ENV_FILE}")


def get_output_size(img_path):
    """Choose API output size based on image orientation."""
    with Image.open(img_path) as img:
        w, h = img.size
    if h > w:
        return "1024x1536"  # portrait
    else:
        return "1536x1024"  # landscape or square


def colorize_image(client, src_path, dst_path, size):
    """Send image to OpenAI for colorization with retry logic."""
    for attempt in range(MAX_RETRIES):
        try:
            with open(src_path, "rb") as f:
                result = client.images.edit(
                    model=MODEL,
                    image=f,
                    prompt=PROMPT,
                    size=size,
                    quality="high",
                    response_format="b64_json",
                )

            img_b64 = result.data[0].b64_json
            img_data = base64.b64decode(img_b64)
            with open(dst_path, "wb") as out:
                out.write(img_data)
            return True

        except RateLimitError as e:
            wait = min(5 * (2 ** attempt), 120)
            retry_after = getattr(e, "headers", {}).get("retry-after")
            if retry_after:
                wait = int(retry_after)
            logging.warning(f"  Rate limit hit, waiting {wait}s (attempt {attempt+1}/{MAX_RETRIES})")
            time.sleep(wait)

        except APIError as e:
            wait = 5 * (2 ** attempt)
            logging.warning(f"  API error: {e}, retrying in {wait}s (attempt {attempt+1}/{MAX_RETRIES})")
            time.sleep(wait)

    return False


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(message)s",
        datefmt="%H:%M:%S",
    )

    api_key = load_api_key()
    client = OpenAI(api_key=api_key)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Collect source images
    files = sorted(f for f in os.listdir(SRC_DIR) if f.endswith(".png"))
    total = len(files)
    logging.info(f"Found {total} images to colorize")

    # Check already done
    done = set(f for f in os.listdir(OUT_DIR) if f.endswith(".png"))
    remaining = [f for f in files if f not in done]
    if done:
        logging.info(f"Already colorized: {len(done)}, remaining: {len(remaining)}")

    errors = []

    for i, filename in enumerate(remaining, 1):
        src = SRC_DIR / filename
        dst = OUT_DIR / filename
        size = get_output_size(src)

        logging.info(f"[{len(done)+i}/{total}] {filename} → {size}")

        ok = colorize_image(client, src, dst, size)
        if ok:
            logging.info(f"  ✓ saved")
        else:
            errors.append(filename)
            logging.error(f"  ✗ FAILED after {MAX_RETRIES} retries")

    # Write error log
    if errors:
        with open(ERROR_LOG, "w") as f:
            for name in errors:
                f.write(name + "\n")
        logging.warning(f"\n{len(errors)} images failed — see {ERROR_LOG}")
    else:
        logging.info(f"\nAll {total} images colorized successfully!")


if __name__ == "__main__":
    main()
