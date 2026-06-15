<?php
// ── Surcharge locale hors-git (recommandé en prod) ──────────────────────────
// Crée admin/config.local.php (non versionné, voir .gitignore) avec :
//   <?php define('ADMIN_PASSWORD_HASH', '<ton hash fort>');
// Ainsi le vrai hash ne part jamais sur GitHub.
$__local = __DIR__ . '/config.local.php';
if (is_file($__local)) require $__local;

// ── Mot de passe admin (hashé, bcrypt) ──────────────────────────────────────
// Défaut = "aya2026" — À CHANGER pour un mot de passe FORT (> 12 caractères).
// Générer un nouveau hash :
//   php -r "echo password_hash('MonMotDePasseFort', PASSWORD_DEFAULT);"
// puis colle-le ici (ou, mieux, dans config.local.php).
if (!defined('ADMIN_PASSWORD_HASH')) {
    define('ADMIN_PASSWORD_HASH', '$2y$12$2Msv8L0QCxhk9wPltziB6O49WuGYSWKax5pKlGFXV7u16vW/7Lw4e');
}

// Anti brute-force : LOGIN_MAX_FAILS échecs → blocage LOGIN_LOCK_SECONDS secondes (par IP).
define('LOGIN_MAX_FAILS',    5);
define('LOGIN_LOCK_SECONDS', 900);

// Chemins absolus
define('CONTENT_JSON_PATH', dirname(__DIR__) . '/content.json');
define('ASSETS_IMG_PATH',   dirname(__DIR__) . '/assets/img/');

// Catégories système (cibles d'upload hors galerie : héro, intro, blocs démarche).
// Non supprimables. Les catégories de galerie sont gérées dynamiquement
// (un dossier sous assets/img/ = une catégorie valide), voir valid_category() dans api.php.
define('RESERVED_CATEGORIES', ['accueil', 'demarche']);

// Extensions et types MIME acceptés
define('ALLOWED_EXTS',  ['jpg', 'jpeg', 'png', 'webp', 'gif']);
define('ALLOWED_MIMES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Taille max upload : 15 MB
define('MAX_UPLOAD_SIZE', 15 * 1024 * 1024);

// Nom de session
define('SESSION_NAME', 'aya_admin');
