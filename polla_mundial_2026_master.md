# Polla Mundial 2026 — Documento maestro de desarrollo

> Este documento está diseñado para ser entregado a una IA paso a paso.
> Cada sección es un prompt independiente y ordenado. No saltes pasos.

---

## Contexto general del proyecto

Aplicación web de predicciones para el Mundial 2026 (USA/Canadá/México). Los usuarios predicen resultados de los 104 partidos del torneo y picks globales (campeón, subcampeón, 3°, 4°). Un administrador ingresa los resultados reales y el sistema calcula puntos automáticamente. Hay un leaderboard con el ranking de todos los participantes.

**Stack tecnológico:**
- Frontend: React + Vite + TypeScript + Zustand + React Router
- Backend: Node.js + Express + Prisma ORM
- Base de datos: PostgreSQL
- Auth: JWT + bcrypt
- Despliegue: Render (backend + BD) + Vercel (frontend)

---

## PASO 1 — Configuración inicial del proyecto

```
Crea la estructura de un monorepo con dos carpetas: /backend y /frontend.

BACKEND:
- Inicializa un proyecto Node.js con Express y TypeScript
- Instala dependencias: express, prisma, @prisma/client, bcryptjs, jsonwebtoken, cors, dotenv
- Instala dependencias de desarrollo: typescript, ts-node, nodemon, @types/express, @types/bcryptjs, @types/jsonwebtoken
- Crea el archivo tsconfig.json configurado para Node.js
- Crea el archivo .env.example con estas variables:
    DATABASE_URL=postgresql://user:password@localhost:5432/polla_mundial
    JWT_SECRET=tu_secreto_aqui
    JWT_EXPIRES_IN=7d
    PORT=3000
- Crea la estructura de carpetas:
    /backend
      /src
        /services
        /routes
        /middleware
        /utils
      /prisma
      server.ts

FRONTEND:
- Inicializa con: npm create vite@latest frontend -- --template react-ts
- Instala dependencias: zustand, react-router-dom, axios
- Crea la estructura de carpetas:
    /frontend/src
      /pages
      /components
      /services
      /store
      /types

No escribas código de funcionalidad todavía. Solo la estructura y configuración base.
```

---

## PASO 2 — Esquema de base de datos (Prisma)

```
Crea el archivo /backend/prisma/schema.prisma con exactamente este esquema:

Base de datos: PostgreSQL

MODELOS:

1. User
   - id: String @id @default(uuid())
   - username: String @unique
   - email: String @unique
   - passwordHash: String
   - isAdmin: Boolean @default(false)
   - createdAt: DateTime @default(now())
   - Relaciones: predictions[], globalPrediction?

2. Team
   - id: String @id @default(uuid())
   - name: String @unique
   - code: String @unique (3 letras, ej: "COL")
   - group: String? (letra "A" a "L", null para equipos TBD)
   - flagUrl: String?
   - Relaciones: homeMatches[], awayMatches[]

3. Match
   - id: String @id @default(uuid())
   - phase: Enum [GROUPS, R32, R16, QF, SF, THIRD, FINAL]
   - matchday: Int? (solo fase de grupos: 1, 2 o 3)
   - scheduledAt: DateTime
   - lockedAt: DateTime? (se setea cuando inicia el partido)
   - venue: String?
   - homeTeamId: String? (NULL en eliminatorias hasta conocer clasificados)
   - awayTeamId: String? (NULL en eliminatorias hasta conocer clasificados)
   - resultHome90: Int?
   - resultAway90: Int?
   - resultHomeET: Int? (goles en prórroga acumulados, no solo ET)
   - resultAwayET: Int?
   - resultHomePen: Int?
   - resultAwayPen: Int?
   - winnerId: String? (FK al equipo ganador, para armar bracket)
   - matchStatus: Enum [PENDING, LIVE, FINISHED] @default(PENDING)
   - Relaciones: homeTeam?, awayTeam?, predictions[]

4. Prediction
   - id: String @id @default(uuid())
   - userId: String (FK)
   - matchId: String (FK)
   - pickHome90: Int
   - pickAway90: Int
   - pickHomeET: Int?
   - pickAwayET: Int?
   - pickHomePen: Int?
   - pickAwayPen: Int?
   - ptsWinner: Int @default(0)
   - ptsExact: Int @default(0)
   - ptsET: Int @default(0)
   - ptsETExact: Int @default(0)
   - ptsPen: Int @default(0)
   - ptsPenExact: Int @default(0)
   - ptsTotal: Int @default(0)
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt
   - @@unique([userId, matchId])

5. GlobalPrediction
   - id: String @id @default(uuid())
   - userId: String @unique (FK)
   - championId: String? (FK a Team)
   - runnerUpId: String? (FK a Team)
   - thirdId: String? (FK a Team)
   - fourthId: String? (FK a Team)
   - ptsChampion: Int @default(0)
   - ptsRunnerUp: Int @default(0)
   - ptsThird: Int @default(0)
   - ptsFourth: Int @default(0)
   - ptsTotal: Int @default(0)
   - lockedAt: DateTime? (deadline: 11 junio 2026 11:00 AM)
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt

6. ThirdPlaceCombination
   - id: Int @id @autoincrement()
   - groupsKey: String @unique (ej: "ABCD" — grupos ordenados alfabéticamente)
   - slots: Json (ej: { "r32_slot1": "A", "r32_slot2": "B", ... })

Después de crear el schema, ejecuta:
npx prisma generate
```

