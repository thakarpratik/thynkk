"use client";

import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? "P-57T49130US0841254NI3ATSY";

type PayPalButtons = {
  render: (container: HTMLElement) => void;
};

type PayPalSDK = {
  Buttons: (config: {
    style?: Record<string, string>;
    createSubscription: (
      data: unknown,
      actions: { subscription: { create: (opts: { plan_id: string }) => Promise<string> } },
    ) => Promise<string>;
    onApprove: (data: { subscriptionID?: string }) => void | Promise<void>;
    onError?: (err: unknown) => void;
  }) => PayPalButtons;
};

declare global {
  interface Window {
    paypal?: PayPalSDK;
  }
}

interface PayPalSubscribeProps {
  onSuccess: (subscriptionId: string) => Promise<void>;
  onError?: (message: string) => void;
}

export function PayPalSubscribe({ onSuccess, onError }: PayPalSubscribeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) {
      setLoadError("PayPal is not configured.");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const renderButtons = () => {
      if (cancelled || !containerRef.current || !window.paypal) return;

      containerRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription(_data, actions) {
            return actions.subscription.create({ plan_id: PLAN_ID });
          },
          async onApprove(data) {
            const subscriptionId = data.subscriptionID;
            if (!subscriptionId) {
              onError?.("PayPal did not return a subscription ID.");
              return;
            }
            setBusy(true);
            try {
              await onSuccess(subscriptionId);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Subscription activation failed.";
              onError?.(msg);
            } finally {
              setBusy(false);
            }
          },
          onError(err) {
            const msg = err instanceof Error ? err.message : "PayPal checkout failed.";
            onError?.(msg);
          },
        })
        .render(containerRef.current);
    };

    if (window.paypal) {
      renderButtons();
      return () => { cancelled = true; };
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-thynkk-paypal="true"]');
    if (existing) {
      existing.addEventListener("load", renderButtons);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", renderButtons);
      };
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&vault=true&intent=subscription`;
    script.async = true;
    script.dataset.thynkkPaypal = "true";
    script.onload = renderButtons;
    script.onerror = () => setLoadError("Could not load PayPal checkout.");
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
    };
  }, [onSuccess, onError]);

  if (loadError) {
    return <p className="text-sm text-[#EF4444] font-mono">{loadError}</p>;
  }

  return (
    <div className="relative">
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0F1E]/80 rounded-md">
          <p className="text-sm font-mono text-[#94A3B8]">Activating Pro…</p>
        </div>
      )}
      <div ref={containerRef} className="min-h-[120px]" />
    </div>
  );
}