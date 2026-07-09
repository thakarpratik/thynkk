"use client";

import { useEffect, useRef, useState } from "react";
import { PACK_NAME, PACK_PRICE_USD } from "../../_lib/pricing";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

type PayPalButtons = {
  render: (container: HTMLElement) => void;
};

type PayPalSDK = {
  Buttons: (config: {
    style?: Record<string, string>;
    createOrder: (
      data: unknown,
      actions: {
        order: {
          create: (opts: {
            purchase_units: Array<{
              amount: { value: string; currency_code: string };
              description: string;
            }>;
          }) => Promise<string>;
        };
      },
    ) => Promise<string>;
    onApprove: (data: { orderID?: string }) => void | Promise<void>;
    onError?: (err: unknown) => void;
  }) => PayPalButtons;
};

declare global {
  interface Window {
    paypal?: PayPalSDK;
  }
}

interface PayPalSubscribeProps {
  onSuccess: (orderId: string) => Promise<void>;
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
            label: "pay",
          },
          createOrder(_data, actions) {
            return actions.order.create({
              purchase_units: [
                {
                  amount: { value: PACK_PRICE_USD.toFixed(2), currency_code: "USD" },
                  description: `Thynkk ${PACK_NAME} — 3 full growth scans`,
                },
              ],
            });
          },
          async onApprove(data) {
            const orderId = data.orderID;
            if (!orderId) {
              onError?.("PayPal did not return an order ID.");
              return;
            }
            setBusy(true);
            try {
              await onSuccess(orderId);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Payment failed.";
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
    script.src = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=USD&intent=capture`;
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
          <p className="text-sm font-mono text-[#94A3B8]">Adding scans…</p>
        </div>
      )}
      <div ref={containerRef} className="min-h-[120px]" />
    </div>
  );
}