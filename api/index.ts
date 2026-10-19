process.env.VERCEL = '1';
import app from '../server.ts';

export default function handler(req: any, res: any) {
  let targetUrl = req.url || '';

  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const vercelRoute = parsed.searchParams.get('__vercel_route');
    if (vercelRoute) {
      parsed.searchParams.delete('__vercel_route');
      const searchStr = parsed.searchParams.toString();
      targetUrl = `/api/${vercelRoute}` + (searchStr ? `?${searchStr}` : '');
    } else if (req.headers['x-now-route-matches']) {
      const matchHeader = String(req.headers['x-now-route-matches']);
      const params = new URLSearchParams(matchHeader);
      const match1 = params.get('1');
      if (match1) {
        targetUrl = `/api/${decodeURIComponent(match1)}`;
      }
    } else if (req.headers['x-forwarded-uri']) {
      targetUrl = String(req.headers['x-forwarded-uri']);
    } else if (
      req.headers['x-matched-path'] &&
      req.headers['x-matched-path'] !== '/api' &&
      req.headers['x-matched-path'] !== '/api/index'
    ) {
      targetUrl = String(req.headers['x-matched-path']);
    }
  } catch (e) {
    console.warn('[Vercel Gateway] URL parsing fallback:', e);
  }

  // Ensure leading /api is present for Express API router
  if (!targetUrl.startsWith('/api')) {
    targetUrl = '/api' + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl);
  }

  req.url = targetUrl;
  return app(req, res);
}
