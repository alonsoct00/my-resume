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
- Maintain structured, reusable professional data
- Follow modern front-end best practices

---

## 🧠 Architecture Decisions

- **Static-first approach** using Astro (`output: "static"`)
- Structured data via `cv.json` / `cv_en.json`
- Type safety through strict TypeScript config
- Path aliases configured in `tsconfig.json`
- Automated sitemap & robots generation
- Optimized for deployment on Vercel

---

## 🛠 Tech Stack

- **Astro 4**
- **TypeScript (strict mode)**
- **pnpm** for dependency management
- **JSON Resume Schema**
- **Ninja Keys** for command palette UX

---

## 📦 Requirements

- Node 20.x
- pnpm (via Corepack recommended)

Enable pnpm:

```bash
corepack enable
corepack prepare pnpm@latest --activate