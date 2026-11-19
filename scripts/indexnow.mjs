import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const origin = "https://alonsoct.dev";
const endpoint = "https://api.indexnow.org/indexnow";
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));

export async function readKey() {
  const files = await readdir(publicDir);
  const keys = [];
  for (const file of files) {
    const match = /^([a-zA-Z0-9-]{8,128})\.txt$/.exec(file);
    if (match) {
      let contents;
      try {
        contents = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");
      } catch {
        throw new Error("No se pudo leer un archivo de verificación en public/.");
      }
      if (contents.trim() === match[1]) keys.push(match[1]);
    }
  }
  if (keys.length !== 1) throw new Error("Se requiere exactamente un archivo de clave IndexNow válido en public/.");
  return keys[0];
}

function decodeXml(value) {
  return value.replace(/&([^;]+);/g, (_, entity) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (Object.hasOwn(named, entity)) return named[entity];
    if (/^#\d+$/.test(entity)) return String.fromCodePoint(Number(entity.slice(1)));
    if (/^#x[\da-f]+$/i.test(entity)) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    throw new Error("Entidad XML no admitida en el sitemap.");
  });
}

export function sitemapUrls(xml) {
  xml = xml.replace(/<!--[\s\S]*?-->/g, "");
  if (!/<(?:[\w-]+:)?urlset(?:\s|>)/i.test(xml)) throw new Error("El sitemap no contiene un urlset.");
  const urls = [];
  for (const match of xml.matchAll(/<(?:[\w-]+:)?url(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?url\s*>/gi)) {
    const loc = /<(?:[\w-]+:)?loc(?:\s[^>]*)?>([^<]+)<\/(?:[\w-]+:)?loc\s*>/i.exec(match[1]);
    if (!loc) throw new Error("Entrada del sitemap sin URL.");
    urls.push(decodeXml(loc[1].trim()));
  }
  if (!urls.length) throw new Error("El sitemap no contiene URLs.");
  if ([...xml.matchAll(/<(?:[\w-]+:)?url(?=\s|>)/gi)].length !== urls.length) {
    throw new Error("El sitemap contiene una entrada URL inválida.");
  }
  return urls;
}

export function candidateUrls(urls) {
  const result = new Set();
  for (const value of urls) {
    let url;
    try { url = new URL(value); } catch { throw new Error("El sitemap contiene una URL inválida."); }
    if (url.origin !== origin || url.username || url.password || url.hash) continue;
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { throw new Error("Ruta inválida en el sitemap."); }
    if (path.startsWith("/_astro/") || /\.[a-z\d]{1,16}$/i.test(path)) continue;
    result.add(url.href);
  }
  return [...result];
}

function robotsAllows(robots, url) {
  const groups = [];
  let group;
  for (const line of robots.split(/\r?\n/)) {
    const [field, ...rest] = line.split("#", 1)[0].split(":");
    const name = field.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (name === "user-agent" && value) {
      if (!group || group.hasRules) groups.push(group = { agents: [], rules: [], hasRules: false });
      group.agents.push(value.toLowerCase());
    } else if (group && (name === "allow" || name === "disallow")) {
      group.hasRules = true;
      if (value) group.rules.push({ allow: name === "allow", path: value });
    }
  }
  const specific = groups.filter(({ agents }) => agents.some((agent) => agent !== "*" && "bingbot".includes(agent)));
  const selected = specific.length ? specific : groups.filter(({ agents }) => agents.includes("*"));
  const path = new URL(url).pathname + new URL(url).search;
  const matches = selected.flatMap(({ rules }) => rules).filter((rule) => {
    const end = rule.path.endsWith("$");
    const pattern = (end ? rule.path.slice(0, -1) : rule.path)
      .split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp(`^${pattern}${end ? "$" : ""}`).test(path);
  });
  matches.sort((a, b) => b.path.replace(/[*$]/g, "").length - a.path.replace(/[*$]/g, "").length || Number(b.allow) - Number(a.allow));
  return matches.length === 0 || matches[0].allow;
}

function attributes(tag) {
  const values = {};
  for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    values[match[1].toLowerCase()] = decodeXml(match[2] ?? match[3] ?? match[4]);
  }
  return values;
}

export function indexablePage(url, html, headers) {
  if (!/^text\/html(?:;|$)/i.test(headers.get("content-type") ?? "")) return false;
  if (/\b(noindex|none)\b/i.test(headers.get("x-robots-tag") ?? "")) return false;
  const head = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1];
  if (!head) throw new Error("La página no contiene un head válido.");
  const clean = head.replace(/<!--[\s\S]*?-->/g, "");
  const metas = [...clean.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag));
  if (metas.some((meta) => /^(robots|bingbot)$/i.test(meta.name ?? "") && /\b(noindex|none)\b/i.test(meta.content ?? ""))) return false;
  const canonicals = [...clean.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag))
    .filter((link) => (link.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"));
  if (canonicals.length !== 1 || !canonicals[0].href) throw new Error("La página debe tener un canonical válido y único.");
  return new URL(canonicals[0].href, url).href === url;
}

async function request(fetchImpl, url, options = {}) {
  try {
    return await fetchImpl(url, { ...options, redirect: "error", signal: AbortSignal.timeout(10000) });
  } catch {
    throw new Error("No se pudo completar una solicitud IndexNow o de verificación (red, redirección o timeout).");
  }
}

async function getText(fetchImpl, url, description) {
  const response = await request(fetchImpl, url);
  if (response.status !== 200) throw new Error(`${description}: HTTP ${response.status}.`);
  return readText(response, description);
}

async function readText(response, description) {
  try {
    return await response.text();
  } catch {
    throw new Error(`${description}: no se pudo leer la respuesta.`);
  }
}

export async function submitIndexNow(key, fetchImpl = fetch) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error("La clave IndexNow no es válida.");
  const publishedKey = await getText(fetchImpl, `${origin}/${key}.txt`, "Archivo de verificación");
  if (publishedKey.trim() !== key) throw new Error("La clave publicada no coincide con la clave local.");
  const robots = await getText(fetchImpl, `${origin}/robots.txt`, "robots.txt");
  const sitemap = await getText(fetchImpl, `${origin}/sitemap.xml`, "Sitemap");
  const candidates = candidateUrls(sitemapUrls(sitemap)).filter((url) => robotsAllows(robots, url));
  const urls = [];
  for (const url of candidates) {
    const response = await request(fetchImpl, url);
    if (response.status !== 200) throw new Error(`Una página del sitemap no está disponible: HTTP ${response.status}.`);
    if (indexablePage(url, await readText(response, "Página del sitemap"), response.headers)) urls.push(url);
  }
  if (!urls.length) throw new Error("No hay páginas canónicas e indexables para enviar.");
  for (let i = 0; i < urls.length; i += 10000) {
    const payload = { host: new URL(origin).host, key, urlList: urls.slice(i, i + 10000) };
    const response = await request(fetchImpl, endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow rechazó el envío: HTTP ${response.status}.`);
    }
    console.log(`IndexNow: ${payload.urlList.length} URL(s), HTTP ${response.status}${response.status === 202 ? " (validación pendiente)" : ""}.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.env.INDEXNOW_PRODUCTION_DEPLOYMENT !== "true") {
    console.error("IndexNow solo puede ejecutarse tras un deploy de producción confirmado.");
    process.exitCode = 1;
  } else {
    try {
      await submitIndexNow(await readKey());
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Error desconocido de IndexNow.");
      process.exitCode = 1;
    }
  }
}
