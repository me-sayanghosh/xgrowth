import { useState } from 'react';
import { Plus, Trash2, Split } from 'lucide-react';
import { XPostPreview } from './XPostPreview.js';

export interface ThreadVisualizerProps {
  parts: string[];
  onChange: (updatedParts: string[]) => void;
  readOnly?: boolean;
  authorName?: string;
  handle?: string;
}

export function ThreadVisualizer({
  parts,
  onChange,
  readOnly = false,
  authorName = 'Engineering Lead',
  handle = 'techlead',
}: ThreadVisualizerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleUpdatePart = (index: number, newText: string) => {
    const updated = [...parts];
    updated[index] = newText;
    onChange(updated);
  };

  const handleAddPart = () => {
    onChange([...parts, '']);
    setEditingIndex(parts.length);
  };

  const handleRemovePart = (index: number) => {
    if (parts.length <= 1) return;
    const updated = parts.filter((_, i) => i !== index);
    onChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleSplitPart = (index: number) => {
    const text = parts[index] ?? '';
    if (text.length <= 140) return;

    // Split roughly in half at the nearest sentence or space
    const midpoint = Math.floor(text.length / 2);
    const spaceIndex = text.lastIndexOf(' ', midpoint);
    const splitPoint = spaceIndex > 0 ? spaceIndex : midpoint;

    const partA = text.slice(0, splitPoint).trim();
    const partB = text.slice(splitPoint).trim();

    const updated = [...parts.slice(0, index), partA, partB, ...parts.slice(index + 1)];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <span>{`Thread Breakdown (${parts.length} tweets)`}</span>
        </h4>
        {!readOnly && (
          <button
            type="button"
            onClick={handleAddPart}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-medium border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tweet</span>
          </button>
        )}
      </div>

      <div className="relative space-y-6">
        {parts.map((partText, idx) => {
          const isLast = idx === parts.length - 1;
          const isOverLimit = partText.length > 280;

          return (
            <div key={idx} className="relative flex items-start space-x-3">
              {/* Connecting vertical line */}
              {!isLast && (
                <div className="absolute left-5 top-12 bottom-[-24px] w-0.5 bg-slate-800 z-0" />
              )}

              {/* Avatar circle / Part indicator */}
              <div className="relative z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-sky-500/40 flex items-center justify-center text-xs font-bold text-sky-300 shrink-0 shadow">
                {idx + 1}
              </div>

              {/* Part Content / Editor */}
              <div className="flex-1 space-y-2">
                {editingIndex === idx && !readOnly ? (
                  <div className="p-3 bg-slate-950 border border-sky-500 rounded-xl space-y-2">
                    <textarea
                      rows={4}
                      value={partText}
                      onChange={(e) => handleUpdatePart(idx, e.target.value)}
                      placeholder="Write tweet text..."
                      className="w-full bg-transparent text-sm text-white focus:outline-none resize-none font-sans"
                    />
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                      <span className={isOverLimit ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {partText.length} / 280 chars
                      </span>
                      <div className="flex items-center space-x-2">
                        {partText.length > 200 && (
                          <button
                            type="button"
                            onClick={() => handleSplitPart(idx)}
                            title="Split long tweet into two"
                            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-amber-300 hover:bg-slate-700 text-xs"
                          >
                            <Split className="w-3 h-3" />
                            <span>Split</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <XPostPreview
                      text={partText || '(Empty tweet part)'}
                      authorName={authorName}
                      handle={handle}
                      threadIndex={idx}
                      totalParts={parts.length}
                    />

                    {!readOnly && (
                      <div className="mt-1 flex items-center justify-end space-x-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(idx)}
                          className="text-slate-400 hover:text-sky-400 font-medium underline"
                        >
                          Edit
                        </button>
                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            title="Remove tweet part"
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
