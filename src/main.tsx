import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { NotificationService } from './services/notificationService';

import { ErrorBoundary } from './components/common/ErrorBoundary';

// Ensure Service Worker is registered and active
NotificationService.initServiceWorkerAndListeners().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
