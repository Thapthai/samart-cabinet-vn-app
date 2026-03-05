# Deploy Backend ด้วย Docker Compose

## ข้อกำหนดบนเซิร์ฟเวอร์

- Docker และ Docker Compose
- ไฟล์ `.env` ในโฟลเดอร์ `backend/` (ตั้งค่าแล้ว)

## ขั้นตอน Deploy

### 1. อัปโหลดโค้ดไปที่เซิร์ฟเวอร์

```bash
# ตัวอย่าง: clone หรือ scp โปรเจกต์ไปที่เซิร์ฟเวอร์
# จากนั้น cd เข้าโฟลเดอร์ backend
cd /path/to/samart-cabinet-cu-app/backend
```

### 2. ตรวจสอบ .env

ให้มีไฟล์ `backend/.env` และมีตัวแปรอย่างน้อย:

- `DATABASE_URL` (หรือ DATABASE_USER, PASSWORD, NAME, HOST, PORT)
- `JWT_SECRET`
- `BACKEND_HOST_PORT` — พอร์ตบน host ที่จะ map เข้า container (ค่าเริ่มต้น 3000) ถ้ารันหลายแอปให้ตั้งคนละค่า เช่น 3000, 3001
- อื่นๆ ตาม `.env.example`

### 3. Build และรัน

**รันแอปเดียว (default):**
```bash
# จากโฟลเดอร์ backend
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

**รันหลายแอปบนเครื่องเดียวกัน (ให้แต่ละแอปเป็นคนละ container):** ใช้ `-p` ระบุ project name และใน .env ของแต่ละแอปใส่พอร์ตคนละค่า

```bash
# แอปที่ 1 (เช่น VN) — ใน backend/.env ใส่ BACKEND_HOST_PORT=3000
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml --env-file .env up -d --build

# แอปที่ 2 (เช่น CU) — ใช้โฟลเดอร์หรือ .env อีกชุด ใส่ BACKEND_HOST_PORT=3001
docker compose -p smart-cabinet-cu -f docker/docker-compose.yml --env-file .env.cu up -d --build
```

- `-p` หรือ `--project-name` = ชื่อ project แยกแต่ละแอป (container จะได้ชื่อเช่น smart-cabinet-vn-backend-1, smart-cabinet-cu-backend-1)
- ใน `.env` ใส่ `BACKEND_HOST_PORT=3000` (หรือ 3001, 3002 ฯลฯ) เพื่อไม่ให้พอร์ตชนกัน
- `--build` = build image ใหม่, `-d` = รันแบบแยกพื้นหลัง

### 4. ตรวจสอบ

```bash
# ดูสถานะ container (ถ้ารันด้วย -p ให้ใส่ -p เดียวกัน)
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml ps
```

**หมายเหตุ:** ถ้าโฟลเดอร์ `fonts/` ไม่มีอยู่ ให้สร้างก่อน build (ดูหัวข้อ "ตัวหนังสือในรายงาน PDF ผิดเพี้ยน" ด้านล่าง)

```bash
# ดู log (ถ้ารันด้วย -p ให้ใส่ -p เดียวกัน)
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml logs -f backend

# ทดสอบ health (ใช้พอร์ตตาม BACKEND_HOST_PORT ใน .env)
curl http://localhost:3000/api/smart-cabinet-vn/v1/health
```

Backend จะ listen ตาม `PORT` ใน container (3000) ส่วนพอร์ตที่เปิดออกนอก host ใช้ค่าจาก **BACKEND_HOST_PORT** ใน .env (ค่าเริ่มต้น 3000)

---

## คำสั่งอื่นที่ใช้บ่อย

```bash
# หยุด (ใส่ -p ให้ตรงกับตอน up)
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml down

# Build ใหม่แล้วรันใหม่ (หลัง pull code)
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml --env-file .env up -d --build

# ดู log แบบ realtime
docker compose -p smart-cabinet-vn -f docker/docker-compose.yml logs -f backend
```

---

## ตัวหนังสือในรายงาน PDF ผิดเพี้ยน (ภาษาไทยไม่ขึ้น)

รายงาน PDF (เบิก/เติม/สต๊อกตู้ Weighing ฯลฯ) ใช้ฟอนต์ไทย **TH Sarabun New** ถ้าไม่มีฟอนต์ ตัวหนังสือจะผิดเพี้ยนหรือเป็นกล่อง

### วิธีแก้

1. **ดาวน์โหลดฟอนต์** (ชุดฟอนต์ของรัฐบาลไทย หรือแหล่งที่ให้ใช้ได้ตามลิขสิทธิ์)  
   ต้องมีไฟล์:
   - `THSarabunNew.ttf`
   - `THSarabunNew Bold.ttf`

2. **วางไฟล์ในโฟลเดอร์ `backend/fonts/`**  
   จากโฟลเดอร์ backend ให้มีโครงแบบนี้:
   ```
   backend/
     fonts/
       THSarabunNew.ttf
       THSarabunNew Bold.ttf
   ```
   (โฟลเดอร์ `backend/fonts/` มีอยู่แล้ว มีไฟล์ `.gitkeep` อยู่ข้างใน)

3. **Build image ใหม่** แล้วรัน container ใหม่:
   ```bash
   cd /path/to/samart-cabinet-cu-app/backend
   docker compose -f docker/docker-compose.yml --env-file .env up -d --build
   ```

หลัง build ใหม่ ฟอนต์จะถูก copy เข้า image และรายงาน PDF จะแสดงภาษาไทยได้ถูกต้อง

