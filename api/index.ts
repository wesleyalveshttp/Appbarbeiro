process.env.VERCEL = process.env.VERCEL || '1';
import app from '../server.ts';

export default function handler(req: any, res: any) {
  // Normalize URL if Vercel strips the /api prefix during serverless routing
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
}
