#!/usr/bin/env python3
"""
gpt_image_cli.py  –  universal CLI for OpenAI image models.

Changes vs. previous version
----------------------------
* Auto‑retries without `response_format` if the API rejects it.
* Accepts either `.b64_json` (preferred) or `.url` in the
  response and saves the images in both cases.
* Falls back from requests‑less environments: if `requests`
  isn’t available, it simply prints the URL instead of saving.
"""

from __future__ import annotations

import base64
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Sequence

from openai import OpenAI, OpenAIError

try:
    import requests  # noqa: F401
    _HAS_REQUESTS = True
except ModuleNotFoundError:
    _HAS_REQUESTS = False


# ── helpers ──────────────────────────────────────────────────────────────────

def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print(
            "Error: OPENAI_API_KEY environment variable not set.\n"
            "export OPENAI_API_KEY='sk‑…'  and rerun."
        )
        sys.exit(1)
    return OpenAI(api_key=api_key)


def _attempt_generate(
    client: OpenAI,
    *,
    prompt: str,
    size: str,
    n: int,
    quality: str,
    include_response_format: bool = True,
):
    kwargs = dict(
        model="gpt-image-1",  # change to dall-e-3 etc. if you prefer
        prompt=prompt,
        size=size,
        n=n,
        quality=quality,
    )
    if include_response_format:
        kwargs["response_format"] = "b64_json"

    return client.images.generate(**kwargs)


def generate_images(
    client: OpenAI,
    prompt: str,
    *,
    size: str = "1024x1024",
    n: int = 1,
    quality: str = "high",
) -> Sequence[dict]:
    """
    Call the API.  Returns a list of dicts with keys 'b64_json' or 'url'.
    Automatically retries without `response_format` if necessary.
    """
    try:
        return _attempt_generate(client, prompt=prompt, size=size, n=n,
                                 quality=quality, include_response_format=True).data
    except OpenAIError as e:
        if "response_format" in str(e):
            # retry without the parameter
            return _attempt_generate(client, prompt=prompt, size=size, n=n,
                                     quality=quality,
                                     include_response_format=False).data
        raise


def save_images(
    images: Sequence[dict],
    output_dir: str | Path = "generated_images",
) -> List[Path]:
    """
    Save either Base‑64 or URL images.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    paths: List[Path] = []

    for idx, img in enumerate(images, start=1):
        filename = output_dir / f"image_{timestamp}_{idx}.png"

        if "b64_json" in img and img["b64_json"]:
            data = base64.b64decode(img["b64_json"])
            with open(filename, "wb") as f:
                f.write(data)
            paths.append(filename)

        elif "url" in img and img["url"]:
            if not _HAS_REQUESTS:
                print(f"• Image URL (requests not installed): {img['url']}")
                continue
            try:
                resp = requests.get(img["url"], timeout=30)
                resp.raise_for_status()
                with open(filename, "wb") as f:
                    f.write(resp.content)
                paths.append(filename)
            except Exception as exc:  # network errors
                print(f"✗ Failed to download {img['url']}: {exc}")

    return paths


# ── interactive CLI ─────────────────────────────────────────────────────────

def main() -> None:
    client = get_client()
    size = "1024x1024"
    num_images = 1

    print("\nGPT Image Generator")
    print("Type 'quit' or 'exit' to leave.")
    print("Enter '/size  <value>'  to change resolution.")
    print("Enter '/count <1‑4>'    to change number of images.")
    print("-" * 50)

    while True:
        try:
            user_input = input("Prompt> ").strip()

            if user_input.lower() in {"quit", "exit"}:
                print("Good‑bye!")
                break

            if user_input.startswith("/size "):
                new_size = user_input[6:].strip().lower()
                if new_size in {"1024x1024", "1024x1536", "1536x1024", "auto"}:
                    size = new_size
                    print(f"✓ Image size set to {size}")
                else:
                    print("✗ Invalid size.")
                continue

            if user_input.startswith("/count "):
                try:
                    cnt = int(user_input[7:].strip())
                    if 1 <= cnt <= 4:
                        num_images = cnt
                        print(f"✓ Will generate {num_images} image(s)")
                    else:
                        print("✗ Count must be 1‑4.")
                except ValueError:
                    print("✗ '/count' expects an integer.")
                continue

            if not user_input:
                continue

            print(f"Generating {num_images} image(s) at {size} …")
            images = generate_images(
                client,
                prompt=user_input,
                size=size,
                n=num_images,
                quality="high",
            )

            saved = save_images(images)
            if saved:
                print("✓ Images saved:")
                for p in saved:
                    print(f"  {p.resolve()}")
            else:
                print("⚠️  No local files saved (see messages above).")

        except KeyboardInterrupt:
            print("\nInterrupted. Exiting.")
            break
        except Exception as exc:   # pylint: disable=broad-except
            print(f"✗ Error: {exc}")


# ── main guard ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