---

## PASO 3 — Seed inicial

```
Crea el archivo /backend/prisma/seed.ts que al ejecutarse llene la base de datos con:

1. Los 48 equipos clasificados al Mundial 2026, con sus grupos reales (A–L).
   Usa los grupos y equipos oficiales del sorteo del Mundial 2026.
   Incluye code de 3 letras (ISO) y flagUrl vacío por ahora ("").

2. Los 104 partidos del torneo:
   - 72 partidos de fase de grupos con fechas reales, estadios y equipos definidos
   - 32 partidos eliminatorios (R32, R16, QF, SF, THIRD, FINAL) con homeTeamId y awayTeamId en NULL,
     scheduledAt con las fechas aproximadas según el calendario oficial del Mundial 2026,
     y venue con el estadio asignado si se conoce.

3. Las 495 combinaciones de terceros clasificados en ThirdPlaceCombination.
   Cada fila tiene groupsKey (ej: "ABCD") y slots con el JSON de emparejamientos
   según el reglamento FIFA del Mundial 2026.

El script debe poder ejecutarse con: npx ts-node prisma/seed.ts
Y debe ser idempotente (si se ejecuta dos veces no duplica datos — usa upsert).
```

---

## PASO 4 — Middleware de autenticación

```
Crea /backend/src/middleware/auth.ts con:

1. Función authenticateToken(req, res, next):
   - Lee el header Authorization: Bearer <token>
   - Verifica el JWT con JWT_SECRET
   - Si es válido: adjunta req.user = { id, email, isAdmin } y llama next()
   - Si no hay token: 401 { error: "UNAUTHORIZED", message: "Token requerido" }
   - Si el token es inválido o expiró: 401 { error: "INVALID_TOKEN", message: "Token inválido o expirado" }

2. Función requireAdmin(req, res, next):
   - Usa después de authenticateToken
   - Si req.user.isAdmin es false: 403 { error: "FORBIDDEN", message: "Requiere permisos de administrador" }
   - Si es admin: llama next()

Todos los errores siguen este formato JSON:
{ "error": "CODIGO_ERROR", "message": "Descripción legible" }
```

---

## PASO 5 — AuthService y rutas de autenticación

