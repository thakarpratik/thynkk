export function IdleState() {
  return (
    <div className="text-center py-16 text-[#94A3B8]">
      <svg
        className="w-10 h-10 mx-auto mb-4 opacity-30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <p className="font-mono text-sm">Enter a niche or subreddit to start scanning</p>
      <p className="text-xs mt-2 text-[#94A3B8]/60">
        Try: r/freelance · productivity apps · solo founder
      </p>
    </div>
  );
}
