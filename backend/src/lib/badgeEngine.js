const { getDbClient } = require('../db');

async function evaluateCriteria(badge, userId, newCatch) {
  const client = await getDbClient();
  try {
    const type = badge.criteria_type;
    const config = badge.criteria_config;

    switch (type) {
      case 'catch_count':
        return await evaluateCatchCount(client, userId, config);
      case 'weight':
        return await evaluateWeight(newCatch, config);
      case 'length':
        return await evaluateLength(newCatch, config);
      case 'species_count':
        return await evaluateSpeciesCount(client, userId, config);
      case 'slam':
        return await evaluateSlam(client, userId, newCatch, config);
      case 'super_slam':
        return await evaluateSuperSlam(client, userId, newCatch, config);
      case 'streak_weeks':
        return await evaluateStreakWeeks(client, userId, config);
      case 'monthly_days':
        return await evaluateMonthlyDays(client, userId, config);
      case 'yearly_days':
        return await evaluateYearlyDays(client, userId, config);
      case 'time_of_day':
        return await evaluateTimeOfDay(newCatch, config);
      default:
        console.error(`Unknown badge criteria type: ${type}`);
        return false;
    }
  } catch (err) {
    console.error(`Badge evaluation error for badge ${badge.id}:`, err);
    return false;
  } finally {
    client.release();
  }
}

async function evaluateCatchCount(client, userId, config) {
  const result = await client.query('SELECT COUNT(*) as total FROM catches WHERE user_id = $1', [userId]);
  const totalCatches = parseInt(result.rows[0].total);
  return totalCatches >= config.min;
}

async function evaluateWeight(newCatch, config) {
  if (config.species && newCatch.species !== config.species) return false;
  return newCatch.weight_lbs >= config.min_weight;
}

async function evaluateLength(newCatch, config) {
  if (config.species && newCatch.species !== config.species) return false;
  return newCatch.length_inches >= config.min_length;
}

async function evaluateSpeciesCount(client, userId, config) {
  const result = await client.query(
    'SELECT COUNT(DISTINCT species) as unique_species FROM catches WHERE user_id = $1',
    [userId]
  );
  const uniqueSpecies = parseInt(result.rows[0].unique_species);
  return uniqueSpecies >= config.min;
}

async function evaluateSlam(client, userId, newCatch, config) {
  const today = new Date(newCatch.caught_at).toISOString().split('T')[0];
  const result = await client.query(
    'SELECT DISTINCT species FROM catches WHERE user_id = $1 AND DATE(caught_at) = $2',
    [userId, today]
  );
  const speciesCaughtToday = new Set(result.rows.map(r => r.species));
  const requiredSpecies = config.species;
  return requiredSpecies.every(species => speciesCaughtToday.has(species));
}

async function evaluateSuperSlam(client, userId, newCatch, config) {
  const today = new Date(newCatch.caught_at).toISOString().split('T')[0];
  const result = await client.query(
    'SELECT DISTINCT species FROM catches WHERE user_id = $1 AND DATE(caught_at) = $2',
    [userId, today]
  );
  const speciesCaughtToday = new Set(result.rows.map(r => r.species));
  const requiredSpecies = config.species;
  return requiredSpecies.every(species => speciesCaughtToday.has(species));
}

async function evaluateStreakWeeks(client, userId, config) {
  const result = await client.query(
    `SELECT DISTINCT DATE(TRUNC(caught_at, 'week')) as week_start
     FROM catches WHERE user_id = $1
     ORDER BY week_start DESC LIMIT 100`,
    [userId]
  );
  if (result.rows.length === 0) return false;
  let consecutiveWeeks = 1;
  let weeks = result.rows.map(r => new Date(r.week_start));
  for (let i = 0; i < weeks.length - 1; i++) {
    const currentWeek = weeks[i];
    const nextWeek = weeks[i + 1];
    const daysDiff = (currentWeek - nextWeek) / (1000 * 60 * 60 * 24);
    if (daysDiff >= 7 && daysDiff <= 14) {
      consecutiveWeeks++;
    } else {
      break;
    }
  }
  return consecutiveWeeks >= config.min_weeks;
}

async function evaluateMonthlyDays(client, userId, config) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT DATE(caught_at)) as days_fished
     FROM catches WHERE user_id = $1
     AND EXTRACT(YEAR FROM caught_at) = EXTRACT(YEAR FROM CURRENT_DATE)
     AND EXTRACT(MONTH FROM caught_at) = EXTRACT(MONTH FROM CURRENT_DATE)`,
    [userId]
  );
  const daysFished = parseInt(result.rows[0].days_fished);
  return daysFished >= config.min_days;
}

async function evaluateYearlyDays(client, userId, config) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT DATE(caught_at)) as days_fished
     FROM catches WHERE user_id = $1
     AND EXTRACT(YEAR FROM caught_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
    [userId]
  );
  const daysFished = parseInt(result.rows[0].days_fished);
  return daysFished >= config.min_days;
}

async function evaluateTimeOfDay(newCatch, config) {
  const hour = new Date(newCatch.caught_at).getHours();
  return hour >= config.start_hour && hour < config.end_hour;
}

module.exports = {
  evaluateCriteria
};
