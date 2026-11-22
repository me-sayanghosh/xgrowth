import { useMemo } from 'react';
import { MessageCircle, Repeat2, Heart, Bookmark, Share } from 'lucide-react';

export interface XPostPreviewProps {
  text: string;
  authorName?: string;
  handle?: string;
  avatarUrl?: string;
  threadIndex?: number;
  totalParts?: number;
}

export function XPostPreview({
  text,
  authorName = 'Engineering Lead',
  handle = 'techlead',
  avatarUrl,
  threadIndex,
  totalParts,
}: XPostPreviewProps) {
  const charCount = text.length;
  const maxChars = 280;
  const remaining = maxChars - charCount;

  // SVG circular gauge properties
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(charCount / maxChars, 1);
  const strokeDashoffset = circumference - progressRatio * circumference;

  const gaugeColor = useMemo(() => {
    if (charCount > maxChars) return '#ef4444'; // red-500
    if (charCount > 260) return '#f59e0b'; // amber-500
    return '#0284c7'; // sky-600
  }, [charCount]);

  // Highlight hashtags, mentions, and URLs
  const formattedText = useMemo(() => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#') || part.startsWith('@')) {
        return (
          <span key={i} className="text-sky-400 font-medium">
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <span key={i} className="text-sky-400 underline break-all">
            {part}
          </span>
        );
      }
      return part;
    });
  }, [text]);

  return (
    <div
      data-testid="x-post-preview"
      className="bg-[#16181c] border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-xl max-w-xl w-full font-sans antialiased"
    >
      {/* Header: Avatar, Name, Handle, Thread Indicator */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={authorName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="leading-tight">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm text-white">{authorName}</span>
              <span className="text-xs text-slate-500">@{handle}</span>
            </div>
            <div className="text-[11px] text-slate-500">Just now • Draft Preview</div>
          </div>
        </div>

        {totalParts && totalParts > 1 && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-950 text-sky-400 border border-sky-800">
            {threadIndex !== undefined ? `${threadIndex + 1}/${totalParts}` : `Thread`}
          </span>
        )}
      </div>

      {/* Tweet Body */}
      <div className="mt-3 text-[15px] leading-relaxed text-slate-100 whitespace-pre-wrap break-words">
        {formattedText}
      </div>

      {/* Engagement Mockup Bar & Circular Character Count Gauge */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-6 text-slate-500">
          <button type="button" aria-label="Reply" className="hover:text-sky-400 transition flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Repost" className="hover:text-emerald-400 transition flex items-center space-x-1">
            <Repeat2 className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Like" className="hover:text-rose-400 transition flex items-center space-x-1">
            <Heart className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Bookmark" className="hover:text-sky-400 transition flex items-center space-x-1">
            <Bookmark className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Share" className="hover:text-sky-400 transition flex items-center space-x-1">
            <Share className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Character Counter */}
        <div className="flex items-center space-x-2">
          {charCount > 260 && (
            <span
              className={`text-xs font-mono font-semibold ${
                charCount > maxChars ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {remaining}
            </span>
          )}

          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="#334155"
                strokeWidth="2.5"
              />
              {/* Foreground progress circle */}
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke={gaugeColor}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
