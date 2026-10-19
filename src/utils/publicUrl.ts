import { Organization } from '../types';

/**
 * Resolves the publicly accessible, worldwide URL for customer links, QR Codes, and WhatsApp invitations.
 * Priority:
 * 1. Explicitly configured custom public URL in salon settings (org.settings.publicAppUrl)
 * 2. VITE_APP_URL / NEXT_PUBLIC_APP_URL / APP_URL environment variable (configured in Vercel or .env)
 * 3. Browser origin (e.g. https://my-app.vercel.app or custom domain)
 * 4. Automatic mapping from private AI Studio dev URL ('ais-dev-*.run.app') to public Shared URL ('ais-pre-*.run.app')
 */
export function getPublicBaseUrl(org?: Organization | null): string {
  // 1. Explicitly configured custom public URL in salon settings
  if (org?.settings?.publicAppUrl && org.settings.publicAppUrl.trim()) {
    let custom = org.settings.publicAppUrl.trim();
    if (!custom.startsWith('http://') && !custom.startsWith('https://')) {
      custom = `https://${custom}`;
    }
    return custom.replace(/\/+$/, '');
  }

  // 2. Vercel / Environment variable URL
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_URL) ||
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || process.env.APP_URL)) ||
    '';

  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Browser origin resolution
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;

    // In Vercel deployments (*.vercel.app) or custom domains, use the current origin
    if (origin.includes('.vercel.app') || (!origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('ais-dev-'))) {
      return origin.replace(/\/+$/, '');
    }

    // When running inside AI Studio dev container, ais-dev is private to developer session.
    // The public shared url uses 'ais-pre'
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }

    return origin.replace(/\/+$/, '');
  }

  return 'https://ais-pre-v5rbu35zpzcopc6uev26pu-187272410426.us-west2.run.app';
}

export function isDevContainerUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

export function getInternalDevUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
