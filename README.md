# 🍸 IBar — PWA Restaurants & Hébergements

Application mobile-first Progressive Web App (PWA) pour gérer vos restaurants et hébergements favoris.

## 📋 Table des matières

- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [Accès](#accès)
- [Fonctionnalités](#fonctionnalités)
- [API](#api)
- [Scripts utilitaires](#scripts-utilitaires)

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18, Vite, TailwindCSS, Leaflet |
| Backend | Node.js, Express.js |
| Base de données | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Images | Stockage local filesystem |
| PWA | Service Worker, IndexedDB |
| DB Admin | Adminer (PHP) |

---

## Structure du projet

```
iBar/
├── backend/
│   ├── controllers/       # Logique métier
│   ├── middleware/        # Auth, upload
│   ├── models/            # Connexion DB
│   ├── routes/            # Routes API
│   ├── services/          # Image, export
│   ├── uploads/           # Photos (runtime)
│   └── server.js
├── frontend/
│   ├── public/
│   │   ├── icons/         # PWA icons
│   │   └── manifest.json
│   └── src/
│       ├── components/
│       │   ├── accommodations/
│       │   ├── map/
│       │   ├── restaurants/
│       │   ├── ui/
│       │   └── user/
│       ├── hooks/
│       ├── services/      # API client, offline
│       ├── store/         # AuthContext
│       └── utils/
├── database/
│   └── schema.sql         # Schéma PostgreSQL
├── scripts/
│   ├── install.sh         # Installation complète
│   ├── start.sh           # Démarrage
│   ├── stop.sh            # Arrêt
│   ├── backup.sh          # Sauvegarde DB
│   ├── restore.sh         # Restauration DB
│   └── export-csv.sh      # Export CSV
├── adminer/               # Interface admin DB (runtime)
├── logs/                  # Logs serveur (runtime)
└── .env                   # Configuration (à créer)
```

---

## Installation

### Prérequis

- Ubuntu Server
- Node.js 18+ (installé automatiquement si absent)
- PostgreSQL (installé automatiquement si absent)
- PHP CLI (installé automatiquement si absent, pour Adminer)

### Étape 1 — Configurer l'environnement

```bash
cp .env.example .env
nano .env
```

Variables importantes à modifier :

```env
DB_PASSWORD=votre_mot_de_passe_fort
JWT_SECRET=votre_secret_jwt_32_chars_minimum
JWT_REFRESH_SECRET=votre_secret_refresh_32_chars
```

### Étape 2 — Lancer l'installation

```bash
bash scripts/install.sh
```

Ce script va :
1. Installer Node.js / PostgreSQL / PHP si nécessaire
2. Créer l'utilisateur et la base de données PostgreSQL
3. Appliquer le schéma SQL
4. Installer les dépendances npm
5. Compiler le frontend
6. Télécharger Adminer

---

## Démarrage

```bash
bash scripts/start.sh
```

Pour arrêter :

```bash
bash scripts/stop.sh
```

### Démarrage manuel

```bash
# Backend + frontend (production)
cd backend && npm start

# Adminer séparé
bash scripts/start-adminer.sh
```

### Démarrage en développement

```bash
# Terminal 1 — Backend avec hot reload
cd backend && npm run dev

# Terminal 2 — Frontend avec HMR
cd frontend && npm run dev
```

---

## Accès

| Service | URL |
|---------|-----|
| Application | `http://SERVER_IP:8000` |
| API | `http://SERVER_IP:8000/api` |
| Adminer (DB) | `http://SERVER_IP:9000` |

### Connexion IBar Admin

L'interface admin est pré-configurée : le serveur, l'utilisateur et la base de données sont remplis automatiquement depuis le `.env`.

Il suffit d'entrer le **mot de passe** (valeur `DB_PASSWORD` dans `.env`).

---

## Fonctionnalités

### Authentification
- Inscription avec nom, email, mot de passe
- Connexion / déconnexion
- Changement de mot de passe
- Modification du profil + photo de profil
- JWT avec refresh token automatique

### Restaurants
- Ajout, modification, suppression (soft delete)
- Photo (capture caméra ou galerie)
- Champs : nom, téléphone, adresse, bar (toggle), cuisine, note (★), commentaire, date visite
- Géolocalisation GPS
- Vue liste avec recherche
- Vue carte Leaflet + OpenStreetMap
- Tri par note / distance / date
- Appel direct (popup confirmation)
- Navigation : Waze, Google Maps, Plans Apple (auto-détection iOS)

### Hébergements
- Même architecture que les restaurants
- Champs spécifiques : prix/nuit, nb chambres, Wi-Fi, parking

### Mode hors ligne
- Cache des données via Service Worker
- Stockage IndexedDB
- Affichage des données en cache si hors ligne

### Export
- Export CSV restaurants / hébergements
- Sauvegarde / restauration de la base de données

---

## API

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/change-password
GET  /api/auth/me
```

### Restaurants
```
GET    /api/restaurants?search=&sort=recent|rating|distance&lat=&lng=
GET    /api/restaurants/:id
POST   /api/restaurants          (multipart/form-data)
PUT    /api/restaurants/:id      (multipart/form-data)
DELETE /api/restaurants/:id
```

### Hébergements
```
GET    /api/accommodations?search=&sort=recent|rating|distance&lat=&lng=
GET    /api/accommodations/:id
POST   /api/accommodations
PUT    /api/accommodations/:id
DELETE /api/accommodations/:id
```

### Export
```
GET /api/export/restaurants     → CSV
GET /api/export/accommodations  → CSV
```

---

## Scripts utilitaires

```bash
# Sauvegarde DB + uploads
bash scripts/backup.sh

# Restauration depuis sauvegarde
bash scripts/restore.sh backups/ibar_backup_20241201_120000.sql

# Export CSV (nécessite EXPORT_EMAIL + EXPORT_PASSWORD dans .env)
bash scripts/export-csv.sh
```

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du backend | `8000` |
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `ibar` |
| `DB_USER` | Utilisateur DB | `ibar_user` |
| `DB_PASSWORD` | Mot de passe DB | — |
| `JWT_SECRET` | Secret JWT (32+ chars) | — |
| `JWT_REFRESH_SECRET` | Secret refresh JWT | — |
| `JWT_EXPIRES_IN` | Durée access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durée refresh token | `7d` |
| `UPLOAD_DIR` | Répertoire uploads | `./uploads` |
| `MAX_FILE_SIZE` | Taille max image (bytes) | `10485760` |
| `ADMINER_PORT` | Port Adminer | `9000` |
