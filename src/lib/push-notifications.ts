import webpush, { type PushSubscription } from "web-push";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
};

export function hasVapidEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID web push credentials are not configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function toWebPushSubscription(subscription: StoredPushSubscription): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh_key,
      auth: subscription.auth_key,
    },
  };
}

export async function sendPush(subscription: StoredPushSubscription, payload: unknown) {
  configureWebPush();
  return webpush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload));
}

export function isExpiredSubscriptionStatus(statusCode?: number) {
  return statusCode === 404 || statusCode === 410;
}
