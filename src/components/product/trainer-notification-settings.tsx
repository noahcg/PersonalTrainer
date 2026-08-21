"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PermissionStateLabel = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function notificationPermission(): PermissionStateLabel {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function TrainerNotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [hasCheckedSupport, setHasCheckedSupport] = useState(false);
  const [permission, setPermission] = useState<PermissionStateLabel>("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const isConfigured = Boolean(publicKey);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setIsSupported(supported);
      setHasCheckedSupport(true);
      setPermission(notificationPermission());
      if (!supported) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await registration.update();
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(subscription));
      } catch {
        setMessage("Unable to prepare notifications in this browser.");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function flash(value: string) {
    setMessage(value);
    window.setTimeout(() => setMessage(null), 2600);
  }

  async function enableNotifications() {
    if (!isSupported || !publicKey) return;
    setBusy(true);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        flash("Notifications were not enabled.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/trainer/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: JSON.parse(JSON.stringify(subscription)) }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Unable to save this device for notifications.");
      setSubscribed(true);
      flash("Appointment notifications enabled on this device.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    if (!isSupported) return;
    setBusy(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (subscription) await subscription.unsubscribe();

      if (endpoint) {
        await fetch("/api/trainer/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setSubscribed(false);
      flash("Appointment notifications disabled on this device.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Unable to disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
      const response = await fetch("/api/trainer/push-subscriptions/test", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to send test notification.");
      flash("Test notification sent.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Unable to send test notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Appointment notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.35rem] border border-stone-200 bg-white/80 p-4 text-sm leading-6 text-stone-600">
          {!hasCheckedSupport ? (
            "Checking notification support..."
          ) : isSupported ? (
            <>
              <p className="font-medium text-charcoal-950">
                {subscribed ? "This device is ready for trainer appointment reminders." : "Enable this device for trainer appointment reminders."}
              </p>
              <p className="mt-1">
                Reminders use the offsets selected on calendar appointments and can arrive even when the app is closed.
              </p>
            </>
          ) : (
            "This browser does not support Web Push notifications."
          )}
        </div>

        {!isConfigured ? (
          <p className="text-sm leading-6 text-amber-700">
            Add VAPID keys to the environment before enabling production push notifications.
          </p>
        ) : null}

        {permission === "denied" ? (
          <p className="text-sm leading-6 text-rose-600">
            Notifications are blocked for this site. Enable them in browser or system settings, then return here.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {subscribed ? (
            <Button variant="secondary" onClick={() => void disableNotifications()} disabled={busy}>
              <BellOff className="size-4" />
              Disable this device
            </Button>
          ) : (
            <Button variant="warm" onClick={() => void enableNotifications()} disabled={busy || !isSupported || !isConfigured || permission === "denied"}>
              <BellRing className="size-4" />
              Enable notifications
            </Button>
          )}
          <Button variant="ghost" onClick={() => void sendTest()} disabled={busy || !subscribed}>
            <Send className="size-4" />
            Send test
          </Button>
        </div>

        {message ? <p className="text-sm font-medium text-bronze-700">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
