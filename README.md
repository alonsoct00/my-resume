<div align="center">
  <h1>Minimalist Resume</h1>
  <p>
    Currículum profesional estático, bilingüe y orientado a rendimiento, construido con Astro + TypeScript sobre el esquema JSON Resume.
  </p>
</div>

---

## 🚀 Overview

Sitio de una sola página (`/`) que renderiza un CV a partir de datos estructurados en JSON. Todo el contenido se genera en build time, sin backend, pensado para:

- Cargar rápido y ser 100% estático (`output: "static"` en Astro).
- Ser bilingüe (ES/EN) sin duplicar HTML por ruta, alternando contenido en el cliente.
- Imprimirse limpio como PDF (`Cmd/Ctrl + P` o `window.print()`).
- Ofrecer una paleta de comandos (`Cmd/Ctrl + K`) para navegar redes sociales e imprimir.
- Mantener los datos del CV tipados y reutilizables (`cv.d.ts`).

Demo: https://alonsoct.dev

---

## 🛠 Tech Stack

| Área | Tecnología |
|---|---|
| Framework | [Astro 4](https://astro.build) (static output) |
| Lenguaje | TypeScript (modo `strict`, extiende `astro/tsconfigs/strict`) |
| Estilos | SCSS global (`src/styles.scss`) y estilos encapsulados de componentes |
| Datos | JSON Resume Schema extendido (`cv.json`, `cv_en.json`) |
| Command palette | [`hotkeypad`](https://www.npmjs.com/package/hotkeypad) |
| Analítica | Google Tag Manager, GA4 y Web Analytics de Vercel |
| SEO | Meta tags, Open Graph y Twitter Card |
| Hosting | Vercel (headers de seguridad y cache en `vercel.json`) |
| Package manager | pnpm 9.x |

---

## 📦 Requisitos

- Node 22.22.3 (fijado en [`.nvmrc`](.nvmrc); con [nvm](https://github.com/nvm-sh/nvm) instalado, corre `nvm use` en la raíz del proyecto)
- pnpm 9.x (recomendado vía Corepack)

```bash
nvm use            # usa la versión de Node fijada en .nvmrc
corepack enable
corepack prepare pnpm@latest --activate
```

## Instalación y desarrollo

```bash
pnpm install
pnpm dev       # servidor de desarrollo (astro dev)
pnpm build     # astro check + astro build → .vercel/output/static/
pnpm preview   # sirve el build de producción localmente
```

No hay variables de entorno requeridas para desarrollo local.

---

## 🧩 Estructura del proyecto

```
cv.json                     # Datos del CV en español (fuente de verdad)
cv_en.json                  # Datos del CV en inglés (misma forma que cv.json)
src/
├── cv.d.ts                 # Tipos TypeScript del esquema del CV
├── types.d.ts              # Tipos auxiliares (SocialIcon, etc.)
├── styles.scss             # Estilos globales
├── layouts/
│   └── Layout.astro        # <head> (SEO, GTM/GA4), estilos globales, lógica de idioma inicial
├── pages/
│   └── index.astro         # Única página: compone las secciones del CV
├── components/
│   ├── Section.astro       # Wrapper genérico de sección (<section>)
│   ├── LanguageSwitch.astro# Botón ES/EN, persiste preferencia en localStorage
│   ├── KeyboardManager.astro # Paleta de comandos (hotkeypad) + atajo de impresión
│   └── sections/
│       ├── Hero.astro      # Nombre, título, contacto, redes
│       ├── About.astro     # Resumen profesional
│       ├── Experience.astro# Historial laboral con iconos de stack por skill
│       ├── Education.astro # Educación, cursos y certificaciones
│       ├── Projects.astro  # Proyectos, diseño UX y experimentos de vibecoding
│       └── Skills.astro    # Skills agrupadas + idiomas hablados
├── icons/                  # Iconos como componentes .astro (y algunos .svg fuente)
└── lib/
    ├── icons.ts             # Utilidad de carga dinámica de iconos
    └── language.js           # Store de idioma legacy (no usado por LanguageSwitch)
public/                     # Assets estáticos (imágenes, PDFs de certificados, favicons)
vercel.json                 # Headers de seguridad y cache para Vercel
astro.config.mjs            # site, output static, alias "@" -> src/
tsconfig.json               # strict + paths: "@cv", "@cv_en", "@/*"
```

---

## 🌐 Datos del CV

`cv.json` (ES) y `cv_en.json` (EN) siguen el mismo shape, tipado en [`src/cv.d.ts`](src/cv.d.ts): `basics`, `work`, `education`, `skills`, `projects`, `designs`, `vibecoding`, `languages` y `certifications`. Es una extensión del [JSON Resume Schema](https://jsonresume.org/schema/) con campos propios como `logo`, `type` y `skills` en `work`, o enlaces a GitHub, Webflow, Shopify y Figma en las entradas del portafolio.

Los alias `@cv` y `@cv_en` (definidos en `tsconfig.json`) permiten importar los JSON directamente:

```ts
import { basics, work, skills } from "@cv"
import { basics as basics_en } from "@cv_en"
```

Para actualizar el CV: edita ambos archivos JSON manteniendo la misma estructura y orden de campos entre idiomas (los componentes asumen arrays paralelos ES/EN del mismo largo).

---

## 🈁 Soporte bilingüe

No hay rutas por idioma (`/en`, `/es`): **ambos idiomas se renderizan en el HTML** y se alternan por CSS/JS.

1. Cada sección importa `@cv` y `@cv_en` y renderiza **ambos** bloques de contenido, marcados con `data-lang-content="es"` / `data-lang-content="en"`.
2. `src/layouts/Layout.astro` define reglas globales: por defecto ambos bloques están ocultos; solo se muestra el que coincide con `html[data-lang="..."]` (ver el bloque `<style is:global>`).
3. El idioma inicial se resuelve inline en `<head>` (antes de pintar) leyendo `localStorage["cv-lang"]`, con fallback a `navigator.language`.
4. `LanguageSwitch.astro` es el componente interactivo: cambia `data-lang` en `<html>`, persiste en `localStorage`, actualiza `<title>`/meta description y dispara un evento a `dataLayer` (GTM) en cada cambio.

Al añadir una sección o campo nuevo, sigue el mismo patrón: duplicar el nodo con `data-lang-content` en vez de interpolar strings condicionalmente.

---

## ⌨️ Command palette

`KeyboardManager.astro` monta [`hotkeypad`](https://www.npmjs.com/package/hotkeypad) (abre con `Cmd/Ctrl+K`, o tocando el botón flotante en mobile) con:
- Un comando "Imprimir/Print" (`Ctrl+P`) que llama `window.print()`.
- Un comando por cada red social en `basics.profiles` (`cv.json`), con atajo `ctrl+<primera letra>`.

---

## 🖼 Iconos

`src/icons/*.astro` son componentes SVG individuales (uno por tecnología/red social). Las secciones que los necesitan (`Hero`, `Experience`, `Projects`, `Skills`) los resuelven dinámicamente por nombre mediante `import.meta.glob`, con fallback a `.svg` sueltos en `public/icons/`. Para añadir un icono nuevo: crear `src/icons/<slug>.astro` (o `.svg`) con el nombre en minúsculas igual al `skill`/`network` que debe matchear en el JSON del CV.

---

## 🖨 Impresión / PDF

- El bloque `.print` (contacto en texto plano) solo se muestra en `@media print`; el resto de UI interactiva (`.no-print`: switch de idioma, footer, command palette) se oculta.
- La sección de proyectos se oculta y las animaciones de actividad se desactivan al imprimir.
- Los `<article>` evitan cortarse entre páginas (`break-inside: avoid`).

---

## 🔍 SEO y analítica

- Meta tags Open Graph / Twitter Card definidos en `Layout.astro`, con descripción SEO estática (no el `summary` largo del CV) y actualizada dinámicamente según idioma.
- Google Tag Manager (`GTM-MTD6TJZT`) + GA4 (`G-W1Q1L41MZ3`) cargados inline en `<head>`.
- Web Analytics de Vercel habilitado mediante el adaptador `@astrojs/vercel`.

---

## 🔐 Deploy (Vercel)

`vercel.json` define:
- Headers de seguridad globales (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, etc.).
- Cache `no-cache` para HTML y cache inmutable de 1 año para assets estáticos (`js`, `css`, `woff2`, imágenes).

El sitio se despliega como estático puro (`astro build` → `.vercel/output/static/`), sin funciones serverless.

---

## 📄 Licencia

Ver [LICENSE.txt](LICENSE.txt).
