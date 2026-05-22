# Viljahindade Monitor

Eesti viljahindade jälgimise veebirakendus. MATIF turuandmed (Yahoo Finance) + SMS hindade sisestamine.

## Stack

- **Next.js 14** App Router
- **TypeScript** strict mode
- **Tailwind CSS** (GitHub dark teema)
- **Recharts** graafikud
- **Prisma + PostgreSQL** (Vercel Postgres)
- **Zod** validatsioon
- **next-pwa** PWA tugi

## Lokaalne arendus

```bash
git clone <repo>
cd viljahinnad
npm install
node scripts/generate-icons.js   # loo PWA ikoonid
cp .env.example .env.local        # täida andmebaasi URL-id
npx prisma db push                # loo tabelid
npm run dev                       # http://localhost:3000
```

## Vercel deploy

1. **Lükka kood GitHubi**
   ```bash
   git init
   git add .
   git commit -m "init: viljahindade monitor"
   git remote add origin https://github.com/<kasutaja>/viljahinnad.git
   git push -u origin main
   ```

2. **Vercel Postgres** – loo andmebaas:
   - Vercel dashboard → Storage → Create Database → Postgres
   - Kopeeri `POSTGRES_PRISMA_URL` ja `POSTGRES_URL_NON_POOLING`

3. **Vercel projekt** – impordi GitHub repo:
   - vercel.com → New Project → Import
   - Lisa Environment Variables:
     ```
     POSTGRES_PRISMA_URL       = <Vercel Postgres URL>
     POSTGRES_URL_NON_POOLING  = <Vercel Postgres direct URL>
     CRON_SECRET               = <juhuslik string, nt openssl rand -hex 32>
     ```
   - Deploy!

4. **Andmebaas** – pärast esimest deployt:
   ```bash
   # Vercel Postgres'i vastu
   npx prisma db push
   ```

## API

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| GET | `/api/market?period=3mo` | Turuandmed (EBM.PA, ECO.PA, EURUSD=X) |
| POST | `/api/sms/parse` | Parse SMS tekst (ei salvesta) |
| POST | `/api/sms` | Salvesta kinnitatud hinnad |
| GET | `/api/sms?product=Nisu&limit=100` | Loe hinnad andmebaasist |
| DELETE | `/api/sms/:id` | Kustuta kirje |
| GET | `/api/cron` | Cron – uuenda turuandmeid (Bearer token) |

## Toetatud SMS formaadid

**Scandagra:**
```
Scandagra 22.05.2026
Nisu: 210 €/t
Oder: 185 €/t
Raps: 505 €/t
```

**Kevili (üherealised):**
```
Kevili 22.05 nisu 209 oder 184 raps 508 kaer 162
```

**Vaba formaat:**
```
nisu 208 oder 182 raps 500 kaer 160 rukis 155
```

## Cron

Automaatne andmete uuendamine tööpäeviti kell 13:00 ja 16:00 (UTC) `vercel.json` kaudu.

Käsitsi käivitamine:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<sinu-domeen>.vercel.app/api/cron
```
