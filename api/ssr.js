import '../dist/server/entry.mjs';
import { renderPage } from 'vike/server';

export default async function handler(req, res) {
  const rewrittenPath = typeof req.query?.path === 'string' && req.query.path.length
    ? `/${req.query.path}`
    : null;

  let urlOriginal = rewrittenPath || req.url;

  // Keep non-routing query params when Vercel rewrites /:path* to /api/ssr?path=...
  if (rewrittenPath && req.url.includes('?')) {
    const qs = req.url.split('?')[1] || '';
    const rest = qs
      .split('&')
      .filter((part) => part && !part.startsWith('path='));
    if (rest.length > 0) {
      urlOriginal = `${rewrittenPath}?${rest.join('&')}`;
    }
  }

  const pageContextInit = {
    urlOriginal,
    headersOriginal: req.headers,
    method: req.method,
  };

  const pageContext = await renderPage(pageContextInit);
  const { httpResponse } = pageContext;

  if (!httpResponse) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('SSR render failed: no httpResponse returned.');
    return;
  }

  res.statusCode = httpResponse.statusCode;
  httpResponse.headers.forEach(([name, value]) => res.setHeader(name, value));

  if (httpResponse.pipe) {
    httpResponse.pipe(res);
    return;
  }

  const body = await httpResponse.getBody();
  res.end(body);
}
