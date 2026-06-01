# Production Checklist

## ✅ Pre-deployment

- [ ] `DATABASE_URL` PostgreSQL'e çevrildi
- [ ] `NEXTAUTH_SECRET` min 32 karakter (rastgele)
- [ ] `NEXTAUTH_URL` production URL (https://)
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` geçerli
- [ ] `npm run build` hatasız tamamlandı
- [ ] `npx vitest run` tüm testler geçiyor
- [ ] `npx tsc --noEmit` 0 hata
- [ ] uploads/ dizini cloud storage'a taşındı

## ✅ Güvenlik

- [x] Security headers middleware aktif
- [x] API route'larda auth kontrolü
- [x] Input validation (Zod)
- [x] Şifre minimum 6 karakter
- [x] E-posta regex doğrulama
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [ ] HTTPS zorunlu (production)
- [ ] Rate limiting (Redis ile)

## ✅ Veritabanı

- [x] 11 performans index tanımlı
- [x] Cascade delete ilişkileri
- [ ] PostgreSQL migration
- [ ] Otomatik backup

## ✅ Monitoring

- [x] /api/health endpoint
- [x] env-validation.ts (başlangıçta kontrol)
- [x] Structured JSON logger
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring

## ✅ CI/CD

- [x] GitHub Actions workflow (lint→test→typecheck→build)
- [x] Dockerfile (multi-stage)
- [ ] Staging environment
- [ ] Preview deployments

## ✅ SEO

- [x] sitemap.ts
- [x] robots.ts
- [x] JSON-LD structured data
- [x] OpenGraph + Twitter meta
- [x] Semantic HTML (<main>, <nav>, <section>)
