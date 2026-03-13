<?php
/**
 * IBar Admin — Custom Adminer wrapper
 *
 * - Reads .env to pre-fill connection details
 * - Login form asks for password only (all other fields pre-configured)
 * - IBar branding + modern inline CSS
 */

// ── Parse .env ──────────────────────────────────────────────────────────────
$_envPath = dirname(__DIR__) . '/.env';
$_env = [];
if (file_exists($_envPath)) {
    foreach (file($_envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        if (empty($_line) || $_line[0] === '#' || strpos($_line, '=') === false) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_env[trim($_k)] = trim($_v);
    }
}
unset($_envPath, $_line, $_k, $_v);

define('IBAR_DB_HOST',     $_env['DB_HOST']     ?? 'localhost');
define('IBAR_DB_PORT',     $_env['DB_PORT']     ?? '5432');
define('IBAR_DB_USER',     $_env['DB_USER']     ?? 'ibar_user');
define('IBAR_DB_NAME',     $_env['DB_NAME']     ?? 'ibar');
define('IBAR_DB_PASSWORD', $_env['DB_PASSWORD'] ?? '');
define('IBAR_DB_SERVER',   IBAR_DB_HOST . ':' . IBAR_DB_PORT);
unset($_env);

// ── Adminer customisation ────────────────────────────────────────────────────
function adminer_object() {
    return new class extends Adminer {

        // App name shown in page title and header
        function name() {
            return '🍸 IBar';
        }

        // DB connection credentials (uses .env values)
        function credentials() {
            return [IBAR_DB_SERVER, IBAR_DB_USER, IBAR_DB_PASSWORD];
        }

        // Default database
        function database() {
            return IBAR_DB_NAME;
        }

        // Accept login only when entered password matches configured DB password
        function login($login, $password) {
            return !empty($password) && hash_equals(IBAR_DB_PASSWORD, $password);
        }

        // Inject custom CSS into <head>
        function head() {
            parent::head();
            echo '<style>' . file_get_contents(__DIR__ . '/ibar-adminer.css') . '</style>';
        }

        // Simplified login form — password only, all other fields pre-configured
        function loginForm() {
            $server = htmlspecialchars(IBAR_DB_SERVER);
            $user   = htmlspecialchars(IBAR_DB_USER);
            $db     = htmlspecialchars(IBAR_DB_NAME);
            echo <<<HTML
            <div class="ibar-login-info">
                <div class="ibar-login-info-title">Connexion à la base de données</div>
                <table class="ibar-conn-table">
                    <tr>
                        <td class="ibar-conn-label">Serveur</td>
                        <td class="ibar-conn-value">{$server}</td>
                    </tr>
                    <tr>
                        <td class="ibar-conn-label">Utilisateur</td>
                        <td class="ibar-conn-value">{$user}</td>
                    </tr>
                    <tr>
                        <td class="ibar-conn-label">Base de données</td>
                        <td class="ibar-conn-value">{$db}</td>
                    </tr>
                </table>
            </div>

            <input type="hidden" name="auth[driver]"   value="pgsql">
            <input type="hidden" name="auth[server]"   value="{$server}">
            <input type="hidden" name="auth[username]" value="{$user}">
            <input type="hidden" name="auth[db]"       value="{$db}">

            <table>
                <tr>
                    <th>Mot de passe</th>
                    <td>
                        <input type="password" name="auth[password]"
                               class="ibar-password-input"
                               autofocus autocomplete="current-password"
                               placeholder="Mot de passe de la base de données">
                    </td>
                </tr>
            </table>
            <p><input type="submit" value="Se connecter" class="ibar-submit"></p>
            HTML;
        }
    };
}

// ── Load Adminer ─────────────────────────────────────────────────────────────
include __DIR__ . '/adminer.php';
