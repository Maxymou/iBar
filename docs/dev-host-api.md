# API DEV host iBar

L’API DEV host permet de piloter une mise à jour du dépôt iBar depuis la section **DEV** de l’interface web. Elle tourne hors de l’application principale, directement sur l’hôte, afin de pouvoir lancer `git`, installer les dépendances, builder le frontend puis redémarrer les services systemd iBar.

## Résumé

| Élément | Valeur |
| --- | --- |
| Service systemd | `ibar-dev-host-api.service` |
| Port DEV host local | `4878` |
| URL locale DEV host | `http://127.0.0.1:4878` |
| URL navigateur / frontend | `/api/dev-host` |
| Fichier principal | `host-tools/dev-host-api.js` |
| Token serveur | `DEV_HOST_TOKEN` |
| Header envoyé par le backend | `x-dev-host-token` |

> Important : ne commitez jamais de vrai token. Le token `DEV_HOST_TOKEN` doit être configuré uniquement côté serveur : dans le service systemd DEV host et dans l’environnement du backend iBar. Il ne doit jamais être injecté dans le frontend.

## Architecture et sécurité

Le navigateur ne contacte jamais directement `http://127.0.0.1:4878`. Depuis un navigateur, `127.0.0.1` désigne l’appareil de l’utilisateur, pas le serveur iBar ; cela provoque des erreurs `Failed to fetch` et exposerait une mauvaise surface d’attaque.

Le flux attendu est :

1. le navigateur appelle une URL relative iBar : `GET /api/dev-host/status` ou `POST /api/dev-host/update` ;
2. le backend iBar reçoit la requête sur le port applicatif habituel `8000` ;
3. le backend iBar appelle localement l’API DEV host sur `http://127.0.0.1:4878/status` ou `http://127.0.0.1:4878/update` ;
4. le backend ajoute le header `x-dev-host-token: DEV_HOST_TOKEN` ;
5. le navigateur reçoit la réponse via iBar sans connaître le token DEV host.

Le port `4878` doit rester local au serveur : ne l’ouvrez pas sur Internet, ne le publiez pas dans Docker et ne faites pas écouter `host-tools/dev-host-api.js` sur `0.0.0.0`. Le fichier `host-tools/dev-host-api.js` doit continuer à écouter sur `127.0.0.1:4878`.

Les routes proxy `/api/dev-host/status` et `/api/dev-host/update` utilisent l’authentification applicative iBar existante. Elles restent destinées uniquement à la section **DEV** de l’interface.

## Routes côté navigateur / backend iBar

### `GET /api/dev-host/status`

Retourne l’état de l’API DEV host, le dossier de travail, l’étape en cours, la dernière mise à jour réussie et la dernière erreur connue.

```bash
curl -i http://localhost:8000/api/dev-host/status
```

Si `DEV_HOST_TOKEN` est absent dans l’environnement du backend iBar, la route retourne une erreur claire indiquant que le token doit être configuré côté serveur.

### `POST /api/dev-host/update`

Déclenche une mise à jour de l’application. L’API refuse automatiquement une deuxième mise à jour si une première est déjà en cours.

```bash
curl -i -X POST http://localhost:8000/api/dev-host/update
```

La mise à jour exécute la logique adaptée à iBar :

1. `git fetch origin main`
2. comparaison entre `HEAD` et `origin/main`
3. arrêt clair si aucun changement n’est disponible
4. `git pull --ff-only origin main` si une mise à jour existe
5. `npm install --omit=dev --no-audit --no-fund` dans `backend/`
6. `npm install --include=dev --no-audit --no-fund` dans `frontend/`
7. `npm run build` depuis la racine du dépôt
8. tentative de redémarrage de `ibar` et `ibar-adminer` via systemd

## Routes locales DEV host

Ces routes ne sont appelées que par le backend iBar depuis le serveur lui-même :

```bash
curl -H "x-dev-host-token: TON_TOKEN_ICI" http://127.0.0.1:4878/status
curl -X POST -H "x-dev-host-token: TON_TOKEN_ICI" http://127.0.0.1:4878/update
```

Elles ne doivent pas être utilisées directement par le navigateur.

## Configuration backend iBar

Configurez `DEV_HOST_TOKEN` dans l’environnement du backend iBar avec la même valeur que le service systemd DEV host. Exemple `.env` côté serveur :

