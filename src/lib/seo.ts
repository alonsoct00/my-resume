export const seoDescriptions = {
  es: "Frontend Developer con más de 10 años de experiencia en React, Vue, Astro, Webflow y Shopify. Especializado en UX, rendimiento web y SEO técnico.",
  en: "Frontend Developer with over 10 years of experience in React, Vue, Astro, Webflow and Shopify. Specialized in UX, web performance and technical SEO.",
}

export function seoTitle(name: string, label: string): string {
  return `${name} - ${label}`
}
