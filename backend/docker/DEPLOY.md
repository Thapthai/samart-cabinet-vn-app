# Deploy Backend ด้วย Docker Compose

## ⚠️ ทำไมรันแล้วมันมาแทนที่ ไม่สร้างอีกอัน

ถ้ารันแบบนี้:
```bash
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```
(ไม่มี `-p`) Compose จะถือว่าเป็น **project เดียว** (ชื่อจากโฟลเดอร์ เช่น `backend`) จึงจะ **อัปเดต/แทนที่ container เดิมเสมอ** ไม่สร้าง container ใหม่เพิ่ม

**ถ้าอยากให้มีหลายแอปรันคู่กัน (สร้างอีกอัน):** ต้องใช้ **`-p` ตั้งชื่อ project คนละตัว** และ **พอร์ตคนละตัว** ใน .env ดูหัวข้อ **"รันหลายแอป (สร้างอีกอัน)"** ด้านล่าง

---

## ข้อกำหนดบนเซิร์ฟเวอร์

- Docker และ Docker Compose
- ไฟล์ `.env` ในโฟลเดอร์ `backend/` (ตั้งค่าแล้ว)

## ขั้นตอน Deploy

### 1. อัปโหลดโค้ดไปที่เซิร์ฟเวอร์

```bash
# ตัวอย่าง: clone หรือ scp โปรเจกต์ไปที่เซิร์ฟเวอร์
# จากนั้น cd เข้าโฟลเดอร์ backend
cd /path/to/samart-cabinet-vu-app/backend
```

### 2. ตรวจสอบ .env

ให้มีไฟล์ `backend/.env` และมีตัวแปรอย่างน้อย:

- `DATABASE_URL` (หรือ DATABASE_USER, PASSWORD, NAME, HOST, PORT)
- `JWT_SECRET`
- **กำหนดชื่อและพอร์ตไม่ให้ซ้ำแต่ละแอป (ใน .env):**
  - `BACKEND_CONTAINER_NAME` — ชื่อ container (แอปละชื่อ ไม่ซ้ำ)
  - `BACKEND_HOST_PORT` — พอร์ตบน host (แอปละพอร์ต)
  - `BACKEND_INTERNAL_PORT` — พอร์ตภายใน container (มักเท่ากับ BACKEND_HOST_PORT)
- อื่นๆ ตาม `.env.example`

**ตัวอย่างค่าใน .env แยกตามแอป:**

| ตัวแปร | แอปหลัก (ตัวเดิม) | แอปที่สอง (VN) |
|--------|---------------------|-----------------|
| BACKEND_CONTAINER_NAME | smart-cabinet-backend | smart-cabinet-backend-vn |
| BACKEND_HOST_PORT | 4000 | 3000 |
| BACKEND_INTERNAL_PORT | 4000 | 3000 |

### 3. Build และรัน

**แอปหลัก (ตัวเดิม ที่ชื่อ smart-cabinet-backend พอร์ต 4000):**
```bash
# ใน .env ใส่ BACKEND_CONTAINER_NAME=smart-cabinet-backend, BACKEND_HOST_PORT=4000, BACKEND_INTERNAL_PORT=4000
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

**แอปที่สอง (สร้างอีกอัน ไม่ให้แทนที่):** ใช้ **.env คนละไฟล์** (ชื่อ + พอร์ตคนละ) และ **ต้องใช้ -p คนละชื่อ** ด้วย
```bash
# สร้าง .env.vn ใส่ BACKEND_CONTAINER_NAME=smart-cabinet-backend-vn, BACKEND_HOST_PORT=3000, BACKEND_INTERNAL_PORT=3000 (+ DATABASE_URL, JWT_SECRET ฯลฯ)
docker compose -p backend-vn -f docker/docker-compose.yml --env-file .env.vn up -d --build
```
ผลลัพธ์: container ชื่อ smart-cabinet-backend (4000) กับ smart-cabinet-backend-vn (3000) รันคู่กันได้

- `--build` = build image ใหม่
- `-d` = รันแบบแยกพื้นหลัง (detached)

### 4. ตรวจสอบ

```bash
# ดูสถานะ container (ถ้ารันด้วย -p ให้ใส่ -p เดียวกัน เช่น -p backend-vn)
docker compose -p backend-vn -f docker/docker-compose.yml ps
```

**หมายเหตุ:** ถ้าโฟลเดอร์ `fonts/` ไม่มีอยู่ ให้สร้างก่อน build (ดูหัวข้อ "ตัวหนังสือในรายงาน PDF ผิดเพี้ยน" ด้านล่าง)

```bash
# ดู log (ถ้ารันด้วย -p ให้ใส่ -p เดียวกัน)
docker compose -p backend-vn -f docker/docker-compose.yml logs -f backend

# ทดสอบ health (ใช้พอร์ตตาม BACKEND_HOST_PORT ใน .env)
curl http://localhost:3000/api/smart-cabinet-vn/v1/health
```

Backend จะ listen ที่พอร์ตตาม **BACKEND_HOST_PORT** ใน .env (ค่าเริ่มต้น 3000)

---

## คำสั่งอื่นที่ใช้บ่อย

```bash
# หยุด (ใส่ -p ให้ตรงกับตอน up ถ้าใช้ -p)
docker compose -p backend-vn -f docker/docker-compose.yml down

# Build ใหม่แล้วรันใหม่ (หลัง pull code)
docker compose -p backend-vn -f docker/docker-compose.yml --env-file .env up -d --build

# ดู log แบบ realtime
docker compose -p backend-vn -f docker/docker-compose.yml logs -f backend
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

