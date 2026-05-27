const express = require('express');
const path = require('path');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { uploadMiddleware, errorHandler, handleMulterError } = require('../middleware/fileUpload');
const { processImage } = require('../utils/imageProcessor');
const { extractEXIFData } = require('../utils/exifExtractor');
const { evaluateCriteria } = require('../lib/badgeEngine');
const fs = require('fs');

const router = express.Router();

// GET /api/catches - Retrieve user's catches
router.get('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.userId;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    const species = req.query.species ? decodeURIComponent(req.query.species).trim() : null;
    const startDate = req.query.startDate ? req.query.startDate.trim() : null;
    const endDate = req.query.endDate ? req.query.endDate.trim() : null;
    let minWeight = req.query.minWeight ? parseFloat(req.query.minWeight) : null;
    let maxWeight = req.query.maxWeight ? parseFloat(req.query.maxWeight) : null;
    let minLength = req.query.minLength ? parseFloat(req.query.minLength) : null;
    let maxLength = req.query.maxLength ? parseFloat(req.query.maxLength) : null;
    const sort = req.query.sort || 'date';
    const order = (req.query.order || 'desc').toLowerCase();

    if (page < 1) return res.status(400).json({ success: false, error: 'Page must be >= 1' });
    if (limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Limit must be 1-100' });
    if (!['date', 'weight', 'length'].includes(sort)) return res.status(400).json({ success: false, error: 'Invalid sort' });
    if (!['asc', 'desc'].includes(order)) return res.status(400).json({ success: false, error: 'Invalid order' });

    const offset = (page - 1) * limit;
    let whereConditions = ['c.user_id = $1'];
    let params = [userId];
    let paramIndex = 2;

    if (species) {
      whereConditions.push(`c.species = $${paramIndex}`);
      params.push(species);
      paramIndex++;
    }
    if (startDate) {
      whereConditions.push(`c.caught_at >= $${paramIndex}::timestamp`);
      params.push(`${startDate}T00:00:00Z`);
      paramIndex++;
    }
    if (endDate) {
      whereConditions.push(`c.caught_at <= $${paramIndex}::timestamp`);
      params.push(`${endDate}T23:59:59Z`);
      paramIndex++;
    }
    if (minWeight !== null) {
      whereConditions.push(`c.weight_lbs >= $${paramIndex}`);
      params.push(minWeight);
      paramIndex++;
    }
    if (maxWeight !== null) {
      whereConditions.push(`c.weight_lbs <= $${paramIndex}`);
      params.push(maxWeight);
      paramIndex++;
    }
    if (minLength !== null) {
      whereConditions.push(`c.length_inches >= $${paramIndex}`);
      params.push(minLength);
      paramIndex++;
    }
    if (maxLength !== null) {
      whereConditions.push(`c.length_inches <= $${paramIndex}`);
      params.push(maxLength);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    let orderColumn = 'c.caught_at';
    if (sort === 'weight') orderColumn = 'c.weight_lbs';
    if (sort === 'length') orderColumn = 'c.length_inches';
    const orderClause = `${orderColumn} ${order.toUpperCase()}`;

    const countResult = await client.query(`SELECT COUNT(*) as total FROM catches c WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    const pages = Math.ceil(total / limit);

    const mainQuery = `
      SELECT c.id, c.user_id, c.species, c.weight_lbs, c.length_inches,
        c.photo_url, c.notes, c.caught_at, c.created_at,
        pr.max_weight_lbs as pr_weight
      FROM catches c
      LEFT JOIN personal_records pr ON c.user_id = pr.user_id AND c.species = pr.species
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const mainParams = [...params, limit, offset];
    const catchesResult = await client.query(mainQuery, mainParams);
    const catches = catchesResult.rows;

    const enrichedCatches = catches.map(c => ({
      id: c.id,
      species: c.species,
      weight_lbs: c.weight_lbs,
      length_inches: c.length_inches,
      photo_url: c.photo_url,
      notes: c.notes,
      caught_at: c.caught_at,
      created_at: c.created_at,
      personalRecord: {
        isCurrentRecord: c.pr_weight && c.weight_lbs === c.pr_weight,
        currentRecord: c.pr_weight || null
      }
    }));

    const statsQuery = `
      SELECT COUNT(*) as total_catches, COUNT(DISTINCT species) as unique_species,
        COALESCE(SUM(c.weight_lbs), 0) as total_weight,
        COALESCE(AVG(c.weight_lbs), 0) as avg_weight,
        MAX(c.weight_lbs) as max_weight
      FROM catches c WHERE ${whereClause}
    `;

    const statsResult = await client.query(statsQuery, params);
    const statsRow = statsResult.rows[0];

    const stats = {
      totalCatches: parseInt(statsRow.total_catches),
      uniqueSpecies: parseInt(statsRow.unique_species),
      totalWeight: parseFloat(statsRow.total_weight),
      averageWeight: parseFloat(statsRow.avg_weight)
    };

    res.status(200).json({
      success: true,
      data: {
        catches: enrichedCatches,
        pagination: { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 },
        stats
      }
    });

  } catch (err) {
    console.error('[CATCHES GET ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve catches' });
  } finally {
    client.release();
  }
});

