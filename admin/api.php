<?php
require_once 'config.php';

// Cookie SameSite=Strict pour limiter CSRF
session_set_cookie_params(['samesite' => 'Strict', 'httponly' => true]);
session_name(SESSION_NAME);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

$action = $_GET['action'] ?? '';

function json_ok($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function is_authed() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

// ── Anti brute-force (throttle login par IP, stocké hors webroot) ───────────
function throttle_path() {
    return sys_get_temp_dir() . '/aya_admin_throttle.json';
}
function throttle_load() {
    $f = throttle_path();
    if (!is_file($f)) return [];
    $d = json_decode((string) file_get_contents($f), true);
    return is_array($d) ? $d : [];
}
function throttle_save($d) {
    $now = time();
    foreach ($d as $ip => $r) {           // purge des entrées expirées
        if (($r['until'] ?? 0) < $now && ($r['fails'] ?? 0) === 0) unset($d[$ip]);
    }
    @file_put_contents(throttle_path(), json_encode($d));
}

// Une catégorie est valide si son slug est propre ET que le dossier existe.
// (Les dossiers sont créés via create_category — pas de liste codée en dur.)
function valid_category($cat) {
    if (!preg_match('/^[a-z0-9_-]+$/', $cat)) return false;
    return is_dir(ASSETS_IMG_PATH . $cat);
}

// Synchronise les balises og:image / twitter:image des pages HTML avec l'image
// du héro (accueil > hero > image). Évite que l'aperçu de partage réseaux sociaux
// reste figé sur une ancienne image quand le héro change via l'admin.
function sync_og_image($content) {
    $hero = $content['accueil']['hero']['image'] ?? '';
    if ($hero === '') return;
    $url   = rtrim(SITE_URL, '/') . '/' . ltrim($hero, '/');
    $root  = dirname(__DIR__);
    $pages = ['index.html', 'galerie.html', 'demarche.html', 'parcours.html', 'contact.html'];
    foreach ($pages as $page) {
        $file = $root . '/' . $page;
        if (!is_file($file)) continue;
        $html = file_get_contents($file);
        if ($html === false) continue;
        $new = preg_replace_callback(
            '/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*(">)/',
            function ($m) use ($url) { return $m[1] . htmlspecialchars($url, ENT_QUOTES) . $m[2]; },
            $html
        );
        if ($new !== null && $new !== $html) {
            file_put_contents($file, $new);
        }
    }
}

// ── Login (pas besoin d'être authentifié) ──────────────────────────────────
if ($action === 'login') {
    $input    = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';

    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $now = time();
    $thr = throttle_load();
    $rec = $thr[$ip] ?? ['fails' => 0, 'until' => 0];

    if (($rec['until'] ?? 0) > $now) {
        json_err('Trop de tentatives. Réessayez dans ' . ceil(($rec['until'] - $now) / 60) . ' min.', 429);
    }

    if (password_verify($password, ADMIN_PASSWORD_HASH)) {
        unset($thr[$ip]);
        throttle_save($thr);
        session_regenerate_id(true);
        $_SESSION['admin_logged_in'] = true;
        json_ok();
    }

    $rec['fails'] = ($rec['fails'] ?? 0) + 1;
    if ($rec['fails'] >= LOGIN_MAX_FAILS) {
        $rec['until'] = $now + LOGIN_LOCK_SECONDS;
        $rec['fails'] = 0;
    }
    $thr[$ip] = $rec;
    throttle_save($thr);
    json_err('Mot de passe incorrect', 401);
}

// ── Toutes les autres actions nécessitent une session ─────────────────────
if (!is_authed()) {
    json_err('Non autorisé', 401);
}

switch ($action) {

    // ── Logout ────────────────────────────────────────────────────────────
    case 'logout':
        session_destroy();
        json_ok();

    // ── Lire content.json ─────────────────────────────────────────────────
    case 'get_content':
        $raw = file_get_contents(CONTENT_JSON_PATH);
        if ($raw === false) json_err('Impossible de lire content.json', 500);
        // On renvoie le JSON brut (déjà bien formé)
        echo $raw;
        exit;

    // ── Sauvegarder content.json ──────────────────────────────────────────
    case 'save_content':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['content'])) json_err('Données manquantes');
        $json = json_encode($input['content'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (json_last_error() !== JSON_ERROR_NONE) json_err('JSON invalide');
        // Écriture atomique via fichier temporaire
        $tmp = CONTENT_JSON_PATH . '.tmp';
        if (file_put_contents($tmp, $json) === false) json_err('Erreur écriture (permissions ?)', 500);
        if (!rename($tmp, CONTENT_JSON_PATH)) {
            unlink($tmp);
            json_err('Erreur remplacement fichier', 500);
        }
        // Garde l'aperçu de partage réseaux sociaux aligné sur le héro courant.
        sync_og_image($input['content']);
        json_ok();

    // ── Upload image ───────────────────────────────────────────────────────
    case 'upload_image':
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            json_err('Erreur upload : ' . ($_FILES['image']['error'] ?? 'aucun fichier'));
        }
        $category = $_POST['category'] ?? '';
        if (!valid_category($category)) json_err('Catégorie invalide');

        $file = $_FILES['image'];
        if ($file['size'] > MAX_UPLOAD_SIZE) json_err('Fichier trop lourd (max 15 MB)');

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_EXTS, true)) json_err('Format non supporté');

        // Vérification du type MIME réel
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($file['tmp_name']);
        if (!in_array($mime, ALLOWED_MIMES, true)) json_err('Type MIME non supporté');

        $dest_dir = ASSETS_IMG_PATH . $category . '/';
        if (!is_dir($dest_dir)) json_err('Dossier catégorie introuvable', 500);

        // Nettoyage du nom + anti-collision
        $base = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $final = $base . '.' . $ext;
        $n = 1;
        while (file_exists($dest_dir . $final)) {
            $final = $base . '_' . $n++ . '.' . $ext;
        }

        if (!move_uploaded_file($file['tmp_name'], $dest_dir . $final)) {
            json_err('Impossible de déplacer le fichier', 500);
        }

        json_ok([
            'path'     => 'assets/img/' . $category . '/' . $final,
            'filename' => $final,
        ]);

    // ── Supprimer image ───────────────────────────────────────────────────
    case 'delete_image':
        $input = json_decode(file_get_contents('php://input'), true);
        $path  = $input['path'] ?? '';

        // Sécurité : le chemin doit rester dans assets/img/
        $real_assets = realpath(ASSETS_IMG_PATH);
        $full        = realpath(dirname(__DIR__) . '/' . ltrim($path, '/'));

        if (!$full || strpos($full, $real_assets) !== 0) json_err('Chemin invalide');
        if (!file_exists($full)) json_ok(['note' => 'Fichier déjà absent']);
        if (!unlink($full)) json_err('Impossible de supprimer', 500);
        json_ok();

    // ── Déplacer une image vers une autre catégorie (dossier) ─────────────
    case 'move_image':
        $input    = json_decode(file_get_contents('php://input'), true);
        $path     = $input['path'] ?? '';
        $category = $input['category'] ?? '';
        if (!valid_category($category)) json_err('Catégorie invalide');

        $real_assets = realpath(ASSETS_IMG_PATH);
        $full        = realpath(dirname(__DIR__) . '/' . ltrim($path, '/'));
        if (!$full || strpos($full, $real_assets) !== 0) json_err('Chemin invalide');
        if (!is_file($full)) json_err('Fichier introuvable');

        $ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_EXTS, true)) json_err('Format non supporté');

        $dest_dir = ASSETS_IMG_PATH . $category . '/';
        // Déjà dans la bonne catégorie : rien à faire
        if (realpath(dirname($full)) === realpath($dest_dir)) {
            json_ok(['path' => $path]);
        }

        $base  = pathinfo($full, PATHINFO_FILENAME);
        $final = $base . '.' . $ext;
        $n = 1;
        while (file_exists($dest_dir . $final)) {
            $final = $base . '_' . $n++ . '.' . $ext;
        }
        if (!rename($full, $dest_dir . $final)) json_err('Impossible de déplacer le fichier', 500);
        json_ok(['path' => 'assets/img/' . $category . '/' . $final]);

    // ── Lister les images d'une catégorie ─────────────────────────────────
    case 'list_images':
        $category = $_GET['category'] ?? '';
        if (!valid_category($category)) json_err('Catégorie invalide');
        $dir   = ASSETS_IMG_PATH . $category . '/';
        $files = [];
        foreach (scandir($dir) as $f) {
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
            if (in_array($ext, ALLOWED_EXTS, true)) {
                $files[] = 'assets/img/' . $category . '/' . $f;
            }
        }
        json_ok(['images' => $files]);

    // ── Lister toutes les images, groupées par catégorie (pour le sélecteur) ──
    case 'list_all_images':
        $out = [];
        foreach (scandir(ASSETS_IMG_PATH) as $cat) {
            if ($cat === '.' || $cat === '..') continue;
            $dir = ASSETS_IMG_PATH . $cat;
            if (!is_dir($dir)) continue;
            $files = [];
            foreach (scandir($dir) as $f) {
                $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
                if (in_array($ext, ALLOWED_EXTS, true)) {
                    $files[] = 'assets/img/' . $cat . '/' . $f;
                }
            }
            if ($files) $out[$cat] = $files;
        }
        json_ok(['categories' => $out]);

    // ── Créer une catégorie (= créer son dossier) ────────────────────────────
    case 'create_category':
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = strtolower(trim($input['id'] ?? ''));
        if (!preg_match('/^[a-z0-9-]{2,32}$/', $id)) {
            json_err('Identifiant invalide : a-z, 0-9 et tirets uniquement (2 à 32 caractères)');
        }
        if ($id === 'all') json_err('Identifiant réservé');
        $dir = ASSETS_IMG_PATH . $id;
        if (is_dir($dir)) json_ok(['id' => $id, 'note' => 'Catégorie déjà existante']);
        if (!mkdir($dir, 0775)) json_err('Impossible de créer le dossier (permissions ?)', 500);
        json_ok(['id' => $id]);

    // ── Supprimer une catégorie (refusé si elle contient des images) ─────────
    case 'delete_category':
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = strtolower(trim($input['id'] ?? ''));
        if (!valid_category($id))                          json_err('Catégorie introuvable');
        if (in_array($id, RESERVED_CATEGORIES, true))      json_err('Catégorie système, non supprimable');
        $dir = ASSETS_IMG_PATH . $id . '/';
        $imgs = 0;
        foreach (scandir($dir) as $f) {
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
            if (in_array($ext, ALLOWED_EXTS, true)) $imgs++;
        }
        if ($imgs > 0) json_err("Catégorie non vide ($imgs image·s) — videz-la d'abord");
        if (file_exists($dir . '.gitkeep')) @unlink($dir . '.gitkeep');
        if (!@rmdir($dir)) json_err('Impossible de supprimer le dossier (non vide ?)', 500);
        json_ok();

    default:
        json_err('Action inconnue', 404);
}
