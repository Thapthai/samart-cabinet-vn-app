# Deploy Frontend ด้วย Docker Compose

## ข้อกำหนดบนเซิร์ฟเวอร์

- Docker และ Docker Compose
- ไฟล์ `.env` ในโฟลเดอร์ `frontend/` (ตั้งค่าแล้ว)

## ขั้นตอน Deploy

### 1. อัปโหลดโค้ดไปที่เซิร์ฟเวอร์

```bash
# ตัวอย่าง: clone หรือ scp โปรเจกต์ไปที่เซิร์ฟเวอร์
# จากนั้น cd เข้าโฟลเดอร์ frontend
cd /path/to/samart-cabinet-cu-app/frontend
```

### 2. ตรวจสอบ .env

ให้มีไฟล์ `frontend/.env` และมีตัวแปรอย่างน้อย:

- **`NEXTAUTH_SECRET`** — **ต้องมีค่า** (ถ้าไม่ตั้ง Compose จะแจ้ง WARN และ session อาจผิดพลาด) ใช้ string ยาวๆ หรือ `openssl rand -base64 32`
- `FRONTEND_HOST_PORT` — พอร์ตบน host ที่จะ map เข้า container (ค่าเริ่มต้น 3100) ถ้ารันหลายแอปให้ตั้งคนละค่า เช่น 3100, 3101
- `NEXTAUTH_URL` — URL หน้าแอปที่ใช้เข้าถึง (รวม basePath) เช่น `http://localhost:3100/medical-supplies` หรือ `http://10.11.9.84:3100/medical-supplies`
- `NEXT_PUBLIC_BASE_PATH` — basePath ของ Next.js (เช่น `/medical-supplies`)
- **`NEXT_PUBLIC_API_URL`** — **เมื่อรันใน Docker อย่าใช้ `localhost`** เพราะจากใน container แล้ว localhost คือตัว container เอง ใช้ **IP โฮสต์** (เช่น `http://10.11.9.84:4000/smart-cabinet-cu/api/v1`) หรือถ้า Backend อยู่คนละเครื่องใช้ IP เครื่อง Backend
- `NEXT_PUBLIC_FIREBASE_*` — ถ้าใช้ Firebase (ดูใน `.env.example`)

อ้างอิงโครงและ key จาก **`.env.example`**  

**ใช้บนเซิร์ฟเวอร์:** มีไฟล์ **`.env.sv`** ตั้งค่าไว้สำหรับ deploy ที่ IP 10.11.9.84 แล้ว — คัดลอกเป็น `.env` แล้วเติม `NEXTAUTH_SECRET` กับ Firebase (ถ้าใช้):  
`cp .env.sv .env`  
หรือรันด้วย `--env-file .env.sv` ได้เลย (แก้ `NEXTAUTH_SECRET` ใน .env.sv ก่อน)

### 3. Build และรัน

**รันแอปเดียว (default):**
```bash
# จากโฟลเดอร์ frontend
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

**รันหลายแอปบนเครื่องเดียวกัน (ให้แต่ละแอปเป็นคนละ container):** ใช้ `-p` ระบุ project name และใน .env ของแต่ละแอปใส่พอร์ตคนละค่า

```bash
# แอปที่ 1 (เช่น VN) — ใน frontend/.env ใส่ FRONTEND_HOST_PORT=3100
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml --env-file .env up -d --build

# แอปที่ 2 (เช่น CU) — ใช้ .env อีกชุด ใส่ FRONTEND_HOST_PORT=3101
docker compose -p smart-cabinet-cu -f docker/docker-compose.yml --env-file .env.cu up -d --build
```

- `-p` หรือ `--project-name` = ชื่อ project แยกแต่ละแอป (container จะได้ชื่อเช่น smart-cabinet-vn-frontend-1, smart-cabinet-cu-frontend-1)
- ใน `.env` ใส่ `FRONTEND_HOST_PORT=3100` (หรือ 3101, 3102 ฯลฯ) เพื่อไม่ให้พอร์ตชนกัน
- `--build` = build image ใหม่, `-d` = รันแบบแยกพื้นหลัง

### 4. ตรวจสอบ

```bash
# ดูสถานะ container (ถ้ารันด้วย -p ให้ใส่ -p เดียวกัน)
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml ps

# ดู log
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml logs -f frontend