// POST /api/catches - Log a catch
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.userId;
    const { photoUrl, species, weight_lbs, length_inches, notes, trip_id } = req.body;

    if (!species || typeof species !== 'string' || species.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Species is required' });
    }
    if (species.length > 100) {
      return res.status(400).json({ success: false, error: 'Species must be 100 chars or less' });
    }
    if (!photoUrl || typeof photoUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Photo URL is required' });
    }
    if (!photoUrl.startsWith('/uploads/')) {
      return res.status(400).json({ success: false, error: 'Invalid photo URL format' });
    }

    const photoPath = path.join(__dirname, '../../..', photoUrl);
    if (!fs.existsSync(photoPath)) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    if (weight_lbs !== undefined && weight_lbs !== null) {
      const weight = Number(weight_lbs);
      if (isNaN(weight) || weight < 0.1 || weight > 999.9) {
        return res.status(400).json({ success: false, error: 'Invalid weight' });
      }
    }
    if (length_inches !== undefined && length_inches !== null) {
      const length = Number(length_inches);
      if (isNaN(length) || length < 0.1 || length > 999.9) {
        return res.status(400).json({ success: false, error: 'Invalid length' });
      }
    }
    if (notes && typeof notes === 'string' && notes.length > 1000) {
      return res.status(400).json({ success: false, error: 'Notes must be 1000 chars or less' });
    }

    const userResult = await client.query('SELECT home_lat, home_lng FROM users WHERE id = $1', [userId]);
    const userHomeLocation = userResult.rows[0] || {};

    const exifData = await extractEXIFData(photoPath, {
      latitude: userHomeLocation.home_lat,
      longitude: userHomeLocation.home_lng
    });

    const catchResult = await client.query(
      `INSERT INTO catches (user_id, trip_id, species, weight_lbs, length_inches, caught_at, photo_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [userId, trip_id || null, species.trim(), weight_lbs || null, length_inches || null, exifData.timestamp, photoUrl, notes || null]
    );

    const catchId = catchResult.rows[0].id;
    const createdAt = catchResult.rows[0].created_at;

    let personalRecordInfo = { isNewRecord: false, species, previousRecord: null, newRecord: weight_lbs || null };

    if (weight_lbs) {
      const recordCheck = await client.query(
        'SELECT max_weight_lbs FROM personal_records WHERE user_id = $1 AND species = $2',
        [userId, species]
      );

      if (recordCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO personal_records (user_id, species, max_weight_lbs, catch_id) VALUES ($1, $2, $3, $4)`,
          [userId, species, weight_lbs, catchId]
        );
        personalRecordInfo.isNewRecord = true;
      } else {
        const currentRecord = recordCheck.rows[0].max_weight_lbs;
        if (weight_lbs > currentRecord) {
          await client.query(
            `UPDATE personal_records SET max_weight_lbs = $1, catch_id = $2 WHERE user_id = $3 AND species = $4`,
            [weight_lbs, catchId, userId, species]
          );
          personalRecordInfo.isNewRecord = true;
          personalRecordInfo.previousRecord = currentRecord;
        } else {
          personalRecordInfo.previousRecord = currentRecord;
        }
      }
    }

    await client.query(
      `INSERT INTO user_streaks (user_id, last_fishing_date) VALUES ($1, CURRENT_DATE)
       ON CONFLICT (user_id) DO UPDATE SET last_fishing_date = CURRENT_DATE`,
      [userId]
    );

    let newBadges = [];
    try {
      const badgesResult = await client.query('SELECT * FROM badge_definitions WHERE enabled = true ORDER BY priority DESC');
      for (const badge of badgesResult.rows) {
        const catchForEval = { id: catchId, species, weight_lbs: weight_lbs || null, length_inches: length_inches || null, caught_at: exifData.timestamp };
        const earned = await evaluateCriteria(badge, userId, catchForEval);

        if (earned) {
          const existingBadge = await client.query(
            'SELECT award_count FROM user_badges WHERE user_id = $1 AND badge_id = $2',
            [userId, badge.id]
          );
          const isNewAward = existingBadge.rows.length === 0;

          await client.query(
            `INSERT INTO user_badges (user_id, badge_id, award_count, last_awarded_at) VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, badge_id) DO UPDATE SET award_count = award_count + 1, last_awarded_at = CURRENT_TIMESTAMP`,
            [userId, badge.id]
          );

          if (isNewAward || badge.is_repeatable) {
            newBadges.push({
              id: badge.id,
              code: badge.code,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              rarity: badge.rarity,
              isRepeatable: badge.is_repeatable,
              awardCount: isNewAward ? 1 : (existingBadge.rows[0].award_count + 1)
            });
          }
        }
      }
    } catch (err) {
      console.error('[BADGE ERROR]', err);
    }

    res.status(201).json({
      success: true,
      catch: { id: catchId, user_id: userId, trip_id: trip_id || null, species, weight_lbs: weight_lbs || null, length_inches: length_inches || null, photo_url: photoUrl, notes: notes || null, caught_at: exifData.timestamp, created_at: createdAt },
      personalRecord: personalRecordInfo,
      newBadges
    });

  } catch (err) {
    console.error('[CATCHES POST ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to create catch' });
  } finally {
    client.release();
  }
});

module.exports = router;
