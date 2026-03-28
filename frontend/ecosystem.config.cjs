/**
 * PM2 — รัน Next.js production หลัง `npm run build`
 *
 * บนเซิร์ฟเวอร์ (ตัวอย่าง):
 *   cd /var/www/.../frontend
 *   npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * พอร์ต: ตั้ง PORT ก่อน start หรือแก้ค่า env.PORT ด้านล่าง
 * โปรดตั้ง NEXT_PUBLIC_* ใน .env ก่อน build (ค่าถูก bake ตอน build)
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'samart-cabinet-frontend',
      cwd: __dirname,
      script: path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '7200',
      },
    },
  ],
};