```
Crea /backend/src/services/AuthService.ts con estos métodos:

register(username, email, password):
- Verifica que email y username no existan (si existen: throw con código "EMAIL_TAKEN" o "USERNAME_TAKEN")
- Hashea la contraseña con bcrypt (saltRounds: 10)
- Crea el usuario en BD
- Devuelve { user: { id, username, email, isAdmin }, token }

login(email, password):
- Busca el usuario por email (si no existe: throw "INVALID_CREDENTIALS")
- Compara la contraseña con bcrypt (si no coincide: throw "INVALID_CREDENTIALS")
- Devuelve { user: { id, username, email, isAdmin }, token }

generateToken(userId, email, isAdmin):
- Firma JWT con payload { id, email, isAdmin } y JWT_SECRET
- Expiración: JWT_EXPIRES_IN del .env

---

Crea /backend/src/routes/auth.ts con:

POST /api/auth/register
  Body: { username, email, password }
  200: { user: { id, username, email, isAdmin }, token }
  400: { error: "EMAIL_TAKEN", message: "..." } o { error: "USERNAME_TAKEN", message: "..." }
  400: { error: "VALIDATION_ERROR", message: "Todos los campos son requeridos" }

POST /api/auth/login
  Body: { email, password }
  200: { user: { id, username, email, isAdmin }, token }
  401: { error: "INVALID_CREDENTIALS", message: "Email o contraseña incorrectos" }

GET /api/auth/me  [requiere authenticateToken]
  200: { user: { id, username, email, isAdmin } }
```

---

## PASO 6 — MatchService y rutas de partidos

```
Crea /backend/src/services/MatchService.ts con:

getAllMatches():
- Devuelve todos los partidos con homeTeam y awayTeam incluidos (include en Prisma)
- Ordenados por scheduledAt ASC

getMatchesByPhase(phase):
- Filtra por phase
- Mismo include y orden

getMatchesByGroup(group):
- Devuelve partidos de grupos donde homeTeam.group === group o awayTeam.group === group

updateResult(matchId, { resultHome90, resultAway90, resultHomeET, resultAwayET, resultHomePen, resultAwayPen }, adminId):
- Solo lo puede llamar un admin
- Valida que el partido exista
- Actualiza los campos de resultado en matches
- Determina winnerId:
    Si hay penales: ganador es quien tiene más goles en penales
    Si hay prórroga: ganador es quien tiene más goles al final de la prórroga
    Si solo 90min: ganador es quien tiene más goles (grupos puede ser empate, winnerId queda null)
- Cambia matchStatus a FINISHED
- Llama a ScoringService.calculateMatch(matchId) automáticamente
- Devuelve el partido actualizado

---

Crea /backend/src/routes/matches.ts con:

GET /api/matches
  200: { matches: [...] }

GET /api/matches/phase/:phase
  200: { matches: [...] }
  400: { error: "INVALID_PHASE", message: "Fase inválida" }

GET /api/matches/group/:group
  200: { matches: [...] }

PUT /api/matches/:matchId/result  [requiere authenticateToken + requireAdmin]
  Body: { resultHome90, resultAway90, resultHomeET?, resultAwayET?, resultHomePen?, resultAwayPen? }
  200: { match: { ...partido actualizado } }
  404: { error: "MATCH_NOT_FOUND", message: "Partido no encontrado" }
  400: { error: "INVALID_RESULT", message: "Descripción del error de validación" }
```

---

## PASO 7 — PredictionService y rutas de predicciones

