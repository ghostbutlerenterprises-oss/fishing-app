-- Anglers Log Database Schema
-- MVP Version (6-week build)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_photo_url VARCHAR(500),
  bio TEXT,
  home_location_name VARCHAR(200),
  home_lat DECIMAL(10, 6),
  home_lng DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fishing_trips table
CREATE TABLE IF NOT EXISTS fishing_trips (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INT,
  location_name VARCHAR(200),
  location_lat DECIMAL(10, 6),
  location_lng DECIMAL(10, 6),
  target_species VARCHAR(100),
  trip_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create catches table
CREATE TABLE IF NOT EXISTS catches (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id INT NOT NULL REFERENCES fishing_trips(id) ON DELETE CASCADE,
  species VARCHAR(100) NOT NULL,
  weight_lbs DECIMAL(6, 2),
  length_inches DECIMAL(6, 2),
  caught_at TIMESTAMP NOT NULL,
  photo_url VARCHAR(500),
  photo_metadata JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create personal_records table
CREATE TABLE IF NOT EXISTS personal_records (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species VARCHAR(100) NOT NULL,
  max_weight_lbs DECIMAL(6, 2),
  catch_id INT REFERENCES catches(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, species)
);

-- Create achievements/badges definition table
CREATE TABLE IF NOT EXISTS badge_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'streak', 'frequency', 'species', 'volume', 'duration'
  criteria JSONB, -- {type: 'streak_days', threshold: 7, period: 'all_time'}
  icon_emoji VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_badges table (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES badge_definitions(id),
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak_days INT DEFAULT 0,
  streak_start_date DATE,
  last_fishing_date DATE,
  longest_streak_days INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON fishing_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON fishing_trips(start_time);
CREATE INDEX IF NOT EXISTS idx_catches_user_id ON catches(user_id);
CREATE INDEX IF NOT EXISTS idx_catches_trip_id ON catches(trip_id);
CREATE INDEX IF NOT EXISTS idx_catches_species ON catches(species);
CREATE INDEX IF NOT EXISTS idx_catches_caught_at ON catches(caught_at);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- Insert default badges
INSERT INTO badge_definitions (name, description, category, criteria, icon_emoji) VALUES
-- Streak badges
('3-Day Streak', 'Fished 3 days in a row', 'streak', '{"type":"consecutive_days","threshold":3}', '🔥'),
('7-Day Streak', 'Fished 7 consecutive days (weekly challenge)', 'streak', '{"type":"consecutive_days","threshold":7}', '🔥🔥'),
('14-Day Streak', 'Fished 2 weeks straight (epic challenge)', 'streak', '{"type":"consecutive_days","threshold":14}', '🔥🔥🔥'),
('30-Day Streak', 'Fished every single day for a month', 'streak', '{"type":"consecutive_days","threshold":30}', '🔥🔥🔥🔥'),

-- Frequency badges (monthly)
('Frequent Angler', '10 fishing days in a month', 'frequency', '{"type":"days_in_month","threshold":10}', '📅'),
('Dedicated Angler', '15 fishing days in a month', 'frequency', '{"type":"days_in_month","threshold":15}', '📅📅'),
('Obsessed Angler', '20+ fishing days in a month', 'frequency', '{"type":"days_in_month","threshold":20}', '📅📅📅'),

-- Volume badges
('Century Club', '100 fish caught (lifetime)', 'volume', '{"type":"total_catches","threshold":100,"period":"all_time"}', '🎯'),
('Two Hundred Club', '200 fish caught (lifetime)', 'volume', '{"type":"total_catches","threshold":200,"period":"all_time"}', '🎯🎯'),
('Thousand Club', '1000 fish caught (lifetime)', 'volume', '{"type":"total_catches","threshold":1000,"period":"all_time"}', '🎯🎯🎯');

-- Note: Species-specific badges will be added dynamically based on user targets
-- (40lb+ Snook, 100lb+ Tarpon, Slot Snook, etc.)

COMMIT;
