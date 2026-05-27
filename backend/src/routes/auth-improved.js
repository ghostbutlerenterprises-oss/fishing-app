const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

// Limit login attempts: 5 tries per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: false, // Don't return RateLimit-* headers
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' // Skip in tests
});

// Limit registration: 3 per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const validateEmail = (email) => {
  if (!email) throw new Error('Email is required');
  if (!validator.isEmail(email)) throw new Error('Invalid email format');
  if (email.length > 255) throw new Error('Email is too long');
};

const validateUsername = (username) => {
  if (!username) throw new Error('Username is required');
  if (username.length < 3) throw new Error('Username must be at least 3 characters');
  if (username.length > 100) throw new Error('Username is too long');
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, underscore, and hyphen');
  }
};

const validatePassword = (password) => {
  if (!password) throw new Error('Password is required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter');
  if (!/[0-9]/.test(password)) throw new Error('Password must contain at least one number');
};

// ============================================================================
// ROUTES
// ============================================================================

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, username, password, first_name, last_name } = req.body;

    // Input validation
    validateEmail(email);
    validateUsername(username);
    validatePassword(password);

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [normalizedEmail, username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'Please check your details and try again'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username',
      [normalizedEmail, username, hashedPassword, first_name || null, last_name || null]
    );

    const user = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Create initial streak record
    await pool.query(
      'INSERT INTO user_streaks (user_id) VALUES ($1)',
      [user.id]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    console.error('[REGISTRATION ERROR]', err.message);

    // Return generic error to user
    res.status(400).json({
      error: 'Registration failed',
      message: err.message || 'Please check your details and try again'
    });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred. Please try again.'
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, first_name, last_name, profile_photo_url, bio, home_location_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    console.error('[AUTH/ME ERROR]', err.message);
    res.status(500).json({
      error: 'Failed to retrieve user',
      message: 'An error occurred. Please try again.'
    });
  }
});

module.exports = router;
