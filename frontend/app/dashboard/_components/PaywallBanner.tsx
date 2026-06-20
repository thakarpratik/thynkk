const LockIcon = () => (
  <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

interface PaywallBannerProps {
  onUpgrade?: () => void;
}

export function PaywallBanner({ onUpgrade }: PaywallBannerProps) {
  return (
    <div
      className="bg-[#0E1223] border border-[#6366F1]/50 rounded-lg p-6 text-center"
      style={{ boxShadow: "0 0 24px rgba(99,102,241,0.15)" }}
    >
      <div className="w-10 h-10 rounded-full bg-[#6366F1]/20 flex items-center justify-center mx-auto mb-3">
        <LockIcon />
      </div>
      <h3 className="font-mono font-bold text-base mb-1">3 more pain points found</h3>
      <p className="text-sm text-[#94A3B8] mb-4">
        Upgrade to Pro to unlock the full report, exports, and weekly digests.
      </p>
      <button
        onClick={onUpgrade}
        className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors cursor-pointer"
      >
        Unlock full report — $19/mo
      </button>
      <p className="text-xs text-[#94A3B8] mt-2">Cancel anytime</p>
    </div>
  );
}
