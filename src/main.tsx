import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { NotificationService } from './services/notificationService';

// Ensure Service Worker is registered and active
NotificationService.initServiceWorkerAndListeners().catch(() => {});

createRoot(document.getElementById('root')!).render(<App />);
