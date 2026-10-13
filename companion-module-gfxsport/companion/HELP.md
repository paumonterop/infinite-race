# GFX SPORT

Opera la **consola de broadcast** de GFX SPORT (escenes del trail) des de Companion i un Stream Deck. Tot el que fa aquest mòdul és el mateix que fa el botó «Posa en antena» de la web: les escenes surten per la sortida de vMix/OBS (`/broadcast/trail/<id>`).

## Configuració

| Camp | Valor |
| --- | --- |
| Servidor | IP del servidor de GFX SPORT (p. ex. `192.168.100.50`) |
| Port | `3000` (o `10009`, és el mateix servei) |
| Usuari / Contrasenya | els de la plataforma (només cal per **posar o treure** escenes; la lectura de l'estat no en demana) |
| Id de l'esdeveniment | buit = el primer esdeveniment trail. Si en tens diversos, copia l'id de la URL `/events/<id>` |

L'estat es llegeix cada segon: els botons s'il·luminen en **vermell** quan la seva escena és en antena, encara que l'hagi posat algú altre des de la web.

## Presets (141 amb tres curses)

Es creen sols a partir de l'esdeveniment (curses, controls, segments i persones). Arrossega'ls des de la pestanya **Presets** de Companion. Si canvien les curses o les persones, els presets es regeneren sols.

| Categoria | Botons |
| --- | --- |
| **0 · Control** | Ticker de passos · Neteja-ho tot · Treu cada zona (centre, inferior, cronòmetre, posició, top 5, dials) · Sincronitza LiveTrail · Importa inscrits · Estat |
| **1 · Presentació** | Presentació de cada cursa (títol + perfil) |
| **2 · Cursa** | Fitxa tècnica · Pujada més dura · Gran baixada · Superfícies · Meteo · Estadístiques (per cursa) |
| **3 · Classificació** | Classificació · Top 5 petit · Top 10 favorits (homes/dones × cursa) |
| **4 · Posició** | 1r…5è × Home/Dona, una pàgina per cursa (etiqueta «1r HOME · El Putu Trail») |
| **5 · Històric** | Rècord · Guanyadors per edició |
| **6 · Segments** | Info i perfil per pendents de cada tram entre controls |
| **7 · Cronòmetres** | Un per cursa + els tres alhora |
| **8 · Motxilles** | Velocitat i pendent de la motxilla que té vMix en programa (automàtic) |
| **9 · Atletes** | Teclat de dorsal 0-9 + ⌫ + C · Chyron i Fitxa de corredor (per cursa) amb el dorsal del teclat |
| **10 · Altres** | Un botó per cada persona de la llista (Albert Jorquera · Comentarista…) |

Tots els botons d'escena són **alterns**: si l'escena ja és en antena, tornar-lo a prémer la treu. Posar una escena substitueix només la de la seva **zona**: es poden tenir alhora una classificació (centre), un cronòmetre, una etiqueta de posició, un chyron i els dials.

### Chyron i fitxa de corredor
Sempre amb un dorsal triat a mà (mai automàtic): escriu el dorsal amb el **teclat** (la tecla «DORSAL» el mostra) i prem **Chyron** o **Fitxa** de la cursa. També pots posar un dorsal fix a l'acció (camp «Dorsal») o `@sel` per usar el del teclat.

### Motxilles
«Velocitat» i «Pendent» en automàtic segueixen l'input que vMix té en programa (cal configurar la IP de vMix i el mapa input↔motxilla a Configuració de la plataforma). Si l'input no és cap motxilla, no surt res.

## Proposta de pàgines per a un Stream Deck de 15 tecles

* **Pàgina 1 — Programa en directe:** Presentació ×3 · Classificació Homes ×3 (Putu, Mitja, Curta) · Cronòmetres (les 3) · Ticker · Neteja-ho tot · Estat…
* **Pàgina 2 — Posicions d'una cursa:** 1r…5è Home (fila 1), 1r…5è Dona (fila 2), Top 5 petit Home / Dona, Treu posició, Treu top 5.
* **Pàgina 3 — Atletes:** teclat 0-9, ⌫, C, Dorsal, Chyron, Fitxa, Albert Jorquera.
* **Pàgina 4 — Cursa:** Fitxa tècnica, Pujada, Baixada, Superfícies, Meteo, Estadístiques, Rècord, Guanyadors.

Amb un Stream Deck XL (32 tecles) caben dues d'aquestes pàgines juntes.

## Accions disponibles
Posa una escena en antena · Escena en antena / treure (alterna) · Treu la zona · Neteja totes les escenes · Ticker de passos · Sincronitza amb LiveTrail · Teclat de dorsal (xifra, esborra, buida, fixa).

## Feedbacks
L'escena és en antena · Hi ha alguna escena en una zona · Ticker en antena · Connectat.

## Variables
`$(instància:slot_main)`, `slot_lower`, `slot_chrono`, `slot_tag`, `slot_mini`, `slot_gauge_speed`, `slot_gauge_gradient` (què hi ha en antena a cada zona), `ticker`, `layers_count`, `bib_sel`, `vmix_device`, `vmix_bib`, `vmix_runner`, `vmix_input`, `event_name`, `connected`, `status_text`.
