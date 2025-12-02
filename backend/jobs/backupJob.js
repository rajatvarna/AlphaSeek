const fs = require('fs');
const path = require('path');
const { db } = require('../database');

const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createBackup() {
  console.log('[Backup Job] Starting database backup...');
  const startTime = Date.now();

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `alphaseek-backup-${timestamp}.db`);

    // Use SQLite backup API
    await new Promise((resolve, reject) => {
      db.backup(backupPath)
        .then(() => {
          console.log(`[Backup Job] Backup created: ${backupPath}`);
          resolve();
        })
        .catch(reject);
    });

    // Clean old backups (keep only last 7 days)
    cleanOldBackups();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Backup Job] Backup completed in ${duration}s`);

    return backupPath;
  } catch (error) {
    console.error('[Backup Job] Backup failed:', error);
    throw error;
  }
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('alphaseek-backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep last 7 backups
    const toDelete = backupFiles.slice(7);

    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`[Backup Job] Deleted old backup: ${file.name}`);
    });

    if (toDelete.length > 0) {
      console.log(`[Backup Job] Cleaned up ${toDelete.length} old backup(s)`);
    }
  } catch (error) {
    console.error('[Backup Job] Error cleaning old backups:', error);
  }
}

function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    return files
      .filter(f => f.startsWith('alphaseek-backup-') && f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
          sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch (error) {
    console.error('[Backup Job] Error listing backups:', error);
    return [];
  }
}

async function restoreBackup(backupPath) {
  console.log(`[Backup Job] Restoring from: ${backupPath}`);

  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // Close current database
    db.close();

    // Create a backup of current database before restoring
    const currentDbPath = path.join(__dirname, '../alphaseek.db');
    const emergencyBackup = path.join(BACKUP_DIR, `emergency-backup-${Date.now()}.db`);
    fs.copyFileSync(currentDbPath, emergencyBackup);

    // Restore backup
    fs.copyFileSync(backupPath, currentDbPath);

    console.log('[Backup Job] Restore completed. Please restart the server.');
    return true;
  } catch (error) {
    console.error('[Backup Job] Restore failed:', error);
    throw error;
  }
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanOldBackups
};
