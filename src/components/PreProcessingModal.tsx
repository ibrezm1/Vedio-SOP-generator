import { motion, AnimatePresence } from 'motion/react';
import { Layers, Edit3, Check, X, ImageIcon, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SequenceStep } from '../types';
import { ImageEditor } from './ImageEditor';

interface PreProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: SequenceStep[];
  onUpdateStep: (id: string, dataUrl: string) => void;
}

export function PreProcessingModal({ isOpen, onClose, steps, onUpdateStep }: PreProcessingModalProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const visualSteps = steps.filter(s => s.type === 'visual');
  const currentEditingStep = visualSteps.find(s => s.id === editingStepId);

  const handleSaveEdit = (newDataUrl: string) => {
    if (editingStepId) {
      onUpdateStep(editingStepId, newDataUrl);
      setEditingStepId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-[32px] w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Layers className="text-orange-500" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Review & Edit Steps</h2>
                  <p className="text-xs text-zinc-500">Fine-tune your visual documentation before export</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2"
              >
                <Check size={18} />
                Finish Review
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-[#08090a]">
                <AnimatePresence mode="wait">
                  {editingStepId && currentEditingStep ? (
                    <motion.div 
                      key="editor"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="h-full flex flex-col"
                    >
                      <ImageEditor 
                        dataUrl={currentEditingStep.dataUrl!}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingStepId(null)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {visualSteps.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600">
                          <ImageIcon size={48} className="mb-4 opacity-20" />
                          <p>No visual steps captured yet.</p>
                        </div>
                      ) : (
                        visualSteps.map((step, index) => (
                          <div 
                            key={step.id}
                            className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all shadow-xl"
                          >
                            <div className="aspect-video bg-black relative">
                              <img 
                                src={step.dataUrl} 
                                alt={`Step ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-zinc-800 text-[10px] font-bold text-white uppercase tracking-tighter">
                                Step {index + 1}
                              </div>
                              
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button 
                                  onClick={() => setEditingStepId(step.id)}
                                  className="p-3 bg-white text-black rounded-full hover:bg-zinc-200 transition-all transform hover:scale-110"
                                >
                                  <Edit3 size={20} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="p-4 flex items-start gap-3">
                              <div className="flex-1">
                                <p className="text-xs text-zinc-400 line-clamp-2 italic">
                                  {step.text || "No instruction text"}
                                </p>
                                <p className="text-[10px] text-zinc-600 font-mono mt-2">
                                  Captured at {step.timestamp.toFixed(2)}s
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Navigation Sidebar (Optional, maybe for later) */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
