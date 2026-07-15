"use client";

import { useEffect, useRef } from "react";

/** Demo walkthrough hosted on R2 */
export const DEMO_VIDEO_URL =
  "https://pub-2c4f6af5fd944c8f8e130ea1e57ca053.r2.dev/Thynkk%20%E2%80%94%20Stop%20Lurking.%20Start%20Replying..mp4";

interface DemoVideoProps {
  className?: string;
}

export function DemoVideo({ className = "" }: DemoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Browsers allow autoplay when muted + playsInline; kick play after mount
    el.muted = true;
    const play = () => {
      void el.play().catch(() => {
        // Autoplay blocked — user can hit play controls
      });
    };
    play();
    const onVisible = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0E1223] shadow-[0_0_40px_rgba(99,102,241,0.12)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[#1E293B] bg-[#020617]/80 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/80" aria-hidden />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-[#64748B]">
          Demo · autoplay
        </span>
      </div>
      <video
        ref={ref}
        className="aspect-video w-full bg-black object-contain"
        src={DEMO_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="auto"
        title="Thynkk — Stop Lurking. Start Replying. Demo"
      >
        <a href={DEMO_VIDEO_URL}>Watch the demo video</a>
      </video>
    </div>
  );
}
