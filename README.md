# 🍸 IBar — PWA Restaurants & Hébergements

Application mobile-first Progressive Web App (PWA) pour gérer vos restaurants et hébergements favoris.

## 📋 Table des matières

- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Démarrage rapide](#démarrage-rapide)
- [Installation](#installation)
- [Configuration](#configuration)
- [Base de données](#base-de-données)
- [Accès](#accès)
- [Services systemd](#services-systemd)
- [Scripts utilitaires](#scripts-utilitaires)
- [Démarrage manuel](#démarrage-manuel-sans-systemd)
- [API](#api)
- [Fonctionnalités](#fonctionnalités)
- [Dépannage](#dépannage)

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
| Supervision | systemd |

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
│   ├── uploads/           # Photos (runtime, git-ignoré)
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
│   ├── install.sh         # Installation complète + systemd
│   ├── start.sh           # Démarrage (systemd ou manuel)
│   ├── start-adminer.sh   # Démarrage Adminer seul
│   ├── stop.sh            # Arrêt (systemd ou manuel)
│   ├── backup.sh          # Sauvegarde DB + uploads
│   ├── restore.sh         # Restauration DB
│   └── export-csv.sh      # Export CSV
├── adminer/               # Interface admin DB (runtime)
├── logs/                  # Logs serveur (runtime, git-ignoré)
└── .env                   # Configuration (à créer depuis .env.example)
```

---

## Démarrage rapide

> Pour un environnement Ubuntu/Debian avec accès `sudo`, le script `install.sh` automatise tout.
> Pour un démarrage manuel (développement local ou autre OS), suivez la section [Installation](#installation).

```bash
git clone https://github.com/Maxymou/iBar.git
cd iBar
cp .env.example .env
# Éditer .env avec vos valeurs (DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET sont obligatoires)
npm run setup       # télécharge adminer.php et configure les permissions
npm run install:all
npm run build
npm start
```

---

## Installation

### Prérequis

| Outil | Version minimale | Notes |
|-------|-----------------|-------|
| **Node.js** | 18 LTS | Recommandé : 20.x LTS |
| **npm** | 9 | Inclus avec Node.js 18+ |
| **PostgreSQL** | 14 | Recommandé : 16.x |
| **Git** | 2.x | Pour cloner le dépôt |
| **OS** | Ubuntu 20.04+ / Debian 11+ | Pour l'installation via `install.sh` |

> **Installation automatisée (Ubuntu/Debian) :** le script `scripts/install.sh` installe
> Node.js 20.x, PostgreSQL 16 et PHP CLI automatiquement si absents.

Via `install.sh`, les dépendances suivantes sont également installées automatiquement :
- `curl`, `git`, `lsb-release`, `ca-certificates`, `gnupg`
- `build-essential`, `python3-minimal` (compilation de modules natifs npm)
- PHP CLI + extensions `pgsql` et `mbstring` (pour Adminer)

**Compatibilité Ubuntu 24.04.4 LTS :** toutes les dépendances sont compatibles. PostgreSQL 16 et PHP 8.3 (versions par défaut) fonctionnent correctement avec l'application.

### Étape 1 — Cloner le dépôt

```bash
git clone <url-du-depot> iBar
cd iBar
```

### Étape 2 — Configurer l'environnement

```bash
cp .env.example .env
nano .env
```

Variables **obligatoires** à modifier :

```env
DB_PASSWORD=votre_mot_de_passe_fort
JWT_SECRET=<sortie de : openssl rand -hex 32>
JWT_REFRESH_SECRET=<sortie de : openssl rand -hex 32>
```

> **Important :** le script d'installation valide ces variables et refuse les valeurs placeholder (`changeme`, etc.) ainsi que les secrets JWT inférieurs à 32 caractères. Il s'arrête automatiquement si `.env` vient d'être créé depuis le template.

> **Caractères spéciaux dans les valeurs :** si un mot de passe ou un secret contient `#`, entourez la valeur de guillemets doubles dans `.env` :
> ```env
> DB_PASSWORD="mon#mot$de#passe"
> ```
> Sans guillemets, tout ce qui suit `#` est interprété comme un commentaire (comportement systemd `EnvironmentFile`).

### Étape 3 — Lancer l'installation

> **Important** : si vous n'utilisez pas `install.sh` (installation manuelle), exécutez
> `npm run setup` avant `npm start`. Cette commande télécharge Adminer (interface
> d'administration DB) et configure les permissions nécessaires. Elle est requise
> uniquement à la première installation et lors des mises à jour majeures d'Adminer.

```bash
bash scripts/install.sh
```

Le script est **idempotent** (ré-exécutable sans danger). Il effectue dans l'ordre :

1. Détection Ubuntu/Debian
2. Installation des outils de base (`curl`, `git`) si absents
3. Installation de Node.js 20.x si absent ou version < 18
4. Installation et démarrage de PostgreSQL si absent
5. Installation de PHP CLI si absent
6. Validation du `.env` (variables critiques, placeholders, longueur JWT)
7. Création de l'utilisateur et de la base PostgreSQL
8. Application du schéma SQL + attribution des permissions à l'utilisateur app
9. Installation des paquets système (`build-essential`, `python3-minimal`, etc.)
10. Installation des dépendances npm backend (`--omit=dev` — production uniquement)
11. Installation des dépendances npm frontend (`--include=dev` — outils de build inclus) + compilation Vite + vérification de `dist/index.html`
12. Création des répertoires runtime (`logs/`, `backend/uploads/`)
13. Téléchargement d'Adminer v4.8.1 (3 tentatives avec retry)
14. Création et activation des services systemd `ibar` et `ibar-adminer`
15. Démarrage des services
16. Vérifications post-installation (PostgreSQL, backend `/api/health` sur `:8000`, Adminer sur `:9000`)
17. Affichage du résumé avec les URLs

### Dépannage de l'installation

```bash
# Voir les logs systemd du backend
sudo journalctl -u ibar -n 50 --no-pager

# Voir les logs systemd Adminer
sudo journalctl -u ibar-adminer -n 20 --no-pager

# Vérifier le statut des services
sudo systemctl status ibar ibar-adminer

# Relancer l'installation (idempotent)
bash scripts/install.sh
```

**Pare-feu (UFW) :** si UFW est actif, ouvrez les ports manuellement :
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 9000/tcp
```

---

## Configuration

### Étapes de configuration

1. **Copier le fichier template :**
   ```bash
   cp .env.example .env
   ```

2. **Remplir les variables obligatoires** (le serveur refusera de démarrer sans elles) :
   ```bash
   nano .env  # ou vim, code, etc.
   ```

3. **Variables obligatoires à modifier :**
   ```env
   DB_PASSWORD=votre_mot_de_passe_fort
   JWT_SECRET=$(openssl rand -hex 32)
   JWT_REFRESH_SECRET=$(openssl rand -hex 32)
   ```

4. **Vérifier** que `FRONTEND_URL` correspond à l'URL publique du serveur en production.

### Variables d'environnement

| Variable | Description | Défaut | Obligatoire |
|----------|-------------|--------|-------------|
| `NODE_ENV` | Environnement Node.js | `production` | Non |
| `PORT` | Port du backend | `8000` | Non |
| `DB_HOST` | Hôte PostgreSQL | `localhost` | Non |
| `DB_PORT` | Port PostgreSQL | `5432` | Non |
| `DB_NAME` | Nom de la base de données | `ibar` | Non |
| `DB_USER` | Utilisateur PostgreSQL | `ibar_user` | Non |
| `DB_PASSWORD` | Mot de passe PostgreSQL | — | **Oui** |
| `JWT_SECRET` | Secret access token (32+ chars) | — | **Oui** |
| `JWT_REFRESH_SECRET` | Secret refresh token (32+ chars) | — | **Oui** |
| `JWT_EXPIRES_IN` | Durée de validité access token | `15m` | Non |
| `JWT_REFRESH_EXPIRES_IN` | Durée de validité refresh token | `7d` | Non |
| `UPLOAD_DIR` | Répertoire des photos | `./uploads` | Non |
| `MAX_FILE_SIZE` | Taille max image (bytes) | `10485760` (10 Mo) | Non |
| `FRONTEND_URL` | URL frontend pour CORS | `http://localhost:8000` | Non |
| `ADMINER_PORT` | Port Adminer | `9000` | Non |
| `EXPORT_EMAIL` | Email du compte pour `export-csv.sh` | — | Non |
| `EXPORT_PASSWORD` | Mot de passe du compte pour `export-csv.sh` | — | Non |

**Générer des secrets JWT :**

```bash
openssl rand -hex 32
```

**Note `FRONTEND_URL` :** en production, remplacez `localhost` par l'IP ou le domaine de votre serveur (ex. `http://192.168.1.100:8000`). Cette valeur contrôle la politique CORS du backend.

---

## Base de données

### Création manuelle de la base de données

Si vous n'utilisez pas `scripts/install.sh`, configurez PostgreSQL manuellement :

```bash
# Se connecter à PostgreSQL en tant que superutilisateur
sudo -u postgres psql

# Dans le shell psql :
CREATE USER ibar_user WITH PASSWORD 'votre_mot_de_passe_fort';
CREATE DATABASE ibar OWNER ibar_user ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE ibar TO ibar_user;
\q
```

### Appliquer le schéma SQL

```bash
sudo -u postgres psql -d ibar -f database/schema.sql
# Ou avec l'utilisateur applicatif :
psql -h localhost -U ibar_user -d ibar -f database/schema.sql
```

### Vérifier la connexion

```bash
psql -h localhost -U ibar_user -d ibar -c "SELECT version();"
```

---

## Accès

| Service | URL |
|---------|-----|
| Application | `http://SERVER_IP:8000` |
| API | `http://SERVER_IP:8000/api` |
| Health check | `http://SERVER_IP:8000/api/health` |
| Adminer (DB admin) | `http://SERVER_IP:9000` |

### Connexion IBar Admin (Adminer)

L'interface est pré-configurée depuis `.env` : le serveur, l'utilisateur et la base de données sont remplis automatiquement.

Saisissez uniquement le **mot de passe** (valeur `DB_PASSWORD` dans `.env`).

---

## Services systemd

L'installation crée et active automatiquement deux services :

| Service | Rôle | Port |
|---------|------|------|
| `ibar` | Backend Node.js + frontend statique | 8000 |
| `ibar-adminer` | Interface Adminer PHP | 9000 |

Les services **démarrent automatiquement au boot** du serveur (`WantedBy=multi-user.target`).

### Statut des services

```bash
sudo systemctl status ibar
sudo systemctl status ibar-adminer
```

### Démarrer / Arrêter / Redémarrer

```bash
# Via les scripts du projet (détection automatique de systemd)
bash scripts/start.sh
bash scripts/stop.sh

# Directement avec systemctl
sudo systemctl start ibar ibar-adminer
sudo systemctl stop ibar ibar-adminer
sudo systemctl restart ibar
sudo systemctl restart ibar-adminer
```

### Consulter les logs

```bash
# Flux de logs en temps réel
sudo journalctl -u ibar -f
sudo journalctl -u ibar-adminer -f

# Dernières 100 lignes
sudo journalctl -u ibar -n 100

# Depuis le démarrage du service
sudo journalctl -u ibar --since "today"

# Fichiers de log directs
tail -f logs/backend.log
tail -f logs/adminer.log
```

### Mettre à jour l'application

```bash
git pull
bash scripts/install.sh
```

Le script est idempotent : il reconstruit le frontend, réinstalle les dépendances et redémarre les services sans toucher à la base de données si elle existe déjà.

---

## Scripts utilitaires

### Sauvegarde

```bash
bash scripts/backup.sh
```

Crée dans `backups/` :
- `ibar_backup_YYYYMMDD_HHMMSS.sql` — dump PostgreSQL complet
- `uploads_YYYYMMDD_HHMMSS.tar.gz` — archive des photos uploadées

Les 10 dernières sauvegardes de chaque type sont conservées automatiquement.

### Restauration

```bash
bash scripts/restore.sh backups/ibar_backup_20250101_120000.sql
```

> ⚠️ Opération destructive — une confirmation explicite est demandée avant l'écrasement de la base.

### Export CSV

```bash
bash scripts/export-csv.sh
```

Nécessite `EXPORT_EMAIL` et `EXPORT_PASSWORD` dans `.env` (compte utilisateur IBar existant).

Génère dans `exports/` :
- `restaurants_YYYYMMDD_HHMMSS.csv`
- `hebergements_YYYYMMDD_HHMMSS.csv`

---

## Démarrage manuel (sans systemd)

Pour les environnements sans systemd (développement local, CI) :

```bash
# À la première installation uniquement — télécharge adminer.php
npm run setup

# Démarrage manuel (nohup)
bash scripts/start.sh

# Arrêt manuel (via PID files)
bash scripts/stop.sh

# Adminer seul
bash scripts/start-adminer.sh
```

**Mode développement :**

```bash
# Terminal 1 — Backend avec hot reload (nodemon)
cd backend && npm run dev

# Terminal 2 — Frontend avec HMR (Vite dev server, port 5173)
cd frontend && npm run dev
```

En mode développement, le frontend proxie automatiquement les requêtes `/api` et `/uploads` vers `http://localhost:8000`.

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

### Monitoring

```
GET /api/health    → { "status": "ok", "uptime": <secondes> }
```

---

## Fonctionnalités

### Authentification
- Inscription avec nom, email, mot de passe
- Connexion / déconnexion
- Changement de mot de passe
- Modification du profil + photo de profil
- JWT avec refresh token automatique

### Restaurants
- Ajout, modification, suppression (soft delete / archivage)
- Photo (capture caméra ou galerie)
- Champs : nom, téléphone, adresse, bar (toggle), cuisine, note (★), commentaire, date de visite
- Géolocalisation GPS
- Vue liste avec recherche plein texte
- Vue carte interactive (Leaflet + OpenStreetMap)
- Tri par note / distance / date
- Appel direct (popup de confirmation)
- Navigation externe : Waze, Google Maps, Plans Apple (auto-détection iOS)

### Hébergements
- Même architecture que les restaurants
- Champs spécifiques : prix/nuit, nombre de chambres, Wi-Fi, parking

### Mode hors ligne (PWA)
- Cache des ressources statiques via Service Worker
- Données mises en cache dans IndexedDB
- Affichage des données en cache en l'absence de connexion

### Export et sauvegarde
- Export CSV restaurants / hébergements
- Sauvegarde et restauration complète de la base de données

---

## Dépannage

### Page blanche depuis une IP réseau (ex: 192.168.1.30)

Si vous accédez à l'application depuis une autre machine et que la console du navigateur
affiche des erreurs CORS, ajoutez votre IP dans `.env` :

```env
ALLOWED_ORIGINS=http://192.168.1.30:8000
```

Plusieurs IPs séparées par des virgules sont supportées :

```env
ALLOWED_ORIGINS=http://192.168.1.30:8000,http://mon-serveur.com
```

Puis redémarrez :

```bash
pkill -f "node server.js" && npm start
```

`http://localhost:8000` et `http://127.0.0.1:8000` sont toujours autorisées par défaut.

### Le port est déjà utilisé (`EADDRINUSE`)

```
Port 8000 already in use. Please stop the existing process.
```

```bash
# Trouver le processus utilisant le port 8000
sudo lsof -i :8000
# Ou via fuser :
sudo fuser 8000/tcp
# Arrêter le service systemd si applicable :
sudo systemctl stop ibar
```

### La base de données est inaccessible

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql
sudo systemctl start postgresql

# Tester la connexion manuellement
psql -h localhost -U ibar_user -d ibar
```

### Le frontend ne s'affiche pas (404 sur `/`)

Le dossier `frontend/dist/` est absent — le build n'a pas été exécuté.

```bash
cd frontend && npm install && npm run build
# Ou depuis la racine :
npm run build
```

### `npm audit` signale des vulnérabilités

```bash
# Frontend
cd frontend && npm audit

# Backend
cd backend && npm audit
```

Consultez les sections [mise à jour frontend](#4-vulnérabilités-de-sécurité-dans-le-frontend) et backend pour les versions corrigées.

### Adminer ne répond pas (port 9000)

```bash
# Vérifier le service
sudo systemctl status ibar-adminer
sudo journalctl -u ibar-adminer -n 30 --no-pager

# Vérifier que adminer.php est présent
ls -la adminer/adminer.php

# Télécharger manuellement si absent
curl -fsSL -o adminer/adminer.php \
  "https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php"

# Relancer le service
sudo systemctl restart ibar-adminer
```

### Erreur JWT (`JsonWebTokenError: invalid signature`)

Les secrets JWT ont changé depuis la dernière session. Les tokens existants sont invalidés — reconnectez-vous.

### Les images ne s'affichent pas

Vérifier que `backend/uploads/` existe et est accessible en écriture :

```bash
ls -la backend/uploads/
# Si absent :
mkdir -p backend/uploads/
```

### Variables `.env` non prises en compte

Après modification de `.env`, redémarrer le backend :

```bash
sudo systemctl restart ibar
# Ou en mode manuel :
cd backend && npm start
```
