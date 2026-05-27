/**
 * EXIF Data Extractor
 * Extracts GPS, timestamp, and camera info from photos
 *
 * Gracefully handles missing EXIF data with fallbacks
 */

const { ExifTool } = require('exiftool-vendored');
const fs = require('fs');

// ============================================================================
// CONSTANTS
// ============================================================================

const GPS_BOUNDS = {
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180
};

const TIMESTAMP_BOUNDS = {
  MIN_YEAR: 1970,
  MAX_YEAR: 2100
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Extract EXIF data from image file
 *
 * @param {string} filePath - Full path to image file
 * @param {object} fallbackLocation - { latitude, longitude } from user profile
 * @returns {Promise<object>} EXIF data with fallbacks
 *
 * @example
 * const exif = await extractEXIFData('/uploads/photos/photo.jpg', {
 *   latitude: 40.7128,
 *   longitude: -74.0060
 * });
 *
 * Returns:
 * {
 *   timestamp: "2026-05-21T14:30:00Z",
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   altitude: 42.5,
 *   camera: {
 *     make: "Canon",
 *     model: "EOS 5D Mark IV",
 *     iso: 400,
 *     fStop: "f/2.8",
 *     shutterSpeed: "1/1000",
 *     focalLength: "50mm"
 *   }
 * }
 */
async function extractEXIFData(filePath, fallbackLocation = {}) {
  const startTime = Date.now();

  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`[EXIF] File not found: ${filePath}`);
      return buildFallbackData(fallbackLocation);
    }

    // Initialize exiftool
    const exiftool = new ExifTool();

    // Read EXIF data
    let tags;
    try {
      tags = await exiftool.read(filePath);
    } catch (err) {
      console.warn(`[EXIF] Could not read EXIF: ${err.message}`);
      await exiftool.end();
      return buildFallbackData(fallbackLocation);
    }

    // Parse EXIF data
    const exifData = {
      timestamp: parseTimestamp(tags),
      latitude: parseLatitude(tags),
      longitude: parseLongitude(tags),
      altitude: parseAltitude(tags),
      camera: parseCamera(tags)
    };

    // Validate GPS coordinates
    if (exifData.latitude !== null && exifData.longitude !== null) {
      if (!isValidGPS(exifData.latitude, exifData.longitude)) {
        console.warn('[EXIF] Invalid GPS coordinates, using fallback');
        exifData.latitude = fallbackLocation.latitude || null;
        exifData.longitude = fallbackLocation.longitude || null;
      }
    } else {
      // Use fallback location if no GPS
      exifData.latitude = fallbackLocation.latitude || null;
      exifData.longitude = fallbackLocation.longitude || null;
    }

    // Validate timestamp
    if (exifData.timestamp && !isValidTimestamp(exifData.timestamp)) {
      console.warn('[EXIF] Invalid timestamp, using current time');
      exifData.timestamp = new Date().toISOString();
    }

    // If no timestamp at all, use current time
    if (!exifData.timestamp) {
      exifData.timestamp = new Date().toISOString();
    }

    // Close exiftool
    await exiftool.end();

    const processingTime = Date.now() - startTime;
    console.log(`[EXIF] Extracted in ${processingTime}ms`);

    return exifData;

  } catch (err) {
    console.error(`[EXIF] Unexpected error: ${err.message}`);
    return buildFallbackData(fallbackLocation);
  }
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse and validate GPS latitude
 * @returns {number|null} Latitude in decimal degrees or null
 */
function parseLatitude(tags) {
  if (!tags || !tags.GPSLatitude) return null;

  const lat = Number(tags.GPSLatitude);
  if (isNaN(lat)) return null;

  return isValidLatitude(lat) ? lat : null;
}

/**
 * Parse and validate GPS longitude
 * @returns {number|null} Longitude in decimal degrees or null
 */
