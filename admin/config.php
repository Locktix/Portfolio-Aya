<?php
// Mot de passe admin — changer avant mise en production
define('ADMIN_PASSWORD', 'aya2026');

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
