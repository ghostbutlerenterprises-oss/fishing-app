const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Image Processor Utility
 * Validates and optimizes images for storage
 *
 * Performance target: < 500ms per image
 */

// Constants
const MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const DIMENSION_LIMITS = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  MAX_WIDTH: 8000,
  MAX_HEIGHT: 6000
};

const RESIZE_CONFIG = {
  MAX_WIDTH: 1600,
  QUALITY: 85, // JPEG quality 1-100
  PROGRESSIVE: true // Progressive JPEG encoding
};

/**
 * Validate and process image file
 *
 * @param {string} filePath - Path to uploaded file
 * @param {object} options - { maxWidth, quality }
 * @returns {Promise<object>} { width, height, fileSize, mimeType }
 * @throws {Error} If validation fails or processing error
 */
async function processImage(filePath, options = {}) {
  const startTime = Date.now();

  try {
    // Merge with defaults
    const config = {
      maxWidth: options.maxWidth || RESIZE_CONFIG.MAX_WIDTH,
      quality: options.quality || RESIZE_CONFIG.QUALITY
    };

    // Step 1: Read image metadata (fast operation)
    const metadata = await sharp(filePath).metadata();
    const { width, height, format } = metadata;

    if (!width || !height) {
      throw new Error('Could not determine image dimensions');
    }

    // Step 2: Validate dimensions
    validateDimensions(width, height);

    // Step 3: Process image (resize, compress, optimize)
    await sharp(filePath)
      .resize(config.maxWidth, null, {
        withoutEnlargement: true, // Don't upscale small images
        fit: 'inside'
      })
      .jpeg({
        quality: config.quality,
        progressive: RESIZE_CONFIG.PROGRESSIVE,
        mozjpeg: true // Better compression
      })
      .toFile(filePath); // Overwrite original

    // Step 4: Get final file size
    const fileStats = await fs.stat(filePath);
    const finalWidth = (width > config.maxWidth)
      ? config.maxWidth
      : width;
    const aspectRatio = height / width;
    const finalHeight = Math.round(finalWidth * aspectRatio);

    const processingTime = Date.now() - startTime;
    console.log(`[IMAGE PROCESSOR] Processed image in ${processingTime}ms`);

    // Step 5: Return metadata
    return {
      width: finalWidth,
      height: finalHeight,
      fileSize: fileStats.size,
      mimeType: 'image/jpeg' // Always JPEG after processing
    };

  } catch (err) {
    // Cleanup on error
    try {
      await fs.unlink(filePath);
    } catch (unlinkErr) {
      console.error('[IMAGE PROCESSOR] Could not delete temp file:', unlinkErr.message);
    }

    // Re-throw with context
    throw new Error(`Image processing failed: ${err.message}`);
  }
}

/**
 * Validate image dimensions
 *
 * @param {number} width
 * @param {number} height
 * @throws {Error} If dimensions invalid
 */
function validateDimensions(width, height) {
  const min = DIMENSION_LIMITS.MIN_WIDTH;
  const minH = DIMENSION_LIMITS.MIN_HEIGHT;
  const max = DIMENSION_LIMITS.MAX_WIDTH;
  const maxH = DIMENSION_LIMITS.MAX_HEIGHT;

  if (width < min || height < minH) {
    throw new Error(
      `Image too small. Minimum is ${min}x${minH} pixels. ` +
      `Your image is ${width}x${height}`
    );
  }

  if (width > max || height > maxH) {
    throw new Error(
      `Image too large. Maximum is ${max}x${maxH} pixels. ` +
      `Your image is ${width}x${height}`
    );
  }
}

/**
 * Generate unique filename with timestamp and random hash
 * Format: YYYYMMDD_randomhash.jpg
 *
 * @returns {string} Unique filename
 */
function generateUniqueFilename() {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomHash = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${randomHash}.jpg`;
}

module.exports = {
  processImage,
  validateDimensions,
  generateUniqueFilename,
  MIME_TYPES,
  DIMENSION_LIMITS,
  RESIZE_CONFIG
};
