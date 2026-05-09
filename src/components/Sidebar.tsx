import { History, Camera, Mic, Trash2, ChevronUp, ChevronDown, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RefObject } from 'react';
import { SequenceStep } from '../types';

interface SidebarProps {
  steps: SequenceStep[];
  removeStep: (id: string) => void;
  sidebarRef: RefObject<HTMLDivElement | null>;
  moveStep: (index: number, direction: 'up' | 'down') => void;
  updateStepText: (id: string, text: string) => void;
}

export function Sidebar({ steps, removeStep, moveStep, updateStepText, sidebarRef }: SidebarProps) {
  return (
    <aside className="w-80 border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <History size={16} />
          Sequence
        </h2>
        <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono">
          {steps.length}
        </span>
      </div>

      <div ref={sidebarRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all shadow-lg"
            >
              {s.type === 'visual' ? (
                <>
                  <img src={s.dataUrl} className="w-full aspect-video object-cover" alt="Captured Frame" />
                  <div className="p-2.5 bg-zinc-900/80 backdrop-blur-sm border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Step {String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[10px] font-mono text-orange-500 font-bold">{s.timestamp.toFixed(2)}s</span>
                    </div>
                    <textarea
                      value={s.text || ''}
                      onChange={(e) => updateStepText(s.id, e.target.value)}
                      placeholder="Add a description..."
                      className="w-full bg-transparent border-l-2 border-orange-500/30 pl-2 text-[11px] text-zinc-300 leading-relaxed font-sans italic resize-none focus:outline-none focus:border-orange-500/70"
                      rows={2}
                    />
                  </div>
                </>
              ) : (
                <div className="p-4 bg-zinc-800/40 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {s.type === 'voice' ? <Mic size={12} className="text-orange-500" /> : <Type size={12} className="text-orange-500" />}
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        {s.type === 'voice' ? 'Voice Memo' : 'Text Note'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-400">{s.timestamp.toFixed(2)}s</span>
                  </div>
                  <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-700/30">
                    <textarea
                      value={s.text || ''}
                      onChange={(e) => updateStepText(s.id, e.target.value)}
                      placeholder={s.type === 'text' ? "Type your note here..." : "Voice transcript..."}
                      className="w-full bg-transparent text-[12px] text-zinc-200 leading-relaxed font-sans italic resize-none focus:outline-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {i > 0 && (
                  <button 
                    onClick={() => moveStep(i, 'up')}
                    className="p-1.5 bg-black/60 hover:bg-zinc-700 text-white rounded-lg transition-all"
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                )}
                {i < steps.length - 1 && (
                  <button 
                    onClick={() => moveStep(i, 'down')}
                    className="p-1.5 bg-black/60 hover:bg-zinc-700 text-white rounded-lg transition-all"
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                )}
                <button 
                  onClick={() => removeStep(s.id)}
                  className="p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-lg transition-all ml-1"
                  title="Remove step"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {steps.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-30 mt-20">
            <Camera size={40} className="mb-4" />
            <p className="text-sm italic">Capture frames or record voice to start building your sequence.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
