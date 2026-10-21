// BarberOS Production Service Worker - Real Web Push & Notification Handling
// Handles: Remote Push (FCM/APNs/Mozilla), Background Wakeup, Vibration, Sound Chime, and Window Focus

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if any
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    ])
  );
});

// Push Event: Received when server dispatches via web-push / FCM / APNs
self.addEventListener('push', (event) => {
  let data = {
    title: '✂️ BarberOS - Fila Virtual',
    body: 'Atualização no seu atendimento!',
    type: 'CALLED',
    ticketNumber: 0,
    url: '/',
    vibratePattern: [500, 200, 500, 200, 1000, 300, 1000, 300, 1200],
    tag: 'queue-update',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const isCalled =
    data.type === 'CALLED' ||
    (data.title && (data.title.includes('vez') || data.title.includes('chamando'))) ||
    (data.body && (data.body.includes('vez') || data.body.includes('cadeira')));
  const isNext = data.type === 'NEXT';

  const vibration =
    data.vibratePattern ||
    (isCalled
      ? [500, 200, 500, 200, 1000, 300, 1000, 300, 1200]
      : isNext
      ? [350, 150, 350, 150, 350]
      : [250, 100, 250]);

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || `queue-${data.type || 'called'}-${Date.now()}`,
    vibrate: vibration,
    renotify: true,
    requireInteraction: isCalled, // Keeps notification active on Android / Desktop until user acts
    silent: false, // Explicitly enables system notification ringtone & alert
    actions: [
      {
        action: 'open',
        title: isCalled ? '✂️ Ver Fila / Estou a Caminho' : '👀 Ver Posição',
      },
    ],
    data: {
      ...data,
      isCalled,
      receivedAt: Date.now(),
    },
  };

  // Broadcast push data to any currently active windows/tabs in the foreground
  const notifyClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'REMOTE_PUSH_RECEIVED',
          payload: { ...data, isCalled },
        });
      });
    });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      notifyClients,
    ])
  );
});

// Notification Click: User taps the push notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If an existing window is open, focus it and notify it
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_CLICKED',
              payload: notifData,
            });
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
