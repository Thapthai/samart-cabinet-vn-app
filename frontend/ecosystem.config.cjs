/**
 * PM2 — รัน Next.js production หลัง `npm run build`
 *
 * บนเซิร์ฟเวอร์:
 *   cd .../frontend
 *   สร้าง .env.production (หรือ .env) ในโฟลเดอร์เดียวกับไฟล์นี้ — PM2 โหลดให้ก่อน start
 *   npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * รีโหลดหลังแก้ env (รัน time):
 *   pm2 reload ecosystem.config.cjs --update-env
 *
 * สำคัญ:
 * - NEXTAUTH_URL ต้องตรงกับ URL ที่ผู้ใช้เปิด (เช่น http://10.1.1.10:7200/med-supplies ไม่ใช่แค่ localhost)
 * - NEXT_PUBLIC_* ถูกฝังตอน `npm run build` — แก้แล้วต้อง build ใหม่
 */
const fs = require('fs');
const path = require('path');

/** โหลด KEY=VALUE จาก .env (ไม่ทับค่าที่ตั้งใน shell อยู่แล้ว) */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(path.join(__dirname, '.env.production'));
loadEnvFile(path.join(__dirname, '.env'));

const passthroughKeys = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_BASE_PATH',
  'NEXT_PUBLIC_API_URL',
  'BACKEND_API_URL',
  // Firebase ฯลฯ ถ้ามีใน .env
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const env = {
  NODE_ENV: 'production',
  PORT: process.env.PORT || '7200',
};

for (const key of passthroughKeys) {
  const v = process.env[key];
  if (v !== undefined && v !== '') env[key] = v;
}

module.exports = {
  apps: [
    {
      name: 'med-supplies-vtn-next-app',
      cwd: __dirname,
      script: path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env,
    },
  ],
};