```env
DEV_HOST_TOKEN=TON_TOKEN_ICI
```

Après modification sur le serveur :

```bash
cd ~/iBar
git pull
docker compose up -d --build
sudo systemctl restart ibar-dev-host-api
```

Puis testez le proxy iBar :

```bash
curl -i http://localhost:8000/api/dev-host/status
```

Selon la configuration d’authentification iBar, ajoutez un header `Authorization: Bearer ...` pour tester ces routes protégées hors navigateur.

## Configuration frontend

Par défaut, le frontend utilise une URL relative :

```js
const DEV_HOST_API_URL = import.meta.env.VITE_DEV_HOST_API_URL || '/api/dev-host';
```

`VITE_DEV_HOST_API_URL` est optionnel. Dans l’usage normal, gardez une URL relative comme `/api/dev-host` afin que le navigateur appelle toujours le backend iBar sur le port applicatif `8000`.

Ne configurez pas de token DEV host dans le frontend. Aucune variable `VITE_DEV_HOST_TOKEN` ne doit être utilisée : les variables `VITE_*` sont injectées dans le bundle frontend et deviennent visibles par le navigateur.

## Service systemd

Créez le fichier :

```bash
sudo nano /etc/systemd/system/ibar-dev-host-api.service
```

Exemple à adapter à votre chemin d’installation et à votre utilisateur serveur :

```ini
[Unit]
Description=iBar DEV Host API
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/iBar
Environment=NODE_ENV=production
Environment=PORT=4878
Environment=DEV_HOST_TOKEN=TON_TOKEN_ICI
ExecStart=/usr/bin/node /opt/iBar/host-tools/dev-host-api.js
Restart=always
RestartSec=5
User=maxymou
Group=maxymou

[Install]
WantedBy=multi-user.target
```

Le port `4878` doit rester inchangé et local. Remplacez `/opt/iBar`, `maxymou` et `TON_TOKEN_ICI` par les valeurs réelles de votre serveur.

### Activer et démarrer le service

```bash
sudo systemctl daemon-reload
sudo systemctl enable ibar-dev-host-api
sudo systemctl start ibar-dev-host-api
sudo systemctl status ibar-dev-host-api
```

### Consulter les logs

```bash
sudo journalctl -u ibar-dev-host-api -f
```

## Droits nécessaires pour redémarrer iBar

Le service DEV host doit pouvoir exécuter les commandes de mise à jour dans le dépôt iBar et redémarrer les services `ibar` et `ibar-adminer`. Selon votre installation, vous pouvez :

- exécuter `ibar-dev-host-api.service` avec l’utilisateur propriétaire du dépôt ;
- autoriser uniquement les redémarrages nécessaires via sudoers ;
- ou lancer le service avec les droits déjà prévus par votre installation serveur.

Exemple sudoers minimal à adapter avec prudence :

```sudoers
maxymou ALL=NOPASSWD: /usr/bin/systemctl restart ibar ibar-adminer
```

## Utilisation dans l’interface

Une fois connecté à iBar :

1. ouvrez le menu utilisateur ;
2. ouvrez la section **DEV** ;
3. cliquez sur **Vérifier l’état** pour appeler `GET /api/dev-host/status` ;
4. cliquez sur **Mettre à jour l’app** pour appeler `POST /api/dev-host/update` ;
5. suivez l’overlay **Mise à jour en cours** jusqu’au succès ou à l’erreur ;
6. cliquez sur **Recharger l’app** lorsque la mise à jour est terminée.

L’overlay bloque les relances multiples depuis l’interface pendant qu’une opération est en cours. Côté API, une deuxième requête `/update` reçoit aussi une réponse `409` tant que la mise à jour précédente n’est pas terminée.

## Forcer mise à jour PWA

Le bouton **Forcer mise à jour PWA** agit uniquement côté navigateur. Il :

1. affiche un message de nettoyage ;
2. désenregistre tous les service workers disponibles ;
3. supprime tous les caches accessibles via `caches.keys()` ;
4. recharge complètement l’application.

Cette action complète les correctifs PWA/iOS existants : elle ne modifie pas la logique de viewport iOS ni la configuration PWA, elle force simplement le navigateur à reprendre les derniers fichiers disponibles.
