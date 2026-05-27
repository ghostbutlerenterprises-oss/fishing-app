#!/usr/bin/env node
/**
 * Create a test user for integration testing
 * Run from backend folder: node CREATE_TEST_USER.js
 */

require('dotenv').config();
const pool = require('./src/db');
const jwt = require('jsonwebtoken');

async function createTestUser() {
  const client = await pool.connect();

  try {
    console.log('\n🔧 Creating test user...\n');

    // Create or get test user
    const result = await client.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, home_lat, home_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id
       RETURNING id, email, username, first_name, last_name`,
      [
        'test_angler',
        'test@anglers.local',
        'hashed_password_placeholder',
        'Test',
        'Angler',
        40.7128,
        -74.0060
      ]
    );

    const user = result.rows[0];
    const userId = user.id;

    console.log('✓ Test User Created/Found:');
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${userId}`);
    console.log(`  Name: ${user.first_name} ${user.last_name}`);
    console.log(`  Home Location: (${user.home_lat}, ${user.home_lng})\n`);

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'test-secret-key';
    const token = jwt.sign(
      { userId: userId, email: user.email },
      secret,
      { expiresIn: '24h' }
    );

    console.log('✓ JWT Token Generated (24 hours):\n');
    console.log(token);
    console.log('\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Ready for Integration Testing!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Next Steps:\n');
    console.log('1. Start backend (in a NEW PowerShell window):');
    console.log('   npm start\n');

    console.log('2. In original PowerShell, set the token:');
    console.log(`   $token = "${token}"\n`);

    console.log('3. Run Test 1 to log a catch\n');

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

createTestUser();
