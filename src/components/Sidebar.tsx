import { History, Camera, Mic, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RefObject } from 'react';
import { SequenceStep } from '../types';

interface SidebarProps {
  steps: SequenceStep[];
  removeStep: (id: string) => void;
  sidebarRef: RefObject<HTMLDivElement | null>;
}

export function Sidebar({ steps, removeStep, sidebarRef }: SidebarProps) {
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
                    {s.text && (
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans italic border-l-2 border-orange-500/30 pl-2">
                        "{s.text}"
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 bg-zinc-800/40 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mic size={12} className="text-orange-500" />
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Voice Memo</span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-400">{s.timestamp.toFixed(2)}s</span>
                  </div>
                  <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-700/30">
                    <p className="text-[12px] text-zinc-200 leading-relaxed font-sans italic">
                      "{s.text}"
                    </p>
                  </div>
                </div>
              )}
              <button 
                onClick={() => removeStep(s.id)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Remove step"
              >
                <Trash2 size={12} />
              </button>
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
