# AGENT.md — Contexto del proyecto para agentes AI

Este archivo resume el proyecto para que un agente AI pueda orientarse rápido sin tener que leer todo el repo. Complementa a [README.md](README.md), que está orientado a humanos.

## Qué es este proyecto

Un currículum/portfolio personal de **Alonso CT** (Frontend Developer), construido como sitio 100% estático con **Astro 4** + **TypeScript**. Es un caso de "JSON Resume as data source": todo el contenido del CV vive en dos archivos JSON (`cv.json` ES, `cv_en.json` EN) y los componentes `.astro` solo leen esos datos y renderizan HTML.

No hay backend, ni base de datos, ni API routes. `output: "static"` en `astro.config.mjs` — el build genera HTML/CSS/JS puros en `dist/`, desplegados en Vercel.

## Comandos esenciales

```bash
pnpm install
pnpm dev        # astro dev — servidor local con HMR
pnpm build      # astro check (type-check) + astro build
pnpm preview    # sirve dist/ localmente
```

No hay suite de tests configurada. La validación principal es `astro check` (TypeScript + validación de templates Astro) dentro de `pnpm build`. Antes de dar por terminado un cambio, correr `pnpm build` para detectar errores de tipos o de template.

## Modelo mental clave: bilingüe sin rutas

Este es el patrón más importante a entender antes de tocar cualquier sección:

- **No existen** `/en` ni `/es` como rutas. Todo se renderiza en una sola página (`src/pages/index.astro`).
- Cada componente de sección importa `basics`/`work`/`skills`/etc. **de ambos** `@cv` y `@cv_en`, y renderiza **ambos** bloques de markup, cada uno marcado con `data-lang-content="es"` o `data-lang-content="en"`.
- El idioma visible se controla puramente por CSS, vía el atributo `data-lang` en `<html>` (definido globalmente en `src/layouts/Layout.astro`, dentro del `<style is:global>`).
- El idioma inicial se decide en un script inline en `<head>` (antes del primer paint) leyendo `localStorage["cv-lang"]`, con fallback a `navigator.language`.
- El switch de idioma (`src/components/LanguageSwitch.astro`) es el único punto que cambia `data-lang` en runtime, actualiza `localStorage`, el `<title>`, las meta descriptions, y empuja un evento a `dataLayer` (GTM).

**Consecuencia práctica**: si agregas un campo o sección nueva, sigue el mismo patrón — duplica el nodo con `data-lang-content="es"` / `="en"`, no intentes interpolar el string del idioma actual en JS/Astro. Los componentes asumen que `cv.json` y `cv_en.json` tienen la **misma forma y mismo orden de arrays** (p. ej. `work[i]` en ES corresponde a `work[i]` en EN).

## Fuente de datos del CV

