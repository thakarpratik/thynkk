export function ScanningState() {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        <div>
          <p className="font-mono text-sm text-[#F8FAFC] mb-1">Scanning Reddit...</p>
          <p className="text-xs text-[#94A3B8]">
            Fetching posts · Filtering pain signals · Clustering with AI
          </p>
        </div>
        <div className="w-full max-w-xs bg-[#1A1E2F] rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-[#6366F1] rounded-full animate-pulse"
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}
