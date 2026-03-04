// src/lib/icons.ts
// Tipo para iconos Astro
export type AstroIcon = (props?: any) => any

const ICONS: Record<string, AstroIcon> = {}

const iconModules = import.meta.glob<{ default: AstroIcon }>('@/icons/*.astro')

for (const [path, loader] of Object.entries(iconModules)) {
  const name = path.split('/').pop()!.replace('.astro','').toLowerCase()
  // cargamos el módulo dinámicamente
  ICONS[name] = (await loader()).default
}

export default ICONS