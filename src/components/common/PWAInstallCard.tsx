import React from 'react';

// Customer app download option completely removed per user request.
// Customers wait directly in their mobile/desktop browser.
export const PWAInstallCard: React.FC<{
  variant?: 'banner' | 'card' | 'compact';
  organizationName?: string;
}> = () => null;