```
Crea /backend/src/services/PredictionService.ts con:

savePick(userId, matchId, { pickHome90, pickAway90, pickHomeET?, pickAwayET?, pickHomePen?, pickAwayPen? }):
- Verifica que el partido exista
- Verifica deadline: si match.lockedAt existe y Date.now() > match.lockedAt → throw "MATCH_LOCKED"
- Si match.scheduledAt < Date.now() y lockedAt no está seteado → throw "MATCH_LOCKED"
- Valida lógica de picks:
    Si es fase de grupos: solo pickHome90 y pickAway90 son válidos
    Si es eliminatoria y pick es empate: pickHomeET y pickAwayET son opcionales
    Si hay ET y es 0-0: pickHomePen y pickAwayPen son opcionales
- Hace upsert en predictions (crea o actualiza)
- Devuelve la predicción guardada

getMyPredictions(userId):
- Devuelve todas las predicciones del usuario con el partido incluido
- Ordenadas por match.scheduledAt ASC

getMyPredictionForMatch(userId, matchId):
- Devuelve la predicción del usuario para ese partido o null

getPreview(userId):
- Devuelve todas las predicciones del usuario agrupadas por fase:
  { GROUPS: [...], R32: [...], R16: [...], QF: [...], SF: [...], THIRD: [...], FINAL: [...] }
- Incluye la globalPrediction del usuario

---

Crea /backend/src/services/GlobalPredictionService.ts con:

saveGlobalPick(userId, { championId, runnerUpId, thirdId, fourthId }):
- Deadline: 11 junio 2026 11:00 AM UTC-5 (hora Colombia)
- Si Date.now() > deadline → throw "GLOBAL_DEADLINE_PASSED"
- Valida que los 4 equipos sean diferentes
- Hace upsert en global_predictions
- Devuelve la predicción global guardada

getMyGlobalPrediction(userId):
- Devuelve la globalPrediction del usuario con los equipos incluidos o null

---

Crea /backend/src/routes/predictions.ts con:

GET /api/predictions/me  [requiere authenticateToken]
  200: { predictions: [...] }

GET /api/predictions/preview  [requiere authenticateToken]
  200: { groups: { GROUPS: [...], R32: [...], ... }, globalPrediction: { ... } }

PUT /api/predictions/:matchId  [requiere authenticateToken]
  Body: { pickHome90, pickAway90, pickHomeET?, pickAwayET?, pickHomePen?, pickAwayPen? }
  200: { prediction: { ... } }
  400: { error: "MATCH_LOCKED", message: "Este partido ya comenzó, no puedes modificar tu pick" }
  400: { error: "VALIDATION_ERROR", message: "Descripción del error" }
  404: { error: "MATCH_NOT_FOUND", message: "Partido no encontrado" }

---

Crea /backend/src/routes/globalPredictions.ts con:

GET /api/global-predictions/me  [requiere authenticateToken]
  200: { globalPrediction: { ... } o null }

PUT /api/global-predictions  [requiere authenticateToken]
  Body: { championId, runnerUpId, thirdId, fourthId }
  200: { globalPrediction: { ... } }
  400: { error: "GLOBAL_DEADLINE_PASSED", message: "El plazo para predicciones globales ya pasó" }
  400: { error: "DUPLICATE_TEAMS", message: "No puedes elegir el mismo equipo en dos posiciones" }
```

---

## PASO 8 — ScoringService

```
Crea /backend/src/services/ScoringService.ts con:

calculateMatch(matchId):
- Obtiene el partido con su resultado real
- Obtiene todas las predictions de ese partido
- Para cada predicción, calcula puntos según estas reglas:

  FASE DE GRUPOS:
  - ptsWinner: +1 si el ganador predicho coincide con el real
    (empate predicho y empate real = +1, ganador local predicho y ganó local = +1)
  - ptsExact: +2 si el marcador exacto en 90min coincide

  FASE ELIMINATORIA (R32, R16, QF, SF, THIRD, FINAL):
  - ptsWinner: +1 si acertó quién ganó (sin importar cómo)
  - ptsExact: +2 si acertó el marcador exacto en 90min
  - ptsET: +1 si predijo que iría a prórroga (predijo empate en 90min Y el partido fue a prórroga)
  - ptsETExact: +1 si acertó el marcador exacto al final de la prórroga
  - ptsPen: +1 si predijo que iría a penales (predijo 0-0 en ET Y el partido fue a penales)
  - ptsPenExact: +2 si acertó el marcador exacto de penales

- ptsTotal = suma de todos los campos de puntos
- Actualiza cada predicción con los puntos calculados usando Prisma updateMany o update individual

calculateGlobalPredictions():
- Se llama cuando termina el torneo (cuando se ingresa resultado de FINAL y THIRD)
- Para cada globalPrediction:
  - ptsChampion: +10 si acertó el campeón
  - ptsRunnerUp: +6 si acertó el subcampeón
  - ptsThird: +4 si acertó el tercer puesto
  - ptsFourth: +2 si acertó el cuarto puesto
  - ptsTotal = suma
- Actualiza cada globalPrediction

Nota: calculateMatch se llama automáticamente desde MatchService.updateResult().
calculateGlobalPredictions se llama automáticamente cuando se ingresan los resultados de THIRD y FINAL.
```

