# Rapport d'Audit — iBar

**Date** : 2026-03-17
**Scope** : Audit complet du dépôt (frontend, backend, base de données, scripts)

---

## Problèmes trouvés et corrections effectuées

### 1. CRITIQUE — `database/schema.sql` obsolète

**Problème** : Le fichier `schema.sql` définissait encore les anciennes tables (`restaurants`, `accommodations`, `cafes`, `sync_queue`) qui ne sont plus utilisées par le backend. La table `places` (utilisée par tous les contrôleurs) et la table `geocode_cache` (utilisée par `geocodeService.js`) n'étaient présentes que dans les fichiers de migration. Une installation fraîche avec `schema.sql` via `scripts/install.sh` créait les mauvaises tables et l'application échouait.

**Correction** : Réécriture complète de `schema.sql` avec :
- Table `users` (conservée)
- Table `places` (unifiée, depuis `migration_places_no_postgis.sql`)
- Table `geocode_cache` (depuis `migration_places.sql`)
- Suppression des tables obsolètes

### 2. CRITIQUE — Table `geocode_cache` manquante dans la migration sans PostGIS

**Problème** : `migration_places_no_postgis.sql` créait la table `places` mais pas `geocode_cache`. Le service `geocodeService.js` interroge `geocode_cache` — les requêtes échouaient si seule la migration sans PostGIS était appliquée.

**Correction** : Ajout de la définition de `geocode_cache` dans `migration_places_no_postgis.sql`.

### 3. SÉCURITÉ — Upload avatar sans validation magic bytes

**Problème** : Dans `backend/routes/users.js`, la route d'upload d'avatar utilisait `upload.single('avatar')` sans appliquer le middleware `validateMagicBytes`. Les avatars contournaient la vérification de sécurité par magic bytes.

**Correction** : Import et ajout de `validateMagicBytes` dans la chaîne middleware de la route avatar.

### 4. INCOHÉRENCE — GIF accepté par le filtre mais rejeté par magic bytes

**Problème** : Dans `backend/middleware/upload.js`, le `fileFilter` multer acceptait `image/gif` mais `ALLOWED_MAGIC_MIMES` ne l'incluait pas. Un upload GIF passait le premier filtre mais était rejeté au second, avec un message d'erreur confus.

**Correction** : Retrait de `image/gif` du `fileFilter` et mise à jour du message d'erreur pour lister uniquement JPEG, PNG et WebP.

### 5. CODE — Composant `PublicRoute` défini après utilisation

**Problème** : Dans `frontend/src/App.jsx`, `PublicRoute` était utilisé (ligne 46) avant sa définition (ligne 56). Bien que fonctionnel en pratique (React n'appelle pas immédiatement le rendu), c'est une mauvaise pratique avec les `const` arrow functions.

**Correction** : Déplacement de la définition de `PublicRoute` avant le composant `App`.

### 6. CRITIQUE — Pattern de cache PWA obsolète dans vite.config.js

**Problème** : Dans `frontend/vite.config.js`, le `runtimeCaching` du service worker utilisait le pattern `/\/api\/(restaurants|accommodations)/` — les anciens noms de tables. L'API utilise maintenant `/api/places`. Le cache PWA offline pour les données API ne fonctionnait jamais.

**Correction** : Mise à jour du pattern vers `/\/api\/places/`.

### 7. DOCUMENTATION — Fichiers de migration sans contexte

**Problème** : Les fichiers de migration ne précisaient pas leur rôle par rapport à `schema.sql` ni quand les utiliser.

**Correction** : Ajout d'en-têtes documentant que les migrations sont destinées à la mise à niveau depuis v0.x (tables séparées) vers v1.x (table unifiée), et que `schema.sql` doit être utilisé pour les installations fraîches.

---

## Éléments vérifiés sans problème

| Composant | Statut |
|-----------|--------|
| Routes API backend (auth, places, users, geocode, google-import) | OK |
| Middleware d'authentification JWT | OK |
| Gestion des tokens (access + refresh) côté frontend | OK |
| Intercepteur Axios avec refresh automatique | OK |
| Connexion PostgreSQL avec retry et pool | OK |
| Compression d'images (Sharp) | OK |
| Validation des entrées (express-validator) | OK |
| Rate limiting (global + auth) | OK |
| CORS configuration | OK |
| Helmet security headers | OK |
| Service worker PWA et cache offline (IndexedDB) | OK |
| Leaflet map integration | OK |
| Routing React (BrowserRouter + lazy loading) | OK |
| Dark mode (ThemeContext) | OK |
| Scripts d'installation (`install.sh` utilise correctement `schema.sql`) | OK |
| Import `file-type` v16.5.4 (CJS compatible) | OK |

---

## État final de l'application

- **Base de données** : Schema cohérent et complet pour installation fraîche et migration
- **Backend** : Toutes les routes fonctionnelles, sécurité renforcée sur les uploads
- **Frontend** : Code propre, pas d'erreurs de structure
- **Scripts** : Installation et déploiement fonctionnels
- **Sécurité** : Validation magic bytes sur tous les endpoints d'upload

L'application est **prête pour le déploiement**.
