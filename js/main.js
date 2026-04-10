/* =============================================
   AYAA — Portfolio Photographique
   JavaScript principal
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
    /* --- Page Load Transition --- */
    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
    });

    /* --- Page Exit Transition --- */
    document.querySelectorAll('a[href]').forEach(link => {
        if (link.hostname === window.location.hostname && !link.hash && link.getAttribute('href') !== '#') {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#') && !link.hasAttribute('data-no-transition')) {
                    e.preventDefault();
                    document.body.classList.add('leaving');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 350);
                }
            });
        }
    });

    /* --- Navigation --- */
    initNavigation();

    /* --- Scroll Animations --- */
    initScrollReveal();

    /* --- Gallery (if on gallery page) --- */
    if (document.querySelector('.gallery-grid')) {
        initGallery();
        initLightbox();
    }

    /* --- Contact Form --- */
    if (document.querySelector('.contact-form')) {
        initContactForm();
    }
});

/* ==================
   Navigation
   ================== */
function initNavigation() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    // Scroll detection
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const current = window.scrollY;
        if (current > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        lastScroll = current;
    }, { passive: true });

    // Mobile toggle
    if (toggle && links) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            links.classList.toggle('open');
            document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
        });

        // Close on link click
        links.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                links.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // Set active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
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
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

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

            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter items
            items.forEach(item => {
                const match = category === 'all' || item.dataset.category === category;

                if (match) {
                    item.style.display = '';
                    requestAnimationFrame(() => {
                        item.classList.remove('fade-out');
                    });
                } else {
                    item.classList.add('fade-out');
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 350);
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
    const content = lightbox.querySelector('.lightbox-content');
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
        const isVideo = item.dataset.type === 'video';

        // Check for real image
        const img = item.querySelector('.gallery-img img');
        const placeholder = item.querySelector('.gallery-img .placeholder');

        if (img) {
            content.innerHTML = `<img src="${img.src}" alt="${title}">`;
        } else if (placeholder) {
            content.innerHTML = `<div class="placeholder" style="--ratio: auto"><div class="placeholder-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div><span>${placeholder.querySelector('span')?.textContent || ''}</span></div>`;
        }

        infoCategory.textContent = category;
        infoTitle.textContent = title;
        counter.textContent = `${currentIndex + 1} / ${visibleItems.length}`;

        prevBtn.style.display = currentIndex > 0 ? '' : 'none';
        nextBtn.style.display = currentIndex < visibleItems.length - 1 ? '' : 'none';
    }

    function next() {
        if (currentIndex < visibleItems.length - 1) {
            currentIndex++;
            update();
        }
    }

    function prev() {
        if (currentIndex > 0) {
            currentIndex--;
            update();
        }
    }

    // Click handlers on gallery items
    items.forEach((item) => {
        item.addEventListener('click', () => {
            // For video items, open the video link
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

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) close();
    });

    // Keyboard navigation
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect form data
        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject') || 'Contact Portfolio';
        const message = formData.get('message');

        // mailto fallback — replace with Formspree or similar for production
        const mailtoLink = `mailto:contact@ayaa.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`De: ${name}\nEmail: ${email}\n\n${message}`)}`;
        window.location.href = mailtoLink;

        // Show success
        if (success) {
            success.classList.add('show');
            form.reset();
            setTimeout(() => success.classList.remove('show'), 5000);
        }
    });
}
