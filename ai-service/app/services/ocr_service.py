"""
app/services/ocr_service.py

Tesseract OCR wrapper with image preprocessing.

Preprocessing pipeline (improves OCR accuracy on photos):
  1. Convert to grayscale
  2. Increase contrast (CLAHE)
  3. Denoise
  4. Binarize (Otsu threshold)
  5. Run Tesseract

If OCR_ENABLED=false in settings, returns empty string (caller handles fallback).
"""

import base64
import io
import logging

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


def extract_text_from_image(image_bytes: bytes, file_id: int | None = None) -> tuple[str, str | None]:
    """
    Extract text from an image file using OCR.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, BMP, TIFF supported).
        file_id: Backend file ID for logging.

    Returns:
        (extracted_text, image_base64)
        - extracted_text: OCR result string (empty if OCR disabled or failed).
        - image_base64: Base64-encoded image for Gemini vision (always returned
          regardless of OCR setting so Gemini can do visual analysis).
    """
    settings = get_settings()

    # Always produce base64 for Gemini vision — even if OCR is disabled
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    if not settings.ocr_enabled:
        logger.info("OCR disabled — skipping text extraction for file_id=%s", file_id)
        return "", image_base64

    try:
        from PIL import Image, ImageFilter, ImageEnhance
        import pytesseract

        image = Image.open(io.BytesIO(image_bytes))

        # Step 1: Convert to grayscale
        image = image.convert("L")

        # Step 2: Resize if too small (improves OCR on small photos)
        min_width = 1000
        if image.width < min_width:
            scale = min_width / image.width
            new_size = (int(image.width * scale), int(image.height * scale))
            image = image.resize(new_size, Image.LANCZOS)

        # Step 3: Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        # Step 4: Sharpen
        image = image.filter(ImageFilter.SHARPEN)

        # Step 5: Run Tesseract
        text = pytesseract.image_to_string(image, lang="eng", config="--psm 3")
        cleaned = text.strip()

        logger.info(
            "OCR extracted %d chars from file_id=%s",
            len(cleaned), file_id,
        )
        return cleaned, image_base64

    except ImportError:
        logger.warning("pytesseract or Pillow not installed — OCR skipped for file_id=%s", file_id)
        return "", image_base64
    except Exception as e:
        logger.error("OCR failed for file_id=%s: %s", file_id, e)
        return "", image_base64
