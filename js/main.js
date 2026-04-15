/* =============================================
   AYAA — Portfolio Photographique
   JavaScript principal — contenu chargé depuis content.json
   ============================================= */

let content = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('content.json');
        content = await res.json();
    } catch (e) {
        console.error('Erreur chargement content.json:', e);
        document.body.classList.add('loaded');
        return;
    }

    const page = detectPage();

    renderNav(page);
    renderPage(page);
    renderFooter();

    // Fallback placeholder pour les images manquantes
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', function () {
            if (!this.dataset.fallback) {
                this.dataset.fallback = '1';
                this.src = 'assets/img/placeholder.svg';
            }
        });
    });

    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
    });

    initPageTransitions();
    initNavigation();
    initScrollReveal();

    if (page === 'galerie') {
        initGallery();
        initLightbox();
    }

    if (page === 'contact') {
        initContactForm();
    }
});

/* ==================
   Page Detection
   ================== */
function detectPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === '' || path === 'index.html') return 'accueil';
    return path.replace('.html', '');
}

/* ==================
   SVG Icons
   ================== */
const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>'
};

/* ==================
   Navigation
   ================== */
function renderNav(page) {
    const nav = document.getElementById('nav');
    const links = content.site.nav.map(link => {
        const isActive = (page === 'accueil' && link.href === 'index.html') || link.href === page + '.html';
        return `<li><a href="${link.href}"${isActive ? ' class="active"' : ''}>${link.label}</a></li>`;
    }).join('');

    nav.innerHTML = `
        <div class="nav-inner">
            <a href="index.html" class="nav-logo">${content.site.name}</a>
            <button class="nav-toggle" id="navToggle" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
            <ul class="nav-links" id="navLinks">${links}</ul>
        </div>`;
}

function renderFooter() {
    const footer = document.getElementById('footer');
    const links = content.site.nav
        .filter(l => l.href !== 'index.html')
        .map(l => `<a href="${l.href}">${l.label}</a>`).join('');

    footer.innerHTML = `
        <div class="footer-inner">
            <div class="footer-brand">
                <a href="index.html" class="footer-logo">${content.site.name}</a>
                <p>${content.site.tagline}</p>
            </div>
            <div class="footer-nav">${links}</div>
            <div class="footer-copy"><p>${content.site.copyright}</p></div>
        </div>`;
}

/* ==================
   Page Router
   ================== */
function renderPage(page) {
    switch (page) {
        case 'accueil': renderAccueil(); break;
        case 'galerie': renderGalerie(); break;
        case 'demarche': renderDemarche(); break;
        case 'parcours': renderParcours(); break;
        case 'contact': renderContact(); break;
    }
}

/* ==================
   Accueil
   ================== */
function renderAccueil() {
    const d = content.accueil;

    // Hero
    document.getElementById('hero').innerHTML = `
        <div class="hero-bg"><img src="${d.hero.image}" alt=""></div>
        <div class="hero-overlay"></div>
        <div class="hero-watermark">${d.hero.watermark}</div>
        <div class="hero-content">
            <div class="hero-line"></div>
            <h1 class="hero-name">${d.hero.name}</h1>
            <p class="hero-subtitle">${d.hero.subtitle}</p>
            <div class="hero-tags">${d.hero.tags.map(t => `<span>${t}</span>`).join('')}</div>
        </div>
        <div class="hero-scroll">
            <span>D\u00e9couvrir</span>
            <div class="scroll-line"></div>
        </div>`;

    // Featured
    const featuredItems = d.featured.items.map((item, i) => `
        <div class="featured-item reveal" style="transition-delay: ${(i + 1) * 0.1}s">
            <img src="${item.image}" alt="${item.title}">
            <div class="item-overlay">
                <h3>${item.title}</h3>
                <span>${item.category}</span>
            </div>
        </div>`).join('');

    document.getElementById('featured').innerHTML = `
        <div class="container">
            <div class="featured-header reveal">
                <div>
                    <span class="section-label">${d.featured.label}</span>
                    <h2 class="section-title">${d.featured.title} <span class="accent">${d.featured.titleAccent}</span></h2>
                </div>
                <a href="galerie.html" class="featured-link">
                    ${d.featured.linkText}
                    ${ICONS.arrow}
                </a>
            </div>
            <div class="featured-grid">${featuredItems}</div>
        </div>`;

    // Intro
    document.getElementById('intro').innerHTML = `
        <div class="container">
            <div class="intro-grid">
                <div class="intro-text reveal-left">
                    <span class="section-label">${d.intro.label}</span>
                    <blockquote class="intro-quote">${d.intro.quote}</blockquote>
                    <p>${d.intro.text}</p>
                    <a href="${d.intro.buttonLink}" class="btn">
                        ${d.intro.buttonText}
                        ${ICONS.arrow}
                    </a>
                </div>
                <div class="intro-visual reveal-right">
                    <img src="${d.intro.image}" alt="${d.intro.imageAlt}">
                </div>
            </div>
        </div>`;
}

/* ==================
   Galerie
   ================== */
