<div align="center">
  <img src="logo.png" height="90px" width="auto" />
  <h1>Minimalist Resume</h1>
  <p>
    Static-first professional resume built with Astro & TypeScript.
  </p>
</div>

---

## 🚀 Overview

This project is a static, performance-oriented resume built using the official JSON Resume schema.

It is designed to:

- Render as a fast static website
- Be printable as a clean PDF
- Support bilingual content (ES / EN) with client-side language switching
- Maintain structured, reusable professional data
- Follow modern front-end best practices

---

## 🧠 Architecture Decisions

- **Static-first approach** using Astro (`output: "static"`)
- **Bilingual support** via `cv.json` (ES) / `cv_en.json` (EN) with `data-lang-content` attribute switching
- **Dynamic icon loading** using `import.meta.glob` for `.astro` and `.svg` icons
- Type safety through strict TypeScript config (`cv.d.ts`)
- Path aliases configured in `tsconfig.json`
- Automated sitemap & robots generation
- Security headers via `vercel.json`
- Optimized for deployment on Vercel

---

## 🛠 Tech Stack

- **Astro 4**
- **TypeScript (strict mode)**
- **SCSS** for styling
- **pnpm** for dependency management
- **JSON Resume Schema** (extended with `skills`, `logo`, `type` fields)
- **Ninja Keys** for command palette UX

---

## 📦 Requirements

- Node 20.x
- pnpm 9.x (via Corepack recommended)

Enable pnpm:
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## 🧩 Project Structure
```
src/
├── components/       # Astro UI components (Hero, Experience, Projects...)
├── icons/            # .astro icon components (loaded dynamically)
├── lib/              # Shared utilities
├── pages/            # Astro pages
├── styles.scss       # Global styles
cv.json               # Resume data in Spanish
cv_en.json            # Resume data in English
cv.d.ts               # TypeScript types for CV schema
vercel.json           # Security & cache headers
```

---

## 🌐 Bilingual Support

Content is served statically in both Spanish and English. Language is detected from:

1. `localStorage` (user preference)
2. `navigator.language` (browser default)

Switching is handled client-side via `data-lang` attribute on `<html>`.

---

## 🖨 Print / PDF

The resume is print-optimized:

- Contact info renders as plain text (`footer.print`)
- Projects section is hidden on print
- Animations are disabled on print
- Page breaks are avoided inside articles