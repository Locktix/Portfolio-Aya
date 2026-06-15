<?php
require_once 'config.php';

session_set_cookie_params(['samesite' => 'Strict', 'httponly' => true]);
session_name(SESSION_NAME);
session_start();

$logged_in = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;

// Fond de la page de connexion = image hero de l'accueil (lue dynamiquement)
$hero_bg = '';
if (!$logged_in) {
    $cj  = @json_decode(@file_get_contents(CONTENT_JSON_PATH), true);
    $img = $cj['accueil']['hero']['image'] ?? '';
    if ($img) $hero_bg = '../' . ltrim($img, '/');
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — AYAA</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>

<?php if ($logged_in): ?>

<!-- ═══════════════════ ADMIN PANEL ═══════════════════ -->
<div class="admin-layout">

  <!-- Sidebar -->
  <aside class="sidebar">

    <div class="sidebar-logo">
      <div class="sidebar-logo-eyebrow">Mode édition</div>
      <div class="sidebar-logo-main">ADMIN <em>/ AYAA</em></div>
    </div>

    <div class="sidebar-status">
      <span class="status-dot" id="status-dot"></span>
      <span class="status-text" id="status-text">Synchronisé</span>
    </div>

    <nav class="sidebar-nav">
      <a href="#" class="nav-item" data-section="site">
        <span class="nav-icon">◈</span> Site
      </a>
      <a href="#" class="nav-item" data-section="accueil">
        <span class="nav-icon">⌂</span> Accueil
      </a>
      <a href="#" class="nav-item" data-section="galerie">
        <span class="nav-icon">⊞</span> Galerie
      </a>
      <a href="#" class="nav-item" data-section="demarche">
        <span class="nav-icon">◎</span> Démarche
      </a>
      <a href="#" class="nav-item" data-section="parcours">
        <span class="nav-icon">◷</span> Parcours
      </a>
      <a href="#" class="nav-item" data-section="contact">
        <span class="nav-icon">◉</span> Contact
      </a>
    </nav>

    <div class="sidebar-bottom">
      <button class="btn-logout" id="btn-logout">← Déconnexion</button>
    </div>

  </aside>

  <!-- Main content -->
  <main class="admin-main">
    <div id="section-container">
      <div class="loading">
        <div class="loading-spinner"></div>
        Chargement…
      </div>
    </div>
  </main>

</div>

<!-- Toast container -->
<div id="toast-container"></div>

<script src="js/admin.js"></script>

<?php else: ?>

<!-- ═══════════════════ LOGIN PAGE ═══════════════════ -->
<div class="login-page<?= $hero_bg ? ' login-page--hero' : '' ?>"<?php if ($hero_bg): ?> style="background-image: linear-gradient(rgba(8,8,13,0.88), rgba(8,8,13,0.74)), url('<?= htmlspecialchars($hero_bg, ENT_QUOTES) ?>');"<?php endif; ?>>
  <div class="login-card">

    <div class="login-logo">
      <div class="login-eyebrow">Espace d'administration</div>
      <div class="login-title">ADMIN <em>/ AYAA</em></div>
      <div class="login-divider"></div>
    </div>

    <div class="login-error" id="login-error">Mot de passe incorrect.</div>

    <input type="password"
           class="login-input"
           id="login-password"
           placeholder="Mot de passe"
           autocomplete="current-password"
           autofocus>

    <button class="login-btn" id="login-btn">ACCÉDER</button>

    <a href="../index.html" class="login-back">← Retour au site</a>

  </div>
</div>

<div id="toast-container"></div>

<script>
(function () {
  const input = document.getElementById('login-password');
  const btn   = document.getElementById('login-btn');
  const err   = document.getElementById('login-error');

  async function tryLogin() {
    const password = input.value.trim();
    if (!password) return;

    btn.disabled    = true;
    btn.textContent = '…';
    err.classList.remove('show');

    try {
      const res = await fetch('api.php?action=login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        err.classList.add('show');
        input.value = '';
        input.focus();
      }
    } catch (e) {
      err.textContent = 'Erreur réseau — réessayez.';
      err.classList.add('show');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'ACCÉDER';
    }
  }

  btn.addEventListener('click', tryLogin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
})();
</script>

<?php endif; ?>

</body>
</html>
