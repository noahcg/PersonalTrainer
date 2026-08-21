self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function showTrainerNotification(title, payload) {
  return self.registration.showNotification(title || "Appointment reminder", {
    body: payload.body || "You have an upcoming appointment.",
    tag: payload.tag || "trainer-appointment-reminder",
    data: {
      url: payload.url || "/trainer/calendar",
    },
    requireInteraction: Boolean(payload.requireInteraction),
  });
}

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    showTrainerNotification(payload.title, payload).catch(() =>
      showTrainerNotification("Appointment reminder", {
        body: "You have an upcoming appointment.",
        tag: "trainer-appointment-reminder-fallback",
        url: "/trainer/calendar",
      }),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/trainer/calendar";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(url)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    }),
  );
});
