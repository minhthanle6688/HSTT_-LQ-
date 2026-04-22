-- 3. SQL SCHEMA (MySQL format requirements, used natively in SQLite logic)

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL -- ADMIN, TO_TRUONG, HOI_DONG
);

CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  leader_id INTEGER,
  FOREIGN KEY(leader_id) REFERENCES users(id)
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  team_id INTEGER NOT NULL,
  FOREIGN KEY(team_id) REFERENCES teams(id)
);

CREATE TABLE periods (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  unit_rating VARCHAR(10), -- A, B, C, D
  status VARCHAR(50) NOT NULL DEFAULT 'SETUP' -- SETUP, RATING, ENTRY, APPROVAL, LOCKED
);

CREATE TABLE team_periods (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  period_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  team_rating VARCHAR(10), -- A, B, C, D
  FOREIGN KEY(period_id) REFERENCES periods(id),
  FOREIGN KEY(team_id) REFERENCES teams(id),
  UNIQUE(period_id, team_id)
);

CREATE TABLE quota_rules (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  unit_rating VARCHAR(10) NOT NULL,
  target_coef FLOAT NOT NULL,
  percent FLOAT NOT NULL
);

CREATE TABLE quotas (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  period_id INTEGER NOT NULL,
  team_id INTEGER, -- NULL means global unit quota
  coef FLOAT NOT NULL,
  max_count INTEGER NOT NULL,
  FOREIGN KEY(period_id) REFERENCES periods(id),
  FOREIGN KEY(team_id) REFERENCES teams(id)
);

CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  period_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  proposed_coef FLOAT,
  approved_coef FLOAT,
  reason TEXT,
  FOREIGN KEY(period_id) REFERENCES periods(id),
  FOREIGN KEY(employee_id) REFERENCES employees(id),
  UNIQUE(period_id, employee_id)
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(255) NOT NULL,
  user_id INTEGER,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
