import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';

// --- Database Configuration & Schema ---
const db = new Database('hstt.db', { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL -- ADMIN, TO_TRUONG, HOI_DONG
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    leader_id INTEGER,
    display_order INTEGER,
    FOREIGN KEY(leader_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    team_id INTEGER NOT NULL,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    unit_rating TEXT, -- A, B, C, D
    status TEXT NOT NULL DEFAULT 'SETUP', -- SETUP, RATING, ENTRY, APPROVAL, LOCKED
    UNIQUE(month, year)
  );

  CREATE TABLE IF NOT EXISTS team_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    team_rating TEXT, -- A, B, C, D
    FOREIGN KEY(period_id) REFERENCES periods(id),
    FOREIGN KEY(team_id) REFERENCES teams(id),
    UNIQUE(period_id, team_id)
  );

  CREATE TABLE IF NOT EXISTS quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    team_id INTEGER, -- NULL means global unit quota
    coef REAL NOT NULL,
    max_count INTEGER NOT NULL,
    FOREIGN KEY(period_id) REFERENCES periods(id),
    FOREIGN KEY(team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    proposed_coef REAL,
    approved_coef REAL,
    reason TEXT,
    FOREIGN KEY(period_id) REFERENCES periods(id),
    FOREIGN KEY(employee_id) REFERENCES employees(id),
    UNIQUE(period_id, employee_id)
  );
`);

// Patch data
db.exec(`UPDATE employees SET name = 'Trần Duy Hinh' WHERE name = 'Trần Duy Hình';`);

// Seed initial data
const stmtCountUsers = db.prepare('SELECT COUNT(*) as c FROM users');
if (stmtCountUsers.get().c === 0) {
  // Users
  const insertUser = db.prepare('INSERT INTO users (username, role) VALUES (?, ?)');
  const adminId = insertUser.run('admin', 'ADMIN').lastInsertRowid;
  
  // Teams
  const insertTeam = db.prepare('INSERT INTO teams (name, short_name, leader_id, display_order) VALUES (?, ?, ?, ?)');
  const tBld = insertTeam.run('Ban Lãnh đạo Điện lực', 'B.LĐ Điện lực', adminId, 1).lastInsertRowid;
  const tTh = insertTeam.run('Tổ Tổng hợp', 'T.Tổng hợp', adminId, 2).lastInsertRowid;
  const tKt = insertTeam.run('Tổ Kỹ thuật', 'T.Kỹ thuật', adminId, 3).lastInsertRowid;
  const tKd = insertTeam.run('Tổ Kinh doanh', 'T.Kinh doanh', adminId, 4).lastInsertRowid;
  const tQlvh = insertTeam.run('Tổ QLVH đường dây và trạm', 'T.QLVH đường dây và trạm', adminId, 5).lastInsertRowid;
  const tQld = insertTeam.run('Tổ QLĐ Điền Hòa', 'T.QLĐ Điền Hòa', adminId, 6).lastInsertRowid;

  // Employees Seed
  const empsToInsert = [
    // BLD
    ['NV01', 'Phan Chí Lợi', 'Đội trưởng', tBld],
    ['NV02', 'Nguyễn Xuân Phước', 'Đội phó', tBld],
    // Tong Hop
    ['NV03', 'Thân Nguyên Ngọc Thành', 'Tổ trưởng', tTh],
    ['NV04', 'Nguyễn Phạm Ngọc Trân', 'Kế toán', tTh],
    // Ky thuat
    ['NV05', 'Lê Đức Hoàng Vũ', 'Tổ trưởng', tKt],
    ['NV06', 'Trần Lực', 'Công nhân', tKt],
    ['NV07', 'Mai Thế Lộc', 'Công nhân', tKt],
    ['NV08', 'Phạm Đức Thành Nhân', 'Chuyên viên', tKt],
    ['NV09', 'Hoàng Công Phước', 'Lái xe', tKt],
    ['NV10', 'Nguyễn Quốc Huy', 'ATCT', tKt],
    // Kinh doanh
    ['NV11', 'Nguyễn Khánh Toàn', 'Tổ trưởng', tKd],
    ['NV12', 'Thân Nguyên Thu Hiền', 'Nhóm trưởng', tKd],
    ['NV13', 'Trần Thanh Thanh', 'Nhân viên', tKd],
    ['NV14', 'Phạm Hữu Quang Duy', 'Chuyên viên', tKd],
    ['NV15', 'Hoàng Công Nguyên Vũ', 'Công nhân', tKd],
    ['NV16', 'Trương Văn Bình', 'Nhóm trưởng', tKd],
    ['NV17', 'Lê Quốc Hùng', 'Công nhân', tKd],
    ['NV18', 'Hoàng Thiện', 'Công nhân', tKd],
    ['NV19', 'Nguyễn Văn Tiếng', 'Nhóm trưởng', tKd],
    ['NV20', 'Trần Đình Nhật Nam', 'Công nhân', tKd],
    ['NV21', 'Lê Hữu Ngân Phú', 'Công nhân', tKd],
    ['NV22', 'Lê Cảnh Lợi', 'Công nhân', tKd],
    ['NV23', 'Hồ Thanh Quốc', 'Công nhân', tKd],
    ['NV24', 'Trần Thị Quỳnh Như', 'Chuyên viên', tKd],
    ['NV25', 'Lê Đình Quốc Hân', 'Công nhân', tKd],
    ['NV26', 'Lê Văn Thọ', 'Công nhân', tKd],
    // QLVH
    ['NV27', 'Nguyễn Hồ Hải', 'Tổ trưởng', tQlvh],
    ['NV28', 'Thân Nguyên Triều', 'Tổ phó', tQlvh],
    ['NV29', 'Phạm Trung Hòa', 'Công nhân', tQlvh],
    ['NV30', 'Hồ Ngọc Hoài Bảo', 'Công nhân', tQlvh],
    ['NV31', 'Lê Viết Chèo', 'Công nhân', tQlvh],
    ['NV32', 'Võ Như Hải', 'Công nhân', tQlvh],
    ['NV33', 'Huỳnh Quang Vinh', 'Công nhân', tQlvh],
    ['NV34', 'Bùi Văn Sơn', 'Công nhân', tQlvh],
    // QLD Dien Hoa
    ['NV35', 'Nguyễn Minh Thái', 'Tổ trưởng', tQld],
    ['NV36', 'Trần Duy Hinh', 'Tổ phó', tQld],
    ['NV37', 'Đặng Như Hòa', 'Công nhân', tQld],
    ['NV38', 'Nguyễn Dương Hải Đức', 'Công nhân', tQld],
    ['NV39', 'Nguyễn Huy Hoàng', 'Công nhân', tQld],
    ['NV40', 'Phan Thanh Quốc', 'Công nhân', tQld],
    ['NV41', 'Nguyễn Hồ Quốc Tuấn', 'Công nhân', tQld],
    ['NV42', 'Đào Viết Lâm', 'Công nhân', tQld],
    ['NV43', 'Trần Đình Hoàng', 'Công nhân', tQld],
    ['NV44', 'Lê Quang Hoàng', 'Công nhân', tQld],
    ['NV45', 'Nguyễn Đăng Thanh', 'Công nhân', tQld],
  ];

  const insertEmp = db.prepare('INSERT INTO employees (code, name, position, team_id) VALUES (?, ?, ?, ?)');
  for(const e of empsToInsert) insertEmp.run(e[0], e[1], e[2], e[3]);

  // Create an active period for the entire year to demonstrate T1->T12
  const insertPeriod = db.prepare('INSERT INTO periods (month, year, unit_rating, status) VALUES (?, ?, ?, ?)');
  const insertTp = db.prepare('INSERT INTO team_periods (period_id, team_id, team_rating) VALUES (?, ?, ?)');
  const insertEval = db.prepare('INSERT INTO evaluations (period_id, employee_id, proposed_coef, approved_coef) VALUES (?, ?, ?, ?)');
  const insertQuota = db.prepare('INSERT INTO quotas (period_id, team_id, coef, max_count) VALUES (?, ?, ?, ?)');

  db.transaction(() => {
    // Generate periods for Month 1 -> Month 12, 2024
    const teams = db.prepare('SELECT id FROM teams').all();
    for (let m = 1; m <= 12; m++) {
      const pId = insertPeriod.run(m, 2024, 'A', 'ENTRY').lastInsertRowid;
      for (const t of teams) {
        insertTp.run(pId, t.id, 'A');
        const emps = db.prepare('SELECT id FROM employees WHERE team_id = ?').all(t.id);
        for(const e of emps) {
           insertEval.run(pId, e.id, null, null);
        }
      }
      
      if (m === 12) {
        // Set PDF-accurate global quota for 45 people (1.4: 6, 1.2: 23, 1.0: 16)
        insertQuota.run(pId, null, 1.4, 6);
        insertQuota.run(pId, null, 1.2, 23);
        insertQuota.run(pId, null, 1.0, 16);

        // Set Team quotas as per PDF image
        insertQuota.run(pId, tBld, 1.4, 0); insertQuota.run(pId, tBld, 1.2, 1); insertQuota.run(pId, tBld, 1.0, 1);
        insertQuota.run(pId, tTh, 1.4, 0); insertQuota.run(pId, tTh, 1.2, 1); insertQuota.run(pId, tTh, 1.0, 1);
        insertQuota.run(pId, tKt, 1.4, 0); insertQuota.run(pId, tKt, 1.2, 3); insertQuota.run(pId, tKt, 1.0, 3);
        insertQuota.run(pId, tKd, 1.4, 2); insertQuota.run(pId, tKd, 1.2, 8); insertQuota.run(pId, tKd, 1.0, 6);
        insertQuota.run(pId, tQlvh, 1.4, 1); insertQuota.run(pId, tQlvh, 1.2, 4); insertQuota.run(pId, tQlvh, 1.0, 3);
        insertQuota.run(pId, tQld, 1.4, 1); insertQuota.run(pId, tQld, 1.2, 6); insertQuota.run(pId, tQld, 1.0, 5);
      }
    }
  })();

  console.log('Database seeded with PDF specific data.');
}

// --- Server Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // === MIDDLEWARE FOR FAKE AUTH ===
  app.use((req, res, next) => {
    req.user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    next();
  });

  // === API ROUTES ===

  // Bulk save evaluations
  app.post('/api/evaluations/bulk', (req, res) => {
    const { updates } = req.body; // updates: array of { employee_id, month, year, coef }
    try {
      db.transaction(() => {
        for (const update of updates) {
           const { employee_id, month, year, coef } = update;
           let period = db.prepare('SELECT id FROM periods WHERE month = ? AND year = ?').get(month, year);
           
           if (!period) {
              const pInfo = db.prepare('INSERT INTO periods (month, year, unit_rating, status) VALUES (?, ?, ?, ?)').run(month, year, 'A', 'ENTRY');
              period = { id: pInfo.lastInsertRowid };
           }

           const existingEval = db.prepare('SELECT id FROM evaluations WHERE period_id = ? AND employee_id = ?').get(period.id, employee_id);
           if (existingEval) {
              db.prepare('UPDATE evaluations SET proposed_coef = ?, approved_coef = ? WHERE id = ?').run(coef, coef, existingEval.id);
           } else {
              db.prepare('INSERT INTO evaluations (period_id, employee_id, proposed_coef, approved_coef) VALUES (?, ?, ?, ?)').run(period.id, employee_id, coef, coef);
           }
        }
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // New endpoint to get the full organization tree, quotas for active period, and all 12 months evals
  app.get('/api/org-data', (req, res) => {
    // We assume period 12/2024 is the active one contextually
    const activePeriod = db.prepare('SELECT * FROM periods ORDER BY year DESC, month DESC LIMIT 1').get();
    
    const teams = db.prepare('SELECT * FROM teams ORDER BY display_order ASC').all();
    const quotas = db.prepare('SELECT * FROM quotas WHERE period_id = ?').all(activePeriod?.id || -1);

    const yearEvals = db.prepare(`
      SELECT e.id as eval_id, e.employee_id, e.proposed_coef, e.approved_coef, e.reason,
             p.month, p.year
      FROM evaluations e
      JOIN periods p ON e.period_id = p.id
      WHERE p.year = ?
    `).all(activePeriod?.year || 2024);

    const employees = db.prepare('SELECT id, name, position, team_id FROM employees ORDER BY id ASC').all();

    // Map employees to include their month data
    const empData = employees.map(emp => {
      const eData: any = { ...emp };
      for (let m=1; m<=12; m++) {
        // Find if this employee has evaluation in month M
        const found = yearEvals.find(ev => ev.employee_id === emp.id && ev.month === m);
        eData[`t${m}`] = found ? found.approved_coef || found.proposed_coef : null;
      }
      return eData;
    });

    res.json({
      activePeriod,
      teams,
      quotas,
      employees: empData
    });
  });

  // Export report dummy
  app.get('/api/report-data', (req, res) => {
      const activePeriod = db.prepare('SELECT * FROM periods ORDER BY year DESC, month DESC LIMIT 1').get();
      const report = db.prepare(`
          SELECT e.employee_id, emp.name, emp.position, t.name as team_name, t.display_order as team_order,
                 e.proposed_coef, e.approved_coef, e.reason
          FROM evaluations e
          JOIN employees emp ON e.employee_id = emp.id
          JOIN teams t ON emp.team_id = t.id
          WHERE e.period_id = ?
          ORDER BY t.display_order ASC, emp.id ASC
      `).all(activePeriod?.id || -1);

      res.json(report);
  });

  // --- API Routes for Employees ---
  // Add Employee
  app.post('/api/employees', (req, res) => {
    const { code, name, position, team_id } = req.body;
    try {
       // Insert employee
       const info = db.prepare('INSERT INTO employees (code, name, position, team_id) VALUES (?, ?, ?, ?)').run(code, name, position, team_id);
       
       // Create evaluation records for the new employee for all existing periods in 2024
       const periods = db.prepare('SELECT id FROM periods WHERE year = 2024').all();
       const insertEval = db.prepare('INSERT INTO evaluations (period_id, employee_id, proposed_coef, approved_coef) VALUES (?, ?, null, null)');
       
       db.transaction(() => {
           for (const p of periods) {
               insertEval.run(p.id, info.lastInsertRowid);
           }
       })();

       res.json({ success: true, id: info.lastInsertRowid });
    } catch(e: any) {
       res.status(500).json({ error: e.message });
    }
  });

  // Delete Employee
  app.delete('/api/employees/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.transaction(() => {
          // Delete evaluations first
          db.prepare('DELETE FROM evaluations WHERE employee_id = ?').run(id);
          // Delete employee
          db.prepare('DELETE FROM employees WHERE id = ?').run(id);
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