---

## PASO 9 — BracketService y LeaderboardService

```
Crea /backend/src/services/BracketService.ts con:

resolveThirds(groupsWithThirds: string[]):
- Recibe un array con las letras de los 8 grupos cuyos terceros clasificaron, ej: ["A","B","C","D","E","F","G","H"]
- Ordena el array alfabéticamente y lo une en string: "ABCDEFGH"
- Busca en ThirdPlaceCombination donde groupsKey === "ABCDEFGH"
- Si no encuentra: throw "COMBINATION_NOT_FOUND"
- El JSON slots indica qué equipo (tercero de qué grupo) va a cada slot del bracket R32
- Actualiza los matchs de fase R32 asignando homeTeamId y awayTeamId según el resultado
- Devuelve el bracket actualizado

---

Crea /backend/src/services/LeaderboardService.ts con:

getRanking():
- Consulta todos los usuarios
- Para cada usuario suma: SUM(predictions.ptsTotal) + SUM(globalPrediction.ptsTotal)
- Devuelve array ordenado por puntos DESC con este formato:
  [{ rank: 1, userId, username, pointsTotal, pointsMatches, pointsGlobal }, ...]
- Usa una consulta SQL eficiente con Prisma groupBy o raw query

---

Agrega rutas para estos servicios:

POST /api/bracket/third-place  [requiere authenticateToken + requireAdmin]
  Body: { groups: ["A","B","C","D","E","F","G","H"] }
  200: { message: "Bracket R32 activado", matches: [...partidos R32 actualizados] }
  400: { error: "COMBINATION_NOT_FOUND", message: "Combinación de grupos no encontrada" }
  400: { error: "INVALID_GROUPS", message: "Debes enviar exactamente 8 grupos" }

GET /api/leaderboard
  200: { leaderboard: [{ rank, userId, username, pointsTotal, pointsMatches, pointsGlobal }] }
```

---

## PASO 10 — Servidor principal y testing básico

```
Crea /backend/src/server.ts que:
- Inicializa Express
- Configura cors, express.json(), dotenv
- Monta todas las rutas bajo /api:
    /api/auth → authRoutes
    /api/matches → matchRoutes
    /api/predictions → predictionRoutes
    /api/global-predictions → globalPredictionRoutes
    /api/bracket → bracketRoutes
    /api/leaderboard → leaderboardRoutes
- Middleware global de manejo de errores que captura cualquier error no manejado y devuelve:
    500: { error: "INTERNAL_ERROR", message: "Error interno del servidor" }
- Escucha en PORT del .env

---

Crea un archivo /backend/tests/scoring.test.ts con Jest que pruebe estos casos:

1. Grupo: pick 2-1, resultado 2-1 → ptsWinner=1, ptsExact=2, ptsTotal=3
2. Grupo: pick 1-0, resultado 2-0 → ptsWinner=1, ptsExact=0, ptsTotal=1
3. Grupo: pick 0-0, resultado 1-0 → ptsWinner=0, ptsExact=0, ptsTotal=0
4. Eliminatoria: pick 1-1 ET 2-1, resultado 1-1 ET 2-1 → ptsWinner=1, ptsExact=2, ptsET=1, ptsETExact=1, ptsTotal=5
5. Eliminatoria: pick 0-0 ET 0-0 PEN 4-2, resultado 0-0 ET 0-0 PEN 4-2 → ptsWinner=1, ptsExact=2, ptsET=1, ptsETExact=1, ptsPen=1, ptsPenExact=2, ptsTotal=8
6. Deadline: intentar guardar pick después del kickoff → error MATCH_LOCKED
```

