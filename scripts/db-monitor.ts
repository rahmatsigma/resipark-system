import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_SIZE_MB = 100; // Beri peringatan jika file > 100MB

async function monitorAndBackup() {
  if (!fs.existsSync(DB_PATH)) return;

  const stats = fs.statSync(DB_PATH);
  const fileSizeInMB = stats.size / (1024 * 1024);

  console.log(`[${new Date().toLocaleString()}] Current DB Size: ${fileSizeInMB.toFixed(2)} MB`);

  // 1. Alerting
  if (fileSizeInMB > MAX_SIZE_MB) {
    console.warn('⚠️ WARNING: Database size is exceeding threshold!');
  }

  // 2. Simple Backup
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`✅ Backup created at: ${backupPath}`);
}

monitorAndBackup();