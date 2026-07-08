import type { PostIdea } from "../_types";

interface PostIdeaCardProps {
  idea: PostIdea;
  index: number;
  isPro: boolean;
  onUpgrade?: () => void;
}

export function PostIdeaCard({ idea, index, isPro, onUpgrade }: PostIdeaCardProps) {
  const locked = idea.locked && !isPro;

  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-[#475569]">Post idea #{index + 1}</span>
        <span className="text-[10px] font-mono text-[#22C55E]">{idea.targetCommunity}</span>
      </div>
      <h3 className="font-mono text-sm text-[#F8FAFC] mb-2">{idea.title}</h3>
      <p className="text-sm text-[#94A3B8] mb-3 leading-relaxed">{idea.hook}</p>
      <ul className="space-y-1.5 mb-3">
        {idea.outline.map((line) => (
          <li key={line} className="text-xs text-[#CBD5E1] flex gap-2">
            <span className="text-[#6366F1]">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[#475569] font-mono">Based on: {idea.basedOnTrend}</p>
      {locked && (
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-3 text-xs font-mono text-[#6366F1] hover:underline cursor-pointer"
        >
          Upgrade for full outline + more post ideas
        </button>
      )}
    </div>
  );
}