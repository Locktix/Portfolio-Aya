# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static portfolio site for a documentary photographer (Aya). Zero-build, vanilla HTML/CSS/JS with all content driven from a single `content.json` file. All UI text is in French (fr_BE).

## Development

No build tools, package manager, or dependencies. Serve with any static HTTP server:

```bash
# Already under XAMPP — open http://localhost/Portfolio-Aya/ in a browser
# Or use any static server, e.g.:
npx serve .
python -m http.server 8000
```

No linter, formatter, or test suite is configured.

## Architecture

### JSON-Driven Rendering

`content.json` is the single source of truth for all site content (navigation, hero text, gallery items, timeline entries, contact info). On `DOMContentLoaded`, `js/main.js` fetches this file and calls a page-specific renderer based on the current filename:

- `index.html` → `renderAccueil()` — hero + featured works grid + intro quote
- `galerie.html` → `renderGalerie()` — filterable gallery (6 categories) + lightbox
- `demarche.html` → `renderDemarche()` — artist statement blocks + values
- `parcours.html` → `renderParcours()` — education/work timeline
- `contact.html` → `renderContact()` — contact info + mailto form

Adding or editing content generally means editing `content.json` and, if a new section type is needed, adding a corresponding render function in `main.js`.

### Single-File CSS & JS

All styles live in `css/style.css` (~1500 lines) and all logic in `js/main.js` (~610 lines). CSS uses custom properties for theming (colors, fonts, spacing) defined at `:root`. Responsive breakpoints: 1024px, 768px, 480px.

### Image Organization

Images go in `assets/img/{category}/` where category matches the gallery filter slugs in `content.json` (accueil, demarche, marketing, portrait, reportage, street, tfe). Missing images fall back to `assets/placeholder.svg`.

### Key JS Features

- **Gallery filters**: category buttons toggle visibility; "Tout" shows all
- **Lightbox**: custom-built with keyboard nav (Escape to close, arrows to navigate)
- **Page transitions**: fade-out on link clicks via CSS class + `transitionend`
- **Scroll reveal**: `IntersectionObserver` adds `.revealed` class to `.scroll-reveal` elements
- **Mobile nav**: hamburger toggle with body scroll lock and backdrop blur
