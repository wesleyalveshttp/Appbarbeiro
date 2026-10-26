// BarberOS Production Service Worker - Persistent Background Web Push & Notification Engine
// Handles: RFC 8292 Push (FCM / APNs / Mozilla), Background Wakeup, Persistent Vibrations,
// Action Buttons ("Estou a Caminho", "+3 min"), Window Focus, and Sound Chimes.

const CACHE_NAME = 'barberos-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge obsolete caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// ---------------------------------------------------------------------------
// 1. PUSH EVENT: Triggered in background when server sends Web Push
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {
    title: '✂️ BarberOS - Fila Virtual',
    body: 'Atualização no seu atendimento!',
    type: 'CALLED',
    ticketNumber: 0,
    queueId: null,
    organizationId: null,
    url: '/',
    vibratePattern: [600, 200, 600, 200, 1000, 250, 1000],
    tag: 'queue-call-alert',
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
    (data.title && (data.title.includes('vez') || data.title.includes('chamando') || data.title.includes('CADEIRA'))) ||
    (data.body && (data.body.includes('vez') || data.body.includes('cadeira')));
  const isNext = data.type === 'NEXT';

  const vibration =
    data.vibratePattern ||
    (isCalled
      ? [600, 200, 600, 200, 1000, 250, 1000, 250, 1200]
      : isNext
      ? [350, 150, 350, 150, 350]
      : [250, 100, 250]);

  // Action buttons rendered directly on native push notification (Android / Desktop)
  const actionButtons = [];
  if (isCalled) {
    actionButtons.push(
      {
        action: 'on_my_way',
        title: '🏃 Estou a Caminho',
      },
      {
        action: 'tolerance',
        title: '⏱️ +3 min',
      },
      {
        action: 'open_ticket',
        title: '✂️ Abrir Senha',
      }
    );
  } else if (isNext) {
    actionButtons.push({
      action: 'open_ticket',
      title: '💈 Ver Minha Posição',
    });
  }

  const notificationOptions = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || `barberos-${data.type || 'called'}-${data.ticketNumber || Date.now()}`,
    vibrate: vibration,
    renotify: true,
    requireInteraction: isCalled, // Keeps notification persistently on screen until user interacts!
    silent: false, // Forces device ringtone and physical vibration
    actions: actionButtons,
    data: {
      ...data,
      isCalled,
      receivedAt: Date.now(),
    },
  };

  // Broadcast push data to any currently open browser tabs/windows
  const notifyWindowsPromise = self.clients
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
      self.registration.showNotification(data.title, notificationOptions),
      notifyWindowsPromise,
    ])
  );
});

// ---------------------------------------------------------------------------
// 2. NOTIFICATION CLICK: Handles interaction with body or action buttons
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const queueId = notifData.queueId;
  const action = event.action; // 'on_my_way', 'tolerance', 'open_ticket', or empty string (body clicked)
  const targetUrl = notifData.url || '/';

  // 1. If user clicked a direct action button, dispatch response to backend in background
  const backgroundActionPromise = (async () => {
    if (action === 'on_my_way' && queueId) {
      try {
        await fetch('/api/queue/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueId,
            response: 'A_CAMINHO',
            organizationId: notifData.organizationId,
          }),
        });
      } catch (err) {
        console.warn('SW respond error:', err);
      }
    } else if (action === 'tolerance' && queueId) {
      try {
        await fetch('/api/queue/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueId,
            response: 'PEDIU_TOLERANCIA',
            organizationId: notifData.organizationId,
          }),
        });
      } catch (err) {
        console.warn('SW respond error:', err);
      }
    }
  })();

  // 2. Bring window to front or open new window, and trigger audio confirmation
  const windowFocusPromise = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(async (clientList) => {
      // Find matching client by url or origin
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICKED',
            payload: notifData,
            action: action || 'BODY_CLICK',
            playAlarm: true,
          });
          return;
        }
      }

      // If no window open, open window with the ticket URL
      if (self.clients.openWindow) {
        const newWindow = await self.clients.openWindow(targetUrl);
        if (newWindow && 'focus' in newWindow) {
          await newWindow.focus();
        }
      }
    });

  event.waitUntil(Promise.all([backgroundActionPromise, windowFocusPromise]));
});

// ---------------------------------------------------------------------------
// 3. NOTIFICATION CLOSE: User dismissed notification
// ---------------------------------------------------------------------------
self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_DISMISSED',
          payload: notifData,
        });
      });
    });
});
