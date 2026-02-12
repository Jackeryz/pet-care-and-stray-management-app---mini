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

    // Create chat messages table for adoption communications
    db.prepare(
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adoptionRecordId INTEGER NOT NULL,
        senderId TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        isRead INTEGER DEFAULT 0,
        FOREIGN KEY(adoptionRecordId) REFERENCES "AdoptionRecord"(id),
        FOREIGN KEY(senderId) REFERENCES "User"(id)
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

export function insertChatMessage(
  adoptionRecordId: number,
  senderId: string,
  message: string,
  dbPath = path.join(process.cwd(), 'dev.db')
) {
  const db = new Database(dbPath);
  try {
    const stmt = db.prepare(
      'INSERT INTO chat_messages (adoptionRecordId, senderId, message) VALUES (?, ?, ?)'
    );
    const info = stmt.run(adoptionRecordId, senderId, message);
    return info.lastInsertRowid;
  } finally {
    db.close();
  }
}

export function getChatMessages(
  adoptionRecordId: number,
  dbPath = path.join(process.cwd(), 'dev.db')
) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const stmt = db.prepare(
      `SELECT 
        cm.id, 
        cm.adoptionRecordId, 
        cm.senderId, 
        cm.message, 
        cm.createdAt, 
        cm.isRead,
        u.name as senderName,
        u.email as senderEmail
      FROM chat_messages cm
      JOIN "User" u ON cm.senderId = u.id
      WHERE cm.adoptionRecordId = ? 
      ORDER BY cm.createdAt ASC`
    );
    return stmt.all(adoptionRecordId);
  } finally {
    db.close();
  }
}

export function markChatMessagesAsRead(
  adoptionRecordId: number,
  userId: string,
  dbPath = path.join(process.cwd(), 'dev.db')
) {
  const db = new Database(dbPath);
  try {
    const stmt = db.prepare(
      'UPDATE chat_messages SET isRead = 1 WHERE adoptionRecordId = ? AND senderId != ? AND isRead = 0'
    );
    const info = stmt.run(adoptionRecordId, userId);
    return info.changes;
  } finally {
    db.close();
  }
}

export function getUnreadChatCount(
  adoptionRecordId: number,
  userId: string,
  dbPath = path.join(process.cwd(), 'dev.db')
) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM chat_messages WHERE adoptionRecordId = ? AND senderId != ? AND isRead = 0'
    );
    const result = stmt.get(adoptionRecordId, userId) as { count: number };
    return result?.count || 0;
  } finally {
    db.close();
  }
}