# ทดสอบ health / เปิดแอป (ใช้พอร์ตตาม FRONTEND_HOST_PORT ใน .env)
curl -I http://localhost:3100/medical-supplies
```

Frontend จะ listen ตาม `PORT` ใน container (3100) ส่วนพอร์ตที่เปิดออกนอก host ใช้ค่าจาก **FRONTEND_HOST_PORT** ใน .env (ค่าเริ่มต้น 3100)  
เข้าใช้แอปตาม NEXTAUTH_URL / basePath (เช่น `http://localhost:3100/medical-supplies`)

---

## เข้า http://IP:4100/smart-cabinet-cu ไม่ได้

ถ้าเข้าจากเบราว์เซอร์ด้วย IP (เช่น `http://10.11.9.84:4100/smart-cabinet-cu`) แล้วไม่ขึ้นหรือ connection refused:

1. **ให้ Next.js รับ connection จากนอก container**  
   ใน `docker-compose.yml` ต้องมี `HOSTNAME=0.0.0.0` ใน environment ของ frontend (ใส่ไว้แล้ว) แล้วรันใหม่:
   ```bash
   docker compose -f docker/docker-compose.yml --env-file .env up -d
   ```

2. **ตรวจว่า container รันอยู่**
   ```bash
   docker compose -f docker/docker-compose.yml ps
   curl -I http://localhost:4100/smart-cabinet-cu
   ```
   ถ้า curl บนเซิร์ฟเวอร์ได้ แต่เข้าจากเครื่องอื่นไม่ได้ → มักเป็น firewall

3. **เปิด port 4100 บน firewall** (ถ้าใช้ ufw):
   ```bash
   sudo ufw allow 4100/tcp
   sudo ufw reload
   ```

4. **ลองใส่ slash ท้าย** เช่น `http://10.11.9.84:4100/smart-cabinet-cu/`

---

## Build error: TypeError: Invalid URL (NEXTAUTH_URL)

ถ้า build ล้มเหลวด้วยข้อความประมาณ `TypeError: Invalid URL` และ `input: 'http://10.11.9.84::4100/smart-cabinet-cu'`:

- **สาเหตุ:** ใน `NEXTAUTH_URL` ใส่ **colon สองตัว** (`::`) แทน colon เดียว (`:`)
- **แก้:** เปิด `frontend/.env` แล้วแก้เป็น colon เดียว เช่น  
  - ผิด: `NEXTAUTH_URL=http://10.11.9.84::4100/smart-cabinet-cu`  
  - ถูก: `NEXTAUTH_URL=http://10.11.9.84:4100/smart-cabinet-cu`

จากนั้นรัน build ใหม่: `docker compose -f docker/docker-compose.yml --env-file .env up -d --build`

---

## GET http://host.docker.internal:4000/... ล้มเหลว หรือ CORS / net::ERR_

ถ้า Frontend ตั้ง `NEXT_PUBLIC_API_URL=http://host.docker.internal:4000/smart-cabinet-cu/api/v1` แล้วเบราว์เซอร์เรียก API ไม่ได้:

1. **CORS** — ให้ Backend อนุญาต origin ที่ใช้เปิดแอป (เช่น `http://host.docker.internal:4100`)  
   โค้ด Backend ใส่ `http://host.docker.internal:3100` และ `http://host.docker.internal:4100` ใน CORS แล้ว หรือตั้งใน Backend `.env`:  
   `CORS_ORIGIN=http://localhost:4100,http://host.docker.internal:4100`  
   จากนั้น restart Backend

2. **เบราว์เซอร์ resolve host.docker.internal ไม่ได้** — บนบางเครื่อง (Windows/Linux) เบราว์เซอร์อาจ resolve `host.docker.internal` ไม่ได้ ให้ลองเปิดแอปด้วย **http://localhost:4100/smart-cabinet-cu** แทน (ยังใช้ `NEXT_PUBLIC_API_URL=http://host.docker.internal:4000/...` ได้ เพราะ request จากเบราว์เซอร์ไปที่ host)

3. **Backend ไม่รันหรือ port 4000 ไม่ได้ map** — ตรวจว่า Backend container รันและ map port 4000:4000 แล้ว และจากเครื่อง host เรียกได้:  
   `curl http://localhost:4000/smart-cabinet-cu/api/v1/health`

---

## คำสั่งอื่นที่ใช้บ่อย