function renderGalerie() {
    const d = content.galerie;

    // Page header
    document.getElementById('page-header').innerHTML = `
        <div class="page-header-bg"></div>
        <div class="page-header-watermark">${d.header.watermark}</div>
        <div class="container">
            <span class="section-label">${d.header.label}</span>
            <h1 class="section-title">${d.header.title}</h1>
            <p>${d.header.description}</p>
        </div>`;

    // Filters
    const filters = d.filters.map((f, i) =>
        `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${f.id}">${f.label}</button>`
    ).join('');

    // Gallery items
    const items = d.items.map(item => {
        const isVideo = item.type === 'video';
        return `
            <div class="gallery-item" data-category="${item.category}"${isVideo ? ` data-type="video" data-video="${item.videoUrl || '#'}"` : ''}>
                <div class="gallery-img">
                    <img src="${item.image}" alt="${item.title}">
                    ${isVideo ? `<div class="video-badge">${ICONS.play}</div>` : ''}
                </div>
                <div class="gallery-overlay">
                    <span class="gallery-category">${item.categoryLabel}</span>
                    <h3>${item.title}</h3>
                </div>
            </div>`;
    }).join('');

    document.getElementById('gallery-section').innerHTML = `
        <div class="container">
            <div class="gallery-filters reveal">${filters}</div>
            <div class="gallery-grid">${items}</div>
        </div>`;

    // Lightbox structure
    document.getElementById('lightbox').className = 'lightbox';
    document.getElementById('lightbox').innerHTML = `
        <button class="lightbox-close" aria-label="Fermer">${ICONS.close}</button>
        <button class="lightbox-nav lightbox-prev" aria-label="Pr\u00e9c\u00e9dent">${ICONS.prev}</button>
        <button class="lightbox-nav lightbox-next" aria-label="Suivant">${ICONS.next}</button>
        <div class="lightbox-content"></div>
        <div class="lightbox-info">
            <span class="gallery-category"></span>
            <h3></h3>
        </div>
        <div class="lightbox-counter"></div>`;
}

/* ==================
   Démarche
   ================== */
function renderDemarche() {
    const d = content.demarche;

    // Page header
    document.getElementById('page-header').innerHTML = `
        <div class="page-header-bg"></div>
        <div class="page-header-watermark">${d.header.watermark}</div>
        <div class="container">
            <span class="section-label">${d.header.label}</span>
            <h1 class="section-title">${d.header.title} <span class="accent">${d.header.titleAccent}</span></h1>
            <p>${d.header.description}</p>
        </div>`;

    // Blocks
    const blocks = d.blocks.map(block => `
        <div class="demarche-block${block.reverse ? ' reverse' : ''} reveal">
            <div class="demarche-text">
                <span class="section-label">${block.label}</span>
                <h2>${block.title}</h2>
                ${block.paragraphs.map(p => `<p>${p}</p>`).join('')}
            </div>
            <div class="demarche-visual">
                <img src="${block.image}" alt="${block.imageAlt}">
            </div>
        </div>`);

    // Quote (inserted after first block)
    const quote = `
        <blockquote class="demarche-quote reveal">
            ${d.quote.text}
            <cite>${d.quote.author}</cite>
        </blockquote>`;

    // Values
    const values = d.values.map(v => `
        <div class="demarche-value">
            <h3>${v.title}</h3>
            <p>${v.text}</p>
        </div>`).join('');

    // Assemble: block1, quote, remaining blocks, values
    let html = blocks[0] + quote;
    for (let i = 1; i < blocks.length; i++) html += blocks[i];
    html += `<div class="demarche-values reveal">${values}</div>`;

    document.getElementById('demarche-section').innerHTML = `<div class="container">${html}</div>`;
}

/* ==================
   Parcours
   ================== */
function renderParcours() {
    const d = content.parcours;

    // Page header
    document.getElementById('page-header').innerHTML = `
        <div class="page-header-bg"></div>
        <div class="page-header-watermark">${d.header.watermark}</div>
        <div class="container">
            <span class="section-label">${d.header.label}</span>
            <h1 class="section-title">${d.header.title}</h1>
            <p>${d.header.description}</p>
        </div>`;

    // Timeline
    const items = d.timeline.map(item => `
        <div class="timeline-item reveal">
            <div class="timeline-dot"></div>
            <span class="timeline-category">${item.type}</span>
            <span class="timeline-date">${item.date}</span>
            <h3>${item.title}</h3>
            <h4>${item.subtitle}</h4>
            ${item.description ? `<p>${item.description}</p>` : ''}
        </div>`).join('');

    document.getElementById('parcours-section').innerHTML = `
        <div class="container">
            <div class="timeline">${items}</div>
        </div>`;
}

/* ==================
   Contact
   ================== */