---

## PASO 11 — Frontend: configuración, tipos y store

```
En /frontend/src/types/index.ts define estas interfaces TypeScript:

User { id, username, email, isAdmin }
Team { id, name, code, group?, flagUrl? }
Match { id, phase, matchday?, scheduledAt, lockedAt?, venue?, homeTeam?, awayTeam?,
        resultHome90?, resultAway90?, resultHomeET?, resultAwayET?, resultHomePen?, resultAwayPen?,
        winnerId?, matchStatus }
Prediction { id, userId, matchId, pickHome90, pickAway90, pickHomeET?, pickAwayET?,
             pickHomePen?, pickAwayPen?, ptsWinner, ptsExact, ptsET, ptsETExact, ptsPen,
             ptsPenExact, ptsTotal, match? }
GlobalPrediction { id, userId, championId?, runnerUpId?, thirdId?, fourthId?,
                   champion?, runnerUp?, third?, fourth?, ptsTotal, lockedAt? }
LeaderboardEntry { rank, userId, username, pointsTotal, pointsMatches, pointsGlobal }

---

En /frontend/src/services/api.ts:
- Crea una instancia de axios con baseURL: import.meta.env.VITE_API_URL
- Interceptor de request que adjunta el JWT del localStorage en Authorization: Bearer <token>
- Interceptor de response que si recibe 401 limpia el localStorage y redirige a /login
- Exporta funciones para cada endpoint del backend (una función por endpoint)

---

En /frontend/src/store/authStore.ts (Zustand):
Estado: { user: User | null, token: string | null, isLoading: boolean }
Acciones:
- login(email, password): llama al API, guarda user y token en store y localStorage
- register(username, email, password): igual
- logout(): limpia store y localStorage
- initFromStorage(): al cargar la app lee localStorage y restaura la sesión

En /frontend/src/store/predictionsStore.ts (Zustand):
Estado: { predictions: Prediction[], globalPrediction: GlobalPrediction | null, isLoading: boolean }
Acciones:
- fetchMyPredictions(): carga todas las predicciones del usuario
- savePick(matchId, pickData): llama al API y actualiza el store localmente
- fetchGlobalPrediction(): carga la globalPrediction
- saveGlobalPick(data): llama al API y actualiza el store
```

---

## PASO 12 — Frontend: páginas y componentes

```
Crea las siguientes páginas en /frontend/src/pages/:

1. LoginPage: formulario email + contraseña. Al hacer login guarda token y redirige a /fixture
2. RegisterPage: formulario username + email + contraseña + confirmar contraseña
3. FixturePage: muestra los 72 partidos de grupos organizados por grupo (A–L).
   Cada partido tiene:
   - Nombres y banderas de los equipos
   - Input de marcador (dos campos numéricos: local - visitante)
   - Si el partido está FINISHED: muestra resultado real y puntos ganados desglosados
   - Si lockedAt pasó: muestra el pick guardado pero los inputs están deshabilitados
   - Guarda automáticamente el pick al cambiar el input (debounce de 800ms) o al presionar un botón "Guardar"

4. GlobalPicksPage: selectores para elegir campeón, subcampeón, 3° y 4°.
   - Muestra el deadline (11 junio 2026)
   - Si el deadline pasó: muestra las selecciones guardadas pero deshabilitadas
   - Botón "Guardar picks globales"

5. BracketPage: visualización del bracket eliminatorio (R32 → Final).
   - Si el bracket no está activado: muestra mensaje "El administrador aún no ha definido los terceros clasificados"
   - Cuando está activo: muestra cada partido con inputs de marcador igual que FixturePage
   - En partidos eliminatorios: si el pick es empate en 90min aparecen inputs de prórroga
   - Si la prórroga es 0-0: aparecen inputs de penales

6. PreviewPage: resumen de todas las predicciones organizadas por fase.
   - Cada partido muestra el pick guardado
   - Botón "Editar" que lleva al partido correspondiente (si no está bloqueado)
   - Sección de picks globales al inicio

7. LeaderboardPage: tabla con columnas: Posición | Jugador | Puntos totales
   - Se actualiza al cargar la página

8. ResultsPage: igual que FixturePage pero mostrando resultados reales + puntos ganados por partido.
   Muestra desglose de puntos por criterio: Ganador (+X) | Marcador exacto (+X) | Prórroga (+X) | Penales (+X)

9. AdminPage (solo visible si isAdmin): 
   - Lista de partidos con botón "Ingresar resultado"
   - Modal para ingresar resultado: campos de 90min, prórroga (opcional), penales (opcional)
   - Formulario para definir los 8 terceros clasificados (checkboxes de grupos)

---

En /frontend/src/components/ crea estos componentes reutilizables:
- MatchCard: tarjeta de partido con inputs de marcador, nombre de equipos, estado
- ScoreInput: par de inputs numéricos (local - visitante) con validación
- TeamSelector: dropdown para seleccionar un equipo de la lista
- BracketTree: visualización del bracket estilo árbol
- Navbar: navegación con links y botón de logout
- ProtectedRoute: wrapper que redirige a /login si no hay sesión

---

Configura React Router en /frontend/src/App.tsx con estas rutas:
/ → redirige a /fixture
/login → LoginPage (pública)
/register → RegisterPage (pública)
/fixture → FixturePage (protegida)
/bracket → BracketPage (protegida)
/global-picks → GlobalPicksPage (protegida)
/preview → PreviewPage (protegida)
/leaderboard → LeaderboardPage (protegida)
/results → ResultsPage (protegida)
/admin → AdminPage (protegida + solo admin)
```

