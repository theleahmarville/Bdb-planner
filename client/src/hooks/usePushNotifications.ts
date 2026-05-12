import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");

  const { data: vapidKey } = trpc.push.vapidPublicKey.useQuery();
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // Check current status on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "unsubscribed");
    }).catch(() => setStatus("unsubscribed"));
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidKey) { toast.error("Push notifications not configured on this server"); return; }
    try {
      setStatus("loading");
      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        toast.error("Notification permission denied. Enable it in your browser settings.");
        return;
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = sub.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: subJson.keys?.p256dh ?? "",
        auth: subJson.keys?.auth ?? "",
      });

      setStatus("subscribed");
      toast.success("Push notifications enabled! 🔔");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setStatus("unsubscribed");
      toast.error("Could not enable push notifications");
    }
  }, [vapidKey, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    try {
      setStatus("loading");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
      toast.success("Push notifications disabled");
    } catch (err) {
      console.error("Push unsubscribe error:", err);
      setStatus("subscribed");
      toast.error("Could not disable push notifications");
    }
  }, [unsubscribeMutation]);

  return { status, subscribe, unsubscribe };
}
