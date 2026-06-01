# 📚 Sınav Asistanım

SPL, MASAK ve diğer sınavlara hazırlıkta yapay zeka destekli akıllı çalışma asistanı.

## 🚀 Özellikler

- **AI PDF İşleme** — PDF yükle, yapay zeka otomatik olarak ders notları, sorular ve flashcard'lar oluşturur
- **Çok Programlı** — SPL Düzey 3 (12 ders), MASAK Uyum Görevlisi (2 modül), SPL Bağımsız Denetim (5 ders)
- **Deneme Sınavı** — Gerçek sınav koşullarında zamanlı deneme (modül seçici, geçme notu hesaplama)
- **Flashcard** — Spaced repetition (SM-2) algoritması ile akıllı tekrar
- **Gamification** — XP, seviye sistemi, 16 başarım rozeti
- **Hazırlık Endeksi** — Ağırlıklı skor ile sınava ne kadar hazır olduğunu gör
- **Kapsam Haritası** — Bölüm bazlı ilerleme takibi
- **AI Sohbet** — Ders notlarına dayalı çalışma arkadaşı
- **PWA** — Mobilde uygulama olarak yüklenebilir

## 🛠 Teknoloji

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 15, React 19, Framer Motion |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth.js (JWT + bcrypt) |
| Database | Prisma + SQLite (geliştirme) |
| AI | Google Gemini (multimodal PDF analiz) |
| Fonts | Inter + Outfit (Google Fonts) |

## 📦 Kurulum

```bash
# 1. Repo'yu klonla
git clone <repo-url>
cd spl-study-assistant

# 2. Bağımlılıkları yükle
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle (NEXTAUTH_SECRET, GOOGLE_GENERATIVE_AI_API_KEY vb.)

# 4. Veritabanını oluştur
npx prisma db push

# 5. Geliştirme sunucusunu başlat
npm run dev
```

## 🔑 Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|---|---|---|
| `NEXTAUTH_SECRET` | JWT şifreleme anahtarı (`openssl rand -base64 32`) | ✅ |
| `NEXTAUTH_URL` | Uygulama URL'i | ✅ |
| `DATABASE_URL` | Veritabanı bağlantısı | ✅ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API anahtarı | ✅ |
| `GEMINI_API_KEYS` | Çoklu Gemini key (virgülle ayrılmış) | ❌ |

## 📁 Proje Yapısı

```
src/
├── app/
│   ├── api/           # API route'ları (chat, upload, process, status, health)
│   ├── dashboard/     # Ana panel
│   ├── program/       # Program ve ders sayfaları
│   ├── login/         # Giriş sayfası
│   └── onboarding/    # İlk kurulum
├── components/        # UI bileşenleri
│   ├── course/        # Ders sayfası tab bileşenleri
│   └── ui/            # Paylaşılan UI bileşenleri
├── lib/
│   ├── actions.ts     # Server actions (gamification, CRUD)
│   ├── ai-service.ts  # AI servisi (Gemini entegrasyonu)
│   ├── course-data.ts # Statik ders konfigürasyonları
│   ├── pdf-engine.ts  # PDF işleme motoru
│   └── schedule-engine.ts # Çalışma planı motoru
└── prisma/
    └── schema.prisma  # Veritabanı şeması
```

## 🔒 Güvenlik

- Tüm API endpoint'leri auth korumalı (NextAuth session)
- Şifreler bcrypt ile hash'leniyor
- Upload boyut limiti: 100MB
- Hata mesajlarından stack trace gizleniyor
- Input validation (mesaj uzunluk, dosya tipi kontrolü)

## 📝 Lisans

MIT