---

## PASO 13 — Variables de entorno y despliegue

```
Configura el proyecto para despliegue en Render + Vercel:

BACKEND en Render (Web Service):
- Crea /backend/Dockerfile o usa el buildpack de Node.js de Render
- El comando de build es: npm install && npx prisma generate && npm run build
- El comando de start es: npx prisma migrate deploy && node dist/server.js
- Variables de entorno en Render:
    DATABASE_URL → URL de PostgreSQL de Render
    JWT_SECRET → string aleatorio seguro
    JWT_EXPIRES_IN → 7d
    PORT → 3000

BASE DE DATOS en Render:
- PostgreSQL plan gratuito
- Ejecutar seed inicial después del primer deploy: npx ts-node prisma/seed.ts

FRONTEND en Vercel:
- Framework preset: Vite
- Build command: npm run build
- Output directory: dist
- Variable de entorno:
    VITE_API_URL → URL del backend en Render (ej: https://polla-mundial.onrender.com)

Crea un archivo /README.md con:
1. Instrucciones para correr el proyecto en local
2. Pasos para hacer el primer despliegue
3. Cómo ejecutar el seed
4. Cómo crear el primer usuario admin (instrucción SQL directa en la BD)
```

---

## Reglas generales para la IA que implemente este sistema

1. Sigue los pasos en orden. No implementes el frontend antes de tener el backend funcionando.
2. Cada paso debe compilar sin errores antes de pasar al siguiente.
3. Todos los errores del backend siguen el formato: `{ "error": "CODIGO", "message": "descripción" }` con el código HTTP correspondiente.
4. El frontend bloquea la UI cuando un partido está bloqueado, pero el backend también valida — ambas capas son necesarias.
5. Los picks se pueden modificar libremente hasta el kickoff de cada partido.
6. `ScoringService.calculateMatch()` siempre se llama automáticamente desde `MatchService.updateResult()` — nunca de forma manual.
7. El leaderboard se calcula con `SUM()` sobre `predictions.ptsTotal` y `globalPrediction.ptsTotal` — no hay tabla de scores separada.
8. Los 104 partidos (incluyendo los 32 eliminatorios con equipos null) se crean en el seed inicial.
9. Los puntos por partido se guardan desglosados en predictions para poder mostrarlos al usuario.
10. Usa upsert en todas las operaciones de guardar picks — nunca crees duplicados.
