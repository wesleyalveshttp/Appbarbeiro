process.env.VERCEL = '1';
import app from '../server.ts';

export default function handler(req: any, res: any) {
  // Extract real request URL on Vercel
  const realUrl =
    req.headers['x-forwarded-uri'] ||
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.url ||
    '';

  if (realUrl && realUrl !== '/api' && realUrl !== '/api/index') {
    req.url = realUrl;
  }

  // Ensure /api prefix is retained for Express router matching
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  return app(req, res);
}