function renderContact() {
    const d = content.contact;

    // Page header
    document.getElementById('page-header').innerHTML = `
        <div class="page-header-bg"></div>
        <div class="page-header-watermark">${d.header.watermark}</div>
        <div class="container">
            <span class="section-label">${d.header.label}</span>
            <h1 class="section-title">${d.header.title}</h1>
            <p>${d.header.description}</p>
        </div>`;

    // Contact details
    const details = d.info.details.map(detail => `
        <div class="contact-detail">
            <div class="contact-detail-icon">${ICONS[detail.icon] || ''}</div>
            <div>
                <label>${detail.label}</label>
                <span>${detail.value}</span>
            </div>
        </div>`).join('');

    document.getElementById('contact-section').innerHTML = `
        <div class="container">
            <div class="contact-grid">
                <div class="contact-info reveal-left">
                    <h2>${d.info.title}</h2>
                    <p>${d.info.text}</p>
                    <div class="contact-details">${details}</div>
                </div>
                <div class="reveal-right">
                    <form class="contact-form">
                        <div class="form-group">
                            <label for="name">Nom</label>
                            <input type="text" id="name" name="name" placeholder="Votre nom" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="votre@email.com" required>
                        </div>
                        <div class="form-group">
                            <label for="subject">Sujet</label>
                            <input type="text" id="subject" name="subject" placeholder="L'objet de votre message">
                        </div>
                        <div class="form-group">
                            <label for="message">Message</label>
                            <textarea id="message" name="message" placeholder="D\u00e9crivez votre projet ou votre demande..." required></textarea>
                        </div>
                        <button type="submit" class="btn-submit">${d.form.submitText}</button>
                        <div class="form-success">${d.form.successMessage}</div>
                    </form>
                </div>
            </div>
        </div>`;
}

/* ==================
   Page Transitions
   ================== */
function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach(link => {
        if (link.hostname === window.location.hostname && !link.hash && link.getAttribute('href') !== '#') {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#') && !link.hasAttribute('data-no-transition')) {
                    e.preventDefault();
                    document.body.classList.add('leaving');
                    setTimeout(() => { window.location.href = href; }, 350);
                }
            });
        }
    });
}

/* ==================
   Navigation Scroll & Mobile
   ================== */
function initNavigation() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            links.classList.toggle('open');
            document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
        });

        links.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                links.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }
}

/* ==================
   Scroll Reveal
   ================== */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(el => observer.observe(el));
}

/* ==================
   Gallery Filter
   ================== */
function initGallery() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const items = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.filter;

            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            items.forEach(item => {
                const match = category === 'all' || item.dataset.category === category;
                if (match) {
                    item.style.display = '';
                    requestAnimationFrame(() => { item.classList.remove('fade-out'); });
                } else {
                    item.classList.add('fade-out');
                    setTimeout(() => { item.style.display = 'none'; }, 350);
                }
            });
        });
    });
}

/* ==================
   Lightbox
   ================== */
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const items = Array.from(document.querySelectorAll('.gallery-item'));
    const contentEl = lightbox.querySelector('.lightbox-content');
    const infoCategory = lightbox.querySelector('.lightbox-info .gallery-category');
    const infoTitle = lightbox.querySelector('.lightbox-info h3');
    const counter = lightbox.querySelector('.lightbox-counter');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    let currentIndex = 0;
    let visibleItems = [...items];

    function getVisibleItems() {
        return items.filter(item => item.style.display !== 'none' && !item.classList.contains('fade-out'));
    }

    function open(index) {
        visibleItems = getVisibleItems();
        currentIndex = index;
        update();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function update() {
        const item = visibleItems[currentIndex];
        if (!item) return;

        const category = item.querySelector('.gallery-overlay .gallery-category')?.textContent || '';
        const title = item.querySelector('.gallery-overlay h3')?.textContent || '';
        const img = item.querySelector('.gallery-img img');

        if (img) {
            contentEl.innerHTML = `<img src="${img.src}" alt="${title}">`;
        }

        infoCategory.textContent = category;
        infoTitle.textContent = title;
        counter.textContent = `${currentIndex + 1} / ${visibleItems.length}`;

        prevBtn.style.display = currentIndex > 0 ? '' : 'none';
        nextBtn.style.display = currentIndex < visibleItems.length - 1 ? '' : 'none';
    }

    function next() {
        if (currentIndex < visibleItems.length - 1) { currentIndex++; update(); }
    }

    function prev() {
        if (currentIndex > 0) { currentIndex--; update(); }
    }

    items.forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.type === 'video' && item.dataset.video && item.dataset.video !== '#') {
                window.open(item.dataset.video, '_blank');
                return;
            }
            const visItems = getVisibleItems();
            const idx = visItems.indexOf(item);
            if (idx !== -1) open(idx);
        });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
    });
}

/* ==================
   Contact Form
   ================== */
function initContactForm() {
    const form = document.querySelector('.contact-form');
    const success = document.querySelector('.form-success');
    if (!form) return;

    const emailDetail = content.contact.info.details.find(d => d.icon === 'mail');
    const targetEmail = emailDetail ? emailDetail.value : '';

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject') || 'Contact Portfolio';
        const message = formData.get('message');

        const mailtoLink = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`De: ${name}\nEmail: ${email}\n\n${message}`)}`;
        window.location.href = mailtoLink;

        if (success) {
            success.classList.add('show');
            form.reset();
            setTimeout(() => success.classList.remove('show'), 5000);
        }
    });
}
