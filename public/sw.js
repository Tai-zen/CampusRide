self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'CampusRide', body: 'You have a new transit notification.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'CampusRide', body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logos/Gemini_Generated_Image_rzug5irzug5irzug.png',
      badge: '/logos/Gemini_Generated_Image_rzug5irzug5irzug.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'campusride-notif',
      renotify: true,
      data: {
        url: '/'
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
