import Database from 'better-sqlite3';
import path from 'path';

export function ensureSqliteSchema(dbPath = path.join(process.cwd(), 'dev.db')) {
  const db = new Database(dbPath);
  try {
    // Add latitude/longitude columns to User and StrayReport if they do not exist
    try {
      db.prepare('ALTER TABLE "User" ADD COLUMN latitude REAL').run();
    } catch (e) {
      // ignore if already exists
    }
    try {
      db.prepare('ALTER TABLE "User" ADD COLUMN longitude REAL').run();
    } catch (e) {}

    try {
      db.prepare('ALTER TABLE StrayReport ADD COLUMN latitude REAL').run();
    } catch (e) {}
    try {
      db.prepare('ALTER TABLE StrayReport ADD COLUMN longitude REAL').run();
    } catch (e) {}

    // Create notifications table
    db.prepare(
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ngoId TEXT NOT NULL,
        reportId INTEGER NOT NULL,
        message TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        read INTEGER DEFAULT 0
      )`
    ).run();
  } finally {
    db.close();
  }
}

export function queryNGOsWithLocation(dbPath = path.join(process.cwd(), 'dev.db')) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const stmt = db.prepare('SELECT id, name, email, latitude, longitude FROM "User" WHERE role = ? AND latitude IS NOT NULL AND longitude IS NOT NULL');
    return stmt.all('NGO');
  } finally {
    db.close();
  }
}

export function insertNotification(ngoId: string, reportId: number, message: string, dbPath = path.join(process.cwd(), 'dev.db')) {
  const db = new Database(dbPath);
  try {
    const stmt = db.prepare('INSERT INTO notifications (ngoId, reportId, message) VALUES (?, ?, ?)');
    const info = stmt.run(ngoId, reportId, message);
    return info.lastInsertRowid;
  } finally {
    db.close();
  }
}

export function listNotificationsForNgo(ngoId: string, dbPath = path.join(process.cwd(), 'dev.db')) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const stmt = db.prepare('SELECT id, ngoId, reportId, message, createdAt, read FROM notifications WHERE ngoId = ? ORDER BY createdAt DESC');
    return stmt.all(ngoId);
  } finally {
    db.close();
  }
}