function parseLongitude(tags) {
  if (!tags || !tags.GPSLongitude) return null;

  const lng = Number(tags.GPSLongitude);
  if (isNaN(lng)) return null;

  return isValidLongitude(lng) ? lng : null;
}

/**
 * Parse GPS altitude
 * @returns {number|null} Altitude in meters or null
 */
function parseAltitude(tags) {
  if (!tags || !tags.GPSAltitude) return null;

  const alt = Number(tags.GPSAltitude);
  return isNaN(alt) ? null : alt;
}

/**
 * Parse timestamp from EXIF
 * Priority: DateTimeOriginal > CreateDate
 * Converts to ISO 8601 UTC
 *
 * @returns {string|null} ISO 8601 UTC timestamp or null
 */
function parseTimestamp(tags) {
  if (!tags) return null;

  // Try DateTimeOriginal first (when photo was taken)
  const dateTime = tags.DateTimeOriginal || tags.CreateDate;

  if (!dateTime) return null;

  try {
    // Convert to Date object
    let date;

    if (dateTime instanceof Date) {
      date = dateTime;
    } else if (typeof dateTime === 'string') {
      // Handle various date formats
      date = new Date(dateTime);
    } else {
      return null;
    }

    // Verify valid date
    if (isNaN(date.getTime())) return null;

    // Convert to ISO 8601 UTC
    return date.toISOString();

  } catch (err) {
    console.warn(`[EXIF] Could not parse timestamp: ${dateTime}`);
    return null;
  }
}

/**
 * Parse camera information
 * @returns {object} Camera details (may be empty)
 */
function parseCamera(tags) {
  if (!tags) return {};

  return {
    make: tags.Make || null,
    model: tags.Model || null,
    iso: tags.ISOSpeedRatings ? Number(tags.ISOSpeedRatings) : null,
    fStop: tags.FNumber ? `f/${tags.FNumber}` : null,
    shutterSpeed: tags.ExposureTime ? `${tags.ExposureTime}s` : null,
    focalLength: tags.FocalLength ? `${tags.FocalLength}mm` : null
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if latitude is valid
 * Valid range: -90 to +90
 */
function isValidLatitude(lat) {
  return lat >= GPS_BOUNDS.LAT_MIN && lat <= GPS_BOUNDS.LAT_MAX;
}

/**
 * Check if longitude is valid
 * Valid range: -180 to +180
 */
function isValidLongitude(lng) {
  return lng >= GPS_BOUNDS.LNG_MIN && lng <= GPS_BOUNDS.LNG_MAX;
}

/**
 * Check if GPS coordinates are valid
 */
function isValidGPS(lat, lng) {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Check if timestamp is valid
 * - Not in the future
 * - Not more than ~56 years old (since 1970)
 */
function isValidTimestamp(isoString) {
  try {
    const date = new Date(isoString);

    // Check if date is actually valid (not NaN)
    if (isNaN(date.getTime())) return false;

    const now = new Date();

    // Not in the future
    if (date > now) return false;

    // Not too old (before 1970)
    const year = date.getFullYear();
    if (year < TIMESTAMP_BOUNDS.MIN_YEAR || year > TIMESTAMP_BOUNDS.MAX_YEAR) {
      return false;
    }

    return true;

  } catch (err) {
    return false;
  }
}

// ============================================================================
// FALLBACK DATA
// ============================================================================

/**
 * Build fallback EXIF data when extraction fails
 * Uses current timestamp and user's home location (if available)
 */
function buildFallbackData(fallbackLocation = {}) {
  return {
    timestamp: new Date().toISOString(),
    latitude: fallbackLocation.latitude || null,
    longitude: fallbackLocation.longitude || null,
    altitude: null,
    camera: {}
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  extractEXIFData,
  parseLatitude,
  parseLongitude,
  parseAltitude,
  parseTimestamp,
  parseCamera,
  isValidLatitude,
  isValidLongitude,
  isValidGPS,
  isValidTimestamp
};
