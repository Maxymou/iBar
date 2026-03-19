# iBar — Déploiement Docker

Guide complet pour déployer iBar avec Docker et Docker Compose.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Docker Compose                                 │
│                                                 │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐  │
│  │    app    │  │  postgres  │  │  adminer  │  │
│  │  Node.js  │  │  16-alpine │  │  latest   │  │
│  │  :8000    │  │  :5432     │  │  :9000    │  │
│  └─────┬─────┘  └──────┬─────┘  └───────────┘  │
│        │               │                        │
│   [uploads]       [pgdata]                      │
│    volume          volume                       │
└─────────────────────────────────────────────────┘
```

- **app** : Backend Node.js/Express + frontend React buildé (port 8000)
- **postgres** : Base de données PostgreSQL (port interne 5432)
- **adminer** : Interface d'administration de la base (port 9000)

## Prérequis

- Docker Engine 20.10+
- Docker Compose V2 (`docker compose` — sans tiret)
- 1 Go de RAM minimum
- Ports 8000 et 9000 disponibles

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/Maxymou/iBar.git
cd iBar

# 2. Configurer l'environnement
cp .env.docker.example .env

# 3. Modifier les valeurs sensibles dans .env
#    - DB_PASSWORD : mot de passe PostgreSQL
#    - JWT_SECRET : secret JWT (openssl rand -hex 32)
#    - JWT_REFRESH_SECRET : secret refresh JWT (openssl rand -hex 32)
#    - FRONTEND_URL : URL publique (ex: http://192.168.1.100:8000)

# 4. Lancer l'application
docker compose up -d --build
```

L'application est accessible sur :
- **Application** : `http://<IP>:8000`
- **Adminer** : `http://<IP>:9000`

## Configuration

### Variables d'environnement

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `NODE_ENV` | Mode d'exécution | `production` |
| `PORT` | Port de l'application | `8000` |
| `DB_HOST` | Hôte PostgreSQL | `postgres` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `ibar` |
| `DB_USER` | Utilisateur PostgreSQL | `ibar_user` |
| `DB_PASSWORD` | **Mot de passe PostgreSQL** | *(obligatoire)* |
| `JWT_SECRET` | **Secret JWT** (≥32 caractères) | *(obligatoire)* |
| `JWT_REFRESH_SECRET` | **Secret refresh JWT** (≥32 caractères) | *(obligatoire)* |
| `JWT_EXPIRES_IN` | Durée du token d'accès | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durée du refresh token | `7d` |
| `UPLOAD_DIR` | Répertoire des uploads | `uploads` |
| `MAX_FILE_SIZE` | Taille max upload (octets) | `10485760` (10 Mo) |
| `FRONTEND_URL` | URL publique (CORS) | `http://localhost:8000` |
| `ALLOWED_ORIGINS` | Origines CORS supplémentaires | *(vide)* |
| `ADMINER_PORT` | Port Adminer | `9000` |

### Génération des secrets

```bash
# Générer un secret JWT sécurisé
openssl rand -hex 32

# Exemple de .env minimal
DB_PASSWORD=MonMotDePasseSecurise123
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
FRONTEND_URL=http://192.168.1.100:8000
```

## Opérations courantes

### Voir les logs

```bash
# Tous les services
docker compose logs -f

# Application uniquement
docker compose logs -f app

# PostgreSQL uniquement
docker compose logs -f postgres
```

### Redémarrer

```bash
# Redémarrer un service
docker compose restart app

# Redémarrer tout
docker compose restart
```

### Arrêter

```bash
# Arrêter (conserve les volumes)
docker compose down

# Arrêter et supprimer les volumes (ATTENTION : perte de données)
docker compose down -v
```

### Reconstruire après mise à jour du code

```bash
git pull origin main
docker compose build app
docker compose up -d app
```

### Backup de la base de données

```bash
# Exporter
docker compose exec postgres pg_dump -U ibar_user ibar > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer
docker compose exec -T postgres psql -U ibar_user ibar < backup.sql
```

### Accéder au shell PostgreSQL

```bash
docker compose exec postgres psql -U ibar_user ibar
```

### Réinitialiser la base de données

```bash
# Supprime le volume et recrée la base depuis schema.sql
docker compose down -v
docker compose up -d
```

## Mise à jour de l'application

```bash
# 1. Récupérer les dernières modifications
git pull origin main

# 2. Reconstruire l'image et redémarrer
docker compose up -d --build
```

Les données (PostgreSQL et uploads) sont conservées dans les volumes Docker.

## Déploiement avec Portainer

### Méthode 1 : Stack depuis un dépôt Git

1. Ouvrir Portainer → **Stacks** → **Add stack**
2. Choisir **Repository**
3. URL : `https://github.com/Maxymou/iBar`
4. Branche : `main` (ou la branche Docker)
5. Fichier Compose : `docker-compose.yml`
6. Dans **Environment variables**, ajouter les variables obligatoires :
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `FRONTEND_URL`
7. Cliquer **Deploy the stack**

### Méthode 2 : Stack depuis un fichier Compose

1. Ouvrir Portainer → **Stacks** → **Add stack**
2. Choisir **Web editor**
3. Coller le contenu de `docker-compose.yml`
4. Ajouter les variables d'environnement
5. Cliquer **Deploy the stack**

### Méthode 3 : Upload du fichier

1. Copier `docker-compose.yml` et le dossier `database/` sur le serveur
2. Dans Portainer → **Stacks** → **Add stack** → **Upload**
3. Ajouter les variables d'environnement
4. Déployer

## Accès à Adminer

1. Ouvrir `http://<IP>:9000`
2. Paramètres de connexion :
   - **Système** : PostgreSQL
   - **Serveur** : `postgres`
   - **Utilisateur** : valeur de `DB_USER` (défaut : `ibar_user`)
   - **Mot de passe** : valeur de `DB_PASSWORD`
   - **Base de données** : valeur de `DB_NAME` (défaut : `ibar`)

## Persistance des données

Deux volumes Docker nommés sont créés :

| Volume | Contenu | Chemin dans le conteneur |
|--------|---------|--------------------------|
| `pgdata` | Données PostgreSQL | `/var/lib/postgresql/data` |
| `uploads` | Photos uploadées | `/app/backend/uploads` |

Ces volumes persistent entre les redémarrages et les reconstructions d'images.

Pour les supprimer explicitement : `docker compose down -v`

## Utilisation derrière Nginx Proxy Manager

L'application écoute sur le port 8000. Pour la placer derrière un reverse proxy :

1. Créer un **Proxy Host** dans Nginx Proxy Manager
2. **Forward Hostname/IP** : IP du serveur Docker (ou `ibar-app-1` si même réseau Docker)
3. **Forward Port** : `8000`
4. Activer SSL si souhaité

## Troubleshooting

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs app

# Causes fréquentes :
# - DB_PASSWORD non défini ou placeholder
# - JWT_SECRET / JWT_REFRESH_SECRET trop courts (< 32 chars)
# - PostgreSQL pas encore prêt (attendre quelques secondes)
```

### Erreur de connexion à la base

```bash
# Vérifier que postgres est healthy
docker compose ps

# Vérifier les logs postgres
docker compose logs postgres

# S'assurer que DB_HOST=postgres dans .env (pas localhost)
```

### Port déjà utilisé

```bash
# Vérifier ce qui utilise le port
ss -tlnp | grep 8000

# Changer le port dans .env
PORT=8001
```

### Permissions sur les uploads

Si les uploads échouent, vérifier que le volume est correctement monté :

```bash
docker compose exec app ls -la /app/backend/uploads
```

### Reconstruire proprement depuis zéro

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```
