interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-[#0E1223] border border-[#EF4444]/30 rounded-lg p-8 text-center">
      <p className="font-mono text-sm text-[#EF4444] mb-1">Scan failed</p>
      <p className="text-xs text-[#94A3B8] mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-white px-4 py-2 rounded-md font-mono transition-all cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