- `cv.json` / `cv_en.json` en la raíz del repo, tipados por [`src/cv.d.ts`](src/cv.d.ts) (interfaz `CV`: `basics`, `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, `projects`).
- Importados vía alias de TS `@cv` / `@cv_en`, definidos en `tsconfig.json` → `compilerOptions.paths` (apuntan directo a los `.json`).
- Es una extensión del esquema estándar [JSON Resume](https://jsonresume.org/schema/) (campos añadidos como `logo`, `type` en `Work`, `frameworkIcons`/`github`/`webflow`/`shopify` en `Projects`).
- Al editar el CV, mantener sincronizados ambos idiomas: mismo número de entradas, mismos `startDate`/`endDate`/`logo`/`skills`, solo cambia el texto.

## Estructura relevante

```
cv.json, cv_en.json          # datos del CV (fuente de verdad)
src/cv.d.ts                  # tipos del CV
src/layouts/Layout.astro     # <head>: SEO, GTM/GA4, CSS global, resolución de idioma inicial
src/pages/index.astro        # única página, compone las secciones en orden
src/components/
  Section.astro              # wrapper genérico <section> (scroll reveal via CSS view-timeline)
  LanguageSwitch.astro       # botón ES/EN interactivo (isla de cliente)
  KeyboardManager.astro      # paleta de comandos (hotkeypad) + atajo de impresión
  sections/
    Hero.astro                # nombre, título, ubicación, contacto, redes
    About.astro                # resumen
    Experience.astro           # trabajos + iconos de skills por puesto
    Education.astro            # educación, cursos, certificaciones
    Projects.astro             # proyectos personales/freelance
    Skills.astro                # skills agrupadas por nivel + idiomas
src/icons/                   # un componente .astro por icono (tecnologías, redes sociales)
src/lib/icons.ts             # helper de carga dinámica de iconos (import.meta.glob)
public/                      # imágenes, PDFs de certificados, favicons
vercel.json                  # headers de seguridad + cache, deploy en Vercel
astro.config.mjs             # site, output: "static", alias "@" -> src/
tsconfig.json                # strict + paths (@cv, @cv_en, @/*)
```

## Patrón de resolución de iconos

Varias secciones (`Hero`, `Experience`, `Projects`, `Skills`, `KeyboardManager`) resuelven iconos dinámicamente por nombre:

1. Se hace `slugify(name)` (minúsculas, sin espacios/puntos/guiones) sobre el `skill`/`network`/tecnología del JSON del CV.
2. Se busca primero en `src/icons/*.astro` vía `import.meta.glob`.
3. Si no hay match, se busca en `public/icons/*.svg`.
4. Si no hay match en ninguno, no se renderiza icono (fallan en silencio).

Para que un skill/tecnología nueva en el CV muestre icono, hay que crear `src/icons/<slug>.astro` (o `.svg` en `public/icons/`) con el nombre exacto en minúsculas.

Nota: esta lógica de resolución de iconos está **duplicada** entre `Experience.astro`, `Projects.astro`, `Skills.astro` y (parcialmente) `src/lib/icons.ts`/`Hero.astro`. Si se toca, considerar si vale la pena consolidar, pero no es prerequisito para cambios puntuales.

## Analítica y SEO ya integrados

- Google Tag Manager (`GTM-MTD6TJZT`) y GA4 (`G-W1Q1L41MZ3`) cargados inline en `Layout.astro`. El cambio de idioma dispara un evento `change_language` al `dataLayer`.
- `@vercel/analytics` (Vercel Analytics) también integrado.
- `astro-robots-txt` genera `robots.txt`; Astro genera sitemap automáticamente.
- Meta description SEO es **estática y corta**, distinta del `summary` largo del CV — está hardcodeada en `Layout.astro` (`seoDescription_es` / `seoDescription_en`), no se lee del JSON.

## Impresión / PDF

El CV está pensado para imprimirse (`Cmd/Ctrl+P`, disponible también como comando en la paleta `hotkeypad`):
- `.no-print` oculta UI interactiva (switch de idioma, footer, botón de paleta de comandos) en `@media print`.
- `.print` (oculto normalmente) se muestra solo al imprimir — contacto en texto plano.
- `article { break-inside: avoid }` evita cortes de página dentro de un ítem.
- La sección de proyectos y las animaciones de scroll-reveal se desactivan al imprimir.

## Cosas a tener en cuenta al modificar

- **No crear rutas nuevas por idioma.** El patrón bilingüe es contenido duplicado + `data-lang-content`, no rutas ni redirects.
- **`src/lib/language.js`** es un store de idioma simple que parece código legacy/no usado — `LanguageSwitch.astro` maneja el idioma de forma independiente vía atributos DOM + `localStorage["cv-lang"]`. Verificar antes de asumir que `language.js` está en uso.
- **Alias `@` → `src/`** está configurado tanto en `astro.config.mjs` (Vite) como en `tsconfig.json` (para el type-checker); si se agrega un alias nuevo, hay que declararlo en ambos lugares.
- **No hay tests automatizados.** La validación es `astro check` (parte de `pnpm build`) y revisión manual en el navegador (`pnpm dev` / `pnpm preview`).
- El proyecto usa **pnpm** exclusivamente (`packageManager: "pnpm@9.0.0"` en `package.json`); no usar `npm`/`yarn`.
- Deploy es a Vercel; `vercel.json` controla headers de seguridad y cache — cualquier cambio en headers de seguridad/cache va ahí, no en código de la app.
