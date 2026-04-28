# Polla Mundial 2026

Web app de predicciones para el Mundial 2026 (USA / Canadá / México). Los usuarios predicen los 104 partidos del torneo + picks globales (campeón, subcampeón, 3°, 4°). El admin ingresa resultados reales y el sistema calcula los puntos automáticamente.

## Stack

- **Backend**: Node.js + Express 5 + Prisma 6 + PostgreSQL 16
- **Frontend**: React 19 + Vite + TypeScript + Zustand + React Router 7
- **Auth**: JWT + bcrypt
- **Despliegue**: Render (backend + DB), Vercel (frontend)

```
backend/                   # API + Prisma + tests
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts            # 48 equipos, 104 partidos, 495 combinaciones de terceros
│   └── thirdPlaceCombinations.json
├── src/
│   ├── middleware/auth.ts
│   ├── routes/            # auth, matches, predictions, globalPredictions, bracket, leaderboard
│   └── services/          # AuthService, MatchService, PredictionService, GlobalPredictionService,
│                          # ScoringService, BracketService, LeaderboardService
├── tests/scoring.test.ts  # Jest
├── server.ts
├── Dockerfile
└── tsconfig.json

frontend/                  # SPA
├── src/
│   ├── components/        # MatchCard, ScoreInput, TeamSelector, BracketTree, Navbar, ProtectedRoute
│   ├── pages/             # Login, Register, Fixture, Bracket, GlobalPicks, Preview,
│   │                      # Leaderboard, Results, Admin
│   ├── services/api.ts
│   ├── store/             # authStore, predictionsStore, matchesStore (Zustand)
│   ├── types/index.ts
│   ├── utils/index.ts
│   └── App.tsx
└── vercel.json

render.yaml                # Render IaC (DB + web service)
```

---

## Correr en local

### Requisitos

- Node 20+
- Docker (recomendado para Postgres local) o PostgreSQL 16 instalado

### Backend

```bash
cd backend
cp .env.example .env

# Postgres en Docker (credenciales matchean .env.example)
docker run -d --name betplay-postgres \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=polla_mundial \
  -p 5432:5432 \
  postgres:16

npm install
npx prisma migrate deploy   # aplica las migraciones existentes
npx prisma db seed          # carga equipos, partidos y combinaciones de terceros
npm run dev                 # http://localhost:3000
```

### Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm install
npm run dev                 # http://localhost:5173
```

### Tests del backend

```bash
cd backend
npm test
```

---

## Despliegue

### Opción A — Render IaC (recomendado)

El archivo `render.yaml` declara la DB + el web service. Desde Render: **New → Blueprint → conecta el repo**. Render lee `render.yaml`, crea la DB Postgres y el web service, y enlaza `DATABASE_URL` automáticamente. Genera `JWT_SECRET` aleatorio.

Tras el primer deploy, abre la **Shell** del web service y corre el seed:

```bash
npx prisma db seed
```

### Opción B — Render manual

1. **Crea la DB**: New → PostgreSQL, plan Free, version 16. Copia la *Internal Database URL*.
2. **Crea el web service**: New → Web Service, conecta el repo, root directory `backend`.
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && node dist/server.js`
   - Variables de entorno:
     - `DATABASE_URL` → la URL de la DB
     - `JWT_SECRET` → string aleatorio (`openssl rand -hex 32`)
     - `JWT_EXPIRES_IN` → `7d`
     - `PORT` → `3000`
3. Tras el primer deploy, en la **Shell**: `npx prisma db seed`.

### Opción C — Docker

```bash
cd backend
docker build -t polla-mundial-backend .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  -e JWT_EXPIRES_IN=7d \
  -e PORT=3000 \
  polla-mundial-backend
```

### Frontend en Vercel

1. New Project → importa el repo, root directory `frontend`.
2. Vercel auto-detecta Vite (preset configurado en `frontend/vercel.json`).
3. Variable de entorno:
   - `VITE_API_URL` → URL pública del backend en Render (ej. `https://polla-mundial-backend.onrender.com`)
4. Deploy.

> El `vercel.json` incluye un rewrite `/(.*) → /index.html` para que `BrowserRouter` no rompa al recargar rutas como `/fixture`.

---

## Crear el primer admin

El registro vía API crea usuarios normales (`isAdmin: false`). Para promover el primer admin:

1. Registra un usuario por la app o vía `POST /api/auth/register`.
2. Conéctate a la DB (Render dashboard → Connect → External, o `psql $DATABASE_URL`):

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'tu-email@ejemplo.com';
```

3. Cierra sesión y vuelve a entrar para que el JWT incluya `isAdmin: true`.

---

## Endpoints

| Método | Ruta | Auth |
|--------|------|------|
| `POST` | `/api/auth/register` | público |
| `POST` | `/api/auth/login` | público |
| `GET` | `/api/auth/me` | usuario |
| `GET` | `/api/matches` | público |
| `GET` | `/api/matches/phase/:phase` | público |
| `GET` | `/api/matches/group/:group` | público |
| `PUT` | `/api/matches/:id/result` | admin |
| `GET` | `/api/predictions/me` | usuario |
| `GET` | `/api/predictions/preview` | usuario |
| `PUT` | `/api/predictions/:matchId` | usuario |
| `GET` | `/api/global-predictions/me` | usuario |
| `PUT` | `/api/global-predictions` | usuario |
| `POST` | `/api/bracket/resolve` | admin |
| `GET` | `/api/leaderboard` | público |

Errores siguen el formato:

```json
{ "error": "CODIGO_ERROR", "message": "Descripción legible" }
```

---

## Reglas de scoring

**Fase de grupos**
- `+1` si aciertas el ganador (o el empate)
- `+2` adicional si aciertas el marcador exacto en 90'

**Fase eliminatoria**
- `+1` ganador acertado
- `+2` marcador exacto en 90'
- `+1` predijiste prórroga (empate en 90' y el partido fue a prórroga)
- `+1` marcador exacto al final de prórroga (acumulado)
- `+1` predijiste penales (ET 0-0 y el partido fue a penales)
- `+2` marcador exacto de penales

**Picks globales** (deadline: 11 jun 2026 11:00 AM hora Colombia)
- Campeón: `+10`
- Subcampeón: `+6`
- 3°: `+4`
- 4°: `+2`

---

## Comandos útiles

```bash
# Backend
npm run dev                   # nodemon + ts-node
npm run build                 # TS → dist/
npm start                     # node dist/server.js
npm test                      # Jest
npx prisma migrate dev        # nueva migración tras editar schema.prisma
npx prisma migrate deploy     # aplica migraciones pendientes
npx prisma db seed            # corre prisma/seed.ts (idempotente)
npx prisma studio             # GUI para inspeccionar la DB

# Frontend
npm run dev                   # Vite dev server
npm run build                 # tsc -b && vite build
npm run preview               # sirve el build local
```
