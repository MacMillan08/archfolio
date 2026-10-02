# Archfolio

Can Durmuş için mimarlık portfolyosu — Node.js/Express/TypeScript/Prisma/EJS, Neon Postgres ve Cloudinary ile.

## Kurulum

```bash
npm install
cp .env.example .env   # kendi değerlerinle doldur
npm run db:deploy      # migration'ları uygula
npm run dev
```

## Git hook kurulumu

Gizli dosyaların (`.env.*`, `*.pem`, `*.key`, `*.p12`) yanlışlıkla commit'lenmesini engelleyen bir pre-commit hook var. `.git/hooks` klasörü repo ile birlikte klonlanmadığı için her makinede bir kez kurulması gerekir:

```bash
cp scripts/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```
