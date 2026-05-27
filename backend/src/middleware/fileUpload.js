const multer = require('multer');
const path = require('path');
const { generateUniqueFilename } = require('../utils/imageProcessor');

/**
 * Multer Configuration for Photo Upload
 *
 * Handles:
 * - File type validation (JPEG, PNG only)
 * - File size limits (10MB max)
 * - Safe file storage with unique naming
 * - Cleanup of rejected files
 */

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in ./uploads/photos/
    cb(null, path.join(__dirname, '../../uploads/photos'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: YYYYMMDD_randomhash.jpg
    const filename = generateUniqueFilename();
    cb(null, filename);
  }
});

// ============================================================================
// FILE FILTER (VALIDATION)
// ============================================================================

const fileFilter = (req, file, cb) => {
  // Only accept JPEG and PNG
  const allowedMimes = ['image/jpeg', 'image/png'];

  if (allowedMimes.includes(file.mimetype)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file with error
    const error = new Error(
      `Invalid file type: ${file.mimetype}. Only JPEG and PNG allowed.`
    );
    error.status = 400;
    error.code = 'INVALID_MIME_TYPE';
    cb(error);
  }
};

// ============================================================================
// MULTER INSTANCE
// ============================================================================

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Handle multer errors and convert to standard API responses
 *
 * Multer errors:
 * - LIMIT_PART_COUNT: Too many parts
 * - LIMIT_FILE_SIZE: File too large (our case: 10MB)
 * - LIMIT_FILE_COUNT: Too many files
 * - LIMIT_FIELD_NAME_SIZE: Field name too long
 * - LIMIT_FIELD_SIZE: Field value too long
 * - LIMIT_UNEXPECTED_FILE: Unexpected file field
 * - MISSING_FIELD_NAME: Missing field name
 * - FILE_TOO_LARGE: Custom error (we'll catch this)
 */
const handleMulterError = (err, req, res, next) => {
  // If no multer error, pass to next middleware
  if (!err) {
    return next();
  }

  console.error('[MULTER ERROR]', err.code, err.message);

  let statusCode = 400;
  let errorMessage = 'File upload failed';

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      statusCode = 413; // Payload Too Large
      errorMessage = `File too large. Maximum size is 10MB. Your file is ${(err.limit / 1024 / 1024).toFixed(1)}MB`;
      break;

    case 'INVALID_MIME_TYPE':
      statusCode = 400;
      errorMessage = 'Invalid file type. Only JPEG and PNG files are allowed.';
      break;

    case 'LIMIT_FILE_COUNT':
      statusCode = 400;
      errorMessage = 'Only one file allowed per upload';
      break;

    case 'LIMIT_UNEXPECTED_FILE':
      statusCode = 400;
      errorMessage = 'Unexpected file field. Expected "photo"';
      break;

    default:
      statusCode = 400;
      errorMessage = err.message || 'File upload failed';
  }

  res.status(statusCode).json({
    success: false,
    error: err.code || 'Upload error',
    message: errorMessage
  });
};

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/**
 * Express middleware for single file upload
 * Field name: "photo"
 *
 * Usage in route:
 *   router.post('/upload', upload.single('photo'), errorHandler, handler);
 *
 * @returns {Function} Multer middleware
 */
function uploadMiddleware() {
  return upload.single('photo');
}

/**
 * Error handler for multer
 * Must be placed after upload middleware
 *
 * Usage in route:
 *   router.post('/upload', upload.single('photo'), handleMulterError, handler);
 *
 * @returns {Function} Error handler middleware
 */
function errorHandler() {
  return handleMulterError;
}

module.exports = {
  upload,
  uploadMiddleware,
  errorHandler,
  handleMulterError
};
