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

// ── Login (pas besoin d'être authentifié) ──────────────────────────────────
if ($action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    if ($password === ADMIN_PASSWORD) {
        session_regenerate_id(true);
        $_SESSION['admin_logged_in'] = true;
        json_ok();
    }
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
        json_ok();

    // ── Upload image ───────────────────────────────────────────────────────
    case 'upload_image':
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            json_err('Erreur upload : ' . ($_FILES['image']['error'] ?? 'aucun fichier'));
        }
        $category = $_POST['category'] ?? '';
        if (!in_array($category, ALLOWED_CATEGORIES, true)) json_err('Catégorie invalide');

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

    // ── Lister les images d'une catégorie ─────────────────────────────────
    case 'list_images':
        $category = $_GET['category'] ?? '';
        if (!in_array($category, ALLOWED_CATEGORIES, true)) json_err('Catégorie invalide');
        $dir   = ASSETS_IMG_PATH . $category . '/';
        $files = [];
        if (is_dir($dir)) {
            foreach (scandir($dir) as $f) {
                $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
                if (in_array($ext, ALLOWED_EXTS, true)) {
                    $files[] = 'assets/img/' . $category . '/' . $f;
                }
            }
        }
        json_ok(['images' => $files]);

    default:
        json_err('Action inconnue', 404);
}
