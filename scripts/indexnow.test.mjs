import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { candidateUrls, indexablePage, sitemapUrls, submitIndexNow } from "./indexnow.mjs";

const key = "test-key-123456";
const root = "https://alonsoct.dev/";
const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
const html = (url, extra = "") => `<head><link href="${url}" rel="canonical">${extra}</head>`;

test("sitemap extraction and candidate filtering", () => {
  const xml = `<urlset><url><loc>${root}</loc></url><url><loc>${root}</loc></url>
    <url><loc>https://preview.vercel.app/</loc></url><url><loc>http://localhost/</loc></url>
    <url><loc>${root}docs/file.pdf</loc></url><url><loc>${root}me.webp</loc></url>
    <url><loc>${root}_astro/app.js</loc></url><url><loc>${root}page?x=1&amp;y=2</loc></url></urlset>`;
  assert.deepEqual(candidateUrls(sitemapUrls(xml)), [root, `${root}page?x=1&y=2`]);
  assert.throws(() => sitemapUrls("<sitemapindex/>"), /urlset/);
  assert.throws(() => sitemapUrls(`<urlset><url><loc>${root}</loc></url><url>`), /inválida/);
});

test("pages require a matching canonical and no noindex directives", () => {
  assert(indexablePage(root, html(root), headers));
  assert(!indexablePage(root, html(`${root}other`), headers));
  assert(!indexablePage(root, html(root, '<meta content="noindex, follow" name="robots">'), headers));
  assert(!indexablePage(root, html(root), new Headers({ "content-type": "text/html", "x-robots-tag": "noindex" })));
  assert(!indexablePage(root, html(root), new Headers({ "content-type": "application/pdf" })));
});

function mockFetch({ keyText = key, postStatus = 200, robots = "User-agent: *\nAllow: /", extraPage = "" } = {}) {
  const posts = [];
  return {
    posts,
    fetch: async (url, options) => {
      assert.equal(options.redirect, "error");
      assert(options.signal);
      if (url === `${root}${key}.txt`) return new Response(keyText);
      if (url === `${root}robots.txt`) return new Response(robots);
      if (url === `${root}sitemap.xml`) return new Response(`<urlset><url><loc>${root}</loc></url><url><loc>${root}</loc></url><url><loc>${root}hidden</loc></url><url><loc>https://example.com/</loc></url></urlset>`);
      if (url === root) return new Response(html(root), { headers });
      if (url === `${root}hidden`) return new Response(html(url, extraPage), { headers });
      if (url === "https://api.indexnow.org/indexnow") {
        posts.push(JSON.parse(options.body));
        return new Response(null, { status: postStatus });
      }
      throw new Error("Unexpected request");
    },
  };
}

test("submission validates production and sends only unique indexable URLs", async () => {
  const mock = mockFetch({ robots: "User-agent: *\nDisallow: /hidden", postStatus: 202 });
  await submitIndexNow(key, mock.fetch);
  assert.deepEqual(mock.posts, [{ host: "alonsoct.dev", key, urlList: [root] }]);
});

test("empty robots directives do not merge separate user-agent groups", async () => {
  const mock = mockFetch({ robots: "User-agent: bingbot\nDisallow:\nUser-agent: *\nDisallow: /" });
  await submitIndexNow(key, mock.fetch);
  assert.deepEqual(mock.posts[0].urlList, [root, `${root}hidden`]);
});

test("noindex is excluded and errors prevent or fail submission", async () => {
  const noindex = mockFetch({ extraPage: '<meta name="bingbot" content="noindex">' });
  await submitIndexNow(key, noindex.fetch);
  assert.deepEqual(noindex.posts[0].urlList, [root]);
  const invalid = mockFetch({ keyText: "wrong" });
  await assert.rejects(submitIndexNow(key, invalid.fetch), /clave publicada/);
  assert.equal(invalid.posts.length, 0);
  await assert.rejects(submitIndexNow(key, mockFetch({ postStatus: 429 }).fetch), /HTTP 429/);
  await assert.rejects(submitIndexNow(key, async () => { throw new Error(`network ${key}`); }), (error) => {
    assert.match(error.message, /timeout/);
    assert(!error.message.includes(key));
    return true;
  });
  await assert.rejects(submitIndexNow(key, async () => ({
    status: 200,
    text: async () => { throw new Error(`body ${key}`); },
  })), (error) => {
    assert.match(error.message, /no se pudo leer/);
    assert(!error.message.includes(key));
    return true;
  });
});

test("direct execution is disabled without a production deployment signal", () => {
  const result = spawnSync(process.execPath, ["scripts/indexnow.mjs"], {
    encoding: "utf8",
    env: { ...process.env, INDEXNOW_PRODUCTION_DEPLOYMENT: "" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /deploy de producción/);
});
