# INFINITE RACE — Sistema de control de cursa (Backyard Ultra)

Aplicació completa per substituir l'Excel de control de cursa: gestió de corredors,
control de voltes en directe, cronòmetre fiable, classificacions, estadístiques i
un sistema de gràfics broadcast per a vMix, tot connectat en temps real.

## Posada en marxa

Requisits: Node.js 18+ (funciona amb qualsevol versió recent de Node — Windows, Mac o Linux —
ja que **no depèn de cap mòdul natiu** que calgui compilar; la base de dades és un fitxer
JSON local gestionat pel propi Node, així `npm install` sempre és ràpid i sense sorpreses).

```bash
npm install
npm run dev
```

Obre http://localhost:3000 — aquest és el dashboard de l'organitzador.
La base de dades (SQLite) es crea automàticament a `data/race.db` la primera vegada.

Per a producció:

```bash
npm run build
npm start
```

## Primers passos

1. Vés a **Importar** i puja el teu Excel (`2026 INFINITE RACE VAL D'ARAN.xlsx` o similar),
   revisa la previsualització i confirma. O bé, si no tens l'Excel a mà, clica
   "Carregar 10H + 10D demo" al Dashboard per provar tot el sistema amb dades fictícies.
2. Vés a **Configuració** i ajusta la durada de volta, distància, desnivell i llindars
   d'alerta del cronòmetre.
3. Torna al **Dashboard** i prem **START**.
4. Utilitza **Control de Volta** com a pantalla principal durant la cursa: un botó gran
   per corredor per marcar "VOLTA COMPLETADA".
5. Configura els overlays a **Broadcast** (control) i afegeix'ls a vMix com a Browser Input.

## Pàgines

- `/` — Dashboard principal (cronòmetre, estat, accions, taula de corredors)
- `/control` — Pantalla ràpida de control de volta (només actius)
- `/runners` — Gestió CRUD de corredors
- `/leaderboard` — Classificacions general / homes / dones
- `/stats` — Estadístiques i gràfics
- `/import` — Assistent d'importació/exportació Excel
- `/config` — Configuració de la cursa
- `/broadcast-control` — Selecció de l'overlay actiu + cerca de corredor + simulador demo

## Overlays per a vMix (1920×1080)

Afegeix'ls com a **Browser Input** a vMix (Add Input → Web Browser):

- `/broadcast` — mostra l'overlay que triïs des de `/broadcast-control` (recomanat: un únic
  Browser Input que es reprograma en directe sense haver de canviar URL a vMix)
- `/broadcast/leaderboard?view=general|men|women`
- `/broadcast/eliminated`
- `/broadcast/leader`
- `/broadcast/individual` — mostra el corredor seleccionat des del panell de control
- `/broadcast/timer` — cronòmetre gran, sincronitzat exactament amb el dashboard
- `/broadcast/ticker` — només el ticker inferior, per a un Browser Input separat

Paràmetres opcionals:
- `?transparent=1` — fons transparent (per sobreposar sobre vídeo)
- `?ticker=0` — amaga el ticker inferior d'aquest overlay concret

## Arquitectura

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Base de dades**: fitxer JSON local (`data/race.json`), llegit/escrit amb `fs` de Node —
  sense dependències natives ni compilació (evita problemes d'instal·lació a Windows/Mac
  amb Python/Visual Studio Build Tools que donen mòduls com `better-sqlite3`)
- **Temps real**: Socket.IO sobre un servidor Node personalitzat (`server.js`)
- **Cronòmetre fiable**: basat en timestamps reals (`current_lap_ends_at` a la base de
  dades), no en `setInterval` — tots els clients calculen el temps restant fent
  `ends_at - Date.now()`, així que sobreviu a refrescos de pàgina i mai es desincronitza.
  Un tick del servidor (`/api/internal/tick`, cada segon) comprova si la volta ha
  vençut i l'avança automàticament aplicant les regles d'eliminació configurades.
- **Importació Excel**: detecció intel·ligent de columnes per alies (dorsal/bib,
  corredor/nom, apellidos/cognoms, género/gènere, etc.), amb previsualització abans
  de confirmar i detecció de duplicats/actualitzacions.
- **Auditoria**: totes les accions importants (voltes, eliminacions, pauses, imports...)
  queden registrades a la taula `events`.

## Estructura de la base de dades

- `race` — estat de la cursa (singleton), volta actual, cronòmetre, configuració
- `runners` — corredors i el seu estat/voltes/km/desnivell
- `laps` — historial de cada volta completada (per calcular temps de volta, millor volta...)
- `events` — auditoria de totes les accions
- `broadcast_state` — quin overlay està actiu i si el ticker està activat

## Decisions preses (sense bloquejar-me en detalls menors)

- El "gènere" es normalitza a `M`/`F` internament, mostrant HOME/DONA a la UI.
- Els botons destructius (eliminar corredor, reset de cursa, end race) requereixen
  un segon clic de confirmació en 3 segons, en lloc d'un modal, per mantenir la UI
  ràpida durant la cursa.
- Marcar "volta completada" dues vegades seguides no duplica la volta (protecció
  contra doble clic): un cop l'estat passa a `LAP_COMPLETED`, cal "desfer" abans de
  tornar-la a marcar.
- Quan s'avança de volta, els corredors que encara estaven `ACTIVE` (no havien
  completat) s'eliminen/retiren automàticament segons la regla triada a Configuració.
