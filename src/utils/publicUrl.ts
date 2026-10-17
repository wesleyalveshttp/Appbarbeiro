import { Organization } from '../types';

/**
 * Resolves the publicly accessible, worldwide URL for customer links, QR Codes, and WhatsApp invitations.
 * In AI Studio, the internal dev URL ('ais-dev-*.run.app') is private and requires owner login.
 * This helper automatically maps to the public Shared App URL ('ais-pre-*.run.app') or any custom domain
 * configured by the owner so that customers at home can open the link from any cell phone.
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

  // 2. Browser origin resolution
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // When running inside AI Studio dev container, ais-dev is private to developer session.
    // The public shared url uses 'ais-pre'
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
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
