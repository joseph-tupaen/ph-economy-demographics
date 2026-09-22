import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap-index.xml", site)}\n`);