```bash
# หยุด
docker compose -f docker/docker-compose.yml down

# Build ใหม่แล้วรันใหม่ (หลัง pull code)
docker compose -f docker/docker-compose.yml --env-file .env up -d --build

# ดู log แบบ realtime
docker compose -f docker/docker-compose.yml logs -f frontend
```

---

## แก้ปัญหา Login 401 (callback/credentials)

ถ้าเข้าแอปด้วย **IP หรือโดเมนจริง** (เช่น `http://10.11.9.84:4100/smart-cabinet-cu`) แล้วกด Login แล้วได้ **401 Unauthorized** ที่ `POST .../api/auth/callback/credentials` แปลว่า NextAuth ไปเรียก Backend ไม่ถูกหรือ Backend ตอบ 401

ให้ตั้งค่าดังนี้:

### 1) Frontend — `frontend/.env`

| ตัวแปร | ตัวอย่างเมื่อเข้าแอปที่ `http://10.11.9.84:4100` |
|--------|-----------------------------------------------|
| `NEXTAUTH_URL` | `http://10.11.9.84:4100/smart-cabinet-cu` |
| `NEXT_PUBLIC_API_URL` | `http://10.11.9.84:4000/smart-cabinet-cu/api/v1` |
| **`BACKEND_API_URL`** | **`http://10.11.9.84:4000/smart-cabinet-cu/api/v1`** |

- **BACKEND_API_URL** = ให้ NextAuth (รันใน container) เรียก Backend ได้  
  - บน **Linux server** ไม่มี `host.docker.internal` → ใช้ **IP โฮสต์** เดียวกับที่เข้าแอป เช่น `http://10.11.9.84:4000/smart-cabinet-cu/api/v1`  
  - บน Windows/Mac Docker Desktop ใช้ `http://host.docker.internal:4000/smart-cabinet-cu/api/v1` ได้

### 2) Backend — อนุญาต CORS จาก origin ที่เปิดแอป

ถ้าเข้าแอปที่ `http://10.11.9.84:4100` ให้ตั้งใน **`backend/.env`**:

```env
CORS_ORIGIN=http://10.11.9.84:4100,http://localhost:4100
```

จากนั้น **restart Backend** แล้ว **restart Frontend** (ให้อ่าน env ล่าสุด):

```bash
# backend
cd backend && docker compose -f docker/docker-compose.yml up -d

# frontend
cd frontend && docker compose -f docker/docker-compose.yml --env-file .env up -d
```

ตรวจสอบว่า Backend รันที่ port 4000 และจากเครื่องที่รัน Frontend เรียกได้: `curl http://10.11.9.84:4000/smart-cabinet-cu/api/v1/health`

---

## แก้ปัญหา ECONNREFUSED ตอน Login (Credentials auth error)

ถ้า log ขึ้น `Credentials auth error: ... code: 'ECONNREFUSED'` แปลว่า **frontend container ต่อ Backend ไม่ได้**

1. **ตั้ง `NEXTAUTH_SECRET`** ใน `frontend/.env` (เช่น `openssl rand -base64 32` แล้วใส่ค่าที่ได้)
2. **ตั้ง `NEXT_PUBLIC_API_URL` ให้ container ไปถึง Backend ได้**
   - ใช้ **IP โฮสต์** (เครื่องที่รัน Backend) ไม่ใช่ `localhost`  
     ตัวอย่าง: `NEXT_PUBLIC_API_URL=http://10.11.9.84:4000/smart-cabinet-cu/api/v1` (แทน 10.11.9.84 ด้วย IP จริงของเครื่อง)
   - ถ้า Backend อยู่คนละเครื่อง ใช้ IP เครื่อง Backend
3. รัน Compose ด้วย **`--env-file .env`** เพื่อให้อ่านค่าจาก `.env`:  
   `docker compose -f docker/docker-compose.yml --env-file .env up -d --build`

---

## หมายเหตุ

- Build args `NEXT_PUBLIC_API_URL` และ `NEXT_PUBLIC_BASE_PATH` ต้องตรงกับสภาพแวดล้อม เพราะ Next.js bake ค่าเหล่านี้ตอน build
- ถ้าเปลี่ยนโดเมนหรือ port หลัง build แล้ว ต้อง build ใหม่ด้วยค่า `NEXT_PUBLIC_*` และ `NEXTAUTH_URL` ที่ถูกต้อง
- รายละเอียด Docker และ K8s: [frontend/docker/README.md](README.md)
