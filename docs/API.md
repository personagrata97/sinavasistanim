# API Endpoint Dokümantasyonu

## Auth

### `POST /api/auth/register`
Yeni kullanıcı kaydı.
```json
{
  "name": "string (min 2, max 100)",
  "email": "string (valid email)",
  "password": "string (min 6, max 128)"
}
```
**Response:** `201` — `{ message: "Kayıt başarılı" }`

### `POST /api/auth/[...nextauth]`
NextAuth.js oturum yönetimi. Login/logout/session.

---

## Chat

### `POST /api/chat`
🔒 Auth gerekli.
```json
{
  "courseId": "string",
  "messages": [{ "role": "user|assistant|system", "content": "string (max 10000)" }]
}
```
**Limitler:** Max 50 mesaj, max 10.000 karakter/mesaj.  
**Response:** `200` — AI stream response.

---

## Courses

### `GET /api/courses/status?courseId={id}`
🔒 Auth gerekli. Kursun işlenme durumunu döner.
```json
{ "status": "not_started|uploading|processing|ready", "processedPages": 0, "totalPages": 0 }
```

### `POST /api/courses/upload`
🔒 Auth gerekli. PDF yükleme.
- **Content-Type:** `multipart/form-data`
- **Max boyut:** 100MB
- **Kabul:** `.pdf`

---

## Flashcards

### `GET /api/flashcards?slug={courseSlug}`
Kurs flashcard'larını döner (spaced repetition bilgileriyle).

### `POST /api/flashcards/review`
🔒 Auth gerekli.
```json
{ "flashcardId": "string", "quality": 0-5 }
```

---

## Questions

### `GET /api/questions?slug={courseSlug}`
Kurs sorularını döner.

### `POST /api/questions/answer`
🔒 Auth gerekli.
```json
{ "questionId": "string", "answer": "string" }
```

### `POST /api/questions/report`
🔒 Auth gerekli. Hatalı soru bildirimi.
```json
{ "questionId": "string", "reason": "string (optional)" }
```

---

## Mock Exam

### `POST /api/mock-exam/result`
🔒 Auth gerekli. Deneme sınav sonucu kaydet.
```json
{
  "courseId": "string",
  "score": 0-100,
  "correct": "number",
  "wrong": "number",
  "empty": "number",
  "timeUsed": "number (seconds)",
  "passed": "boolean",
  "weakAreas": ["string"]
}
```

---

## Health

### `GET /api/health`
Sistem durumu kontrolü.
```json
{
  "status": "ok",
  "timestamp": "ISO 8601",
  "database": "connected",
  "environment": "development|production",
  "stats": { "users": 5, "courses": 10 }
}
```

---

## Güvenlik Notları

- Tüm POST endpoint'leri `Content-Type: application/json` bekler
- Auth gerektiren endpoint'ler `401` döner (oturum yoksa)
- Input validation Zod ile yapılır
- Rate limit: 100 request/dakika (header: `X-RateLimit-Limit`)
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
