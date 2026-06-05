# API DEV host iBar

L’API DEV host permet de piloter une mise à jour du dépôt iBar depuis la section **DEV** de l’interface web. Elle tourne hors de l’application principale, directement sur l’hôte, afin de pouvoir lancer `git`, installer les dépendances, builder le frontend puis redémarrer les services systemd iBar.

## Résumé

| Élément | Valeur |
| --- | --- |
| Service systemd | `ibar-dev-host-api.service` |
| Port | `4878` |
| URL locale par défaut | `http://127.0.0.1:4878` |
| Fichier principal | `host-tools/dev-host-api.js` |
| Token serveur | `DEV_HOST_TOKEN` |
| Header requis | `x-dev-host-token` |

> Important : ne commitez jamais de vrai token. Le token doit être configuré localement sur le serveur, à la fois dans le service systemd et dans les variables d’environnement utilisées au build du frontend si vous voulez utiliser les boutons de l’interface.

## Routes disponibles

### `GET /status`

Retourne l’état de l’API DEV host, le dossier de travail, l’étape en cours, la dernière mise à jour réussie et la dernière erreur connue.

```bash
curl -H "x-dev-host-token: TON_TOKEN_ICI" http://127.0.0.1:4878/status
```

### `POST /update`

Déclenche une mise à jour de l’application. L’API refuse automatiquement une deuxième mise à jour si une première est déjà en cours.

```bash
curl -X POST -H "x-dev-host-token: TON_TOKEN_ICI" http://127.0.0.1:4878/update
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

## Configuration frontend

Dans le fichier `.env` utilisé pour builder le frontend, ajoutez :

```env
VITE_DEV_HOST_API_URL=http://127.0.0.1:4878
VITE_DEV_HOST_TOKEN=TON_TOKEN_ICI
```

- `VITE_DEV_HOST_API_URL` peut être adapté si vous exposez l’API DEV host via un proxy local sécurisé.
- `VITE_DEV_HOST_TOKEN` doit correspondre exactement à `DEV_HOST_TOKEN` côté service systemd.
- Ces variables sont injectées dans le build frontend : utilisez un token dédié et gardez l’accès réseau à l’API DEV host strictement limité.

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

Le port `4878` doit rester inchangé. Remplacez `/opt/iBar`, `maxymou` et `TON_TOKEN_ICI` par les valeurs réelles de votre serveur.

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
3. cliquez sur **Vérifier l’état** pour appeler `GET /status` ;
4. cliquez sur **Mettre à jour l’app** pour appeler `POST /update` ;
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
