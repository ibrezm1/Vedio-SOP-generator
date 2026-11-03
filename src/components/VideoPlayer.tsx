import { Play, Pause, Camera, Mic, Square, Loader2, FileText, Info, Upload, Video, MonitorUp, Type, Scissors, Crop, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RefObject, useState } from 'react';
import { CropRegion } from '../types';
import { VideoCropOverlay } from './VideoCropOverlay';

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSource: string;
  isScreenSharing: boolean;
  isPlaying: boolean;
  hasStarted: boolean;
  currentTime: number;
  duration: number;
  transcript: string;
  isRecording: boolean;
  isGenerating: boolean;
  stepCount: number;
  
  togglePlay: () => void;
  captureFrame: (customCrop?: CropRegion) => void;
  startRecording: () => void;
  stopRecording: () => void;
  startScreenShare: () => void;
  stopScreenShareInternal: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setHasStarted: (started: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  generateSOP: () => void;
  triggerFileUpload: () => void;
  addTextNote: (text: string) => void;

  activeCropRegion: CropRegion | null;
  setActiveCropRegion: (region: CropRegion | null) => void;
  lastCropRegion: CropRegion | null;
  isSnipMode: boolean;
  setIsSnipMode: (snip: boolean | ((prev: boolean) => boolean)) => void;
  isDefiningROI: boolean;
  setIsDefiningROI: (roi: boolean | ((prev: boolean) => boolean)) => void;
  onSnipComplete: (region: CropRegion) => void;
}

export function VideoPlayer({
  videoRef,
  videoSource,
  isScreenSharing,
  isPlaying,
  hasStarted,
  currentTime,
  duration,
  transcript,
  isRecording,
  isGenerating,
  stepCount,
  togglePlay,
  captureFrame,
  startRecording,
  stopRecording,
  startScreenShare,
  stopScreenShareInternal,
  setCurrentTime,
  setDuration,
  setHasStarted,
  setIsPlaying,
  generateSOP,
  triggerFileUpload,
  addTextNote,
  activeCropRegion,
  setActiveCropRegion,
  lastCropRegion,
  isSnipMode,
  setIsSnipMode,
  isDefiningROI,
  setIsDefiningROI,
  onSnipComplete
}: VideoPlayerProps) {

  const [isTypingNote, setIsTypingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 min-w-0">
      {/* Player Container */}
      <div className="relative group flex-1 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
        <video 
          ref={videoRef as any}
          src={videoSource || undefined}
          autoPlay={isScreenSharing}
          muted={isScreenSharing}
          className="w-full h-full object-contain cursor-crosshair"
          crossOrigin="anonymous"
          onPlay={() => {
            setIsPlaying(true);
            setHasStarted(true);
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />

        {/* Crop / Snip Overlay */}
        {(videoSource || isScreenSharing) && (
          <VideoCropOverlay
            videoRef={videoRef}
            activeCropRegion={activeCropRegion}
            isSnipMode={isSnipMode}
            isDefiningROI={isDefiningROI}
            onSnipComplete={onSnipComplete}
            onROIComplete={(region) => {
              setActiveCropRegion(region);
              setIsDefiningROI(false);
            }}
            onCancelSnip={() => setIsSnipMode(false)}
            onCancelROI={() => setIsDefiningROI(false)}
          />
        )}
        
        {/* Overlay Instructions (Visible only when no video is uploaded and not sharing) */}
        <AnimatePresence>
          {!videoSource && !isScreenSharing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center z-10"
            >
              <div className="bg-zinc-900/90 border border-zinc-700/50 p-8 rounded-3xl text-center backdrop-blur-xl shadow-2xl max-w-sm">
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-700 shadow-xl">
                  <Video className="text-zinc-400" size={32} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-zinc-100">
                  Start Your Project
                </h3>
                
                <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                  Upload an MP4 recording or share your screen directly to create an SOP.
                </p>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={triggerFileUpload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all shadow-xl active:scale-95"
                  >
                    <Upload size={20} />
                    <span>Upload MP4 Recording</span>
                  </button>
                  
                  <div className="flex items-center gap-3 text-zinc-500 text-sm w-full">
                    <div className="flex-1 h-px bg-zinc-800"></div>
                    <span>OR</span>
                    <div className="flex-1 h-px bg-zinc-800"></div>
                  </div>

                  <button 
                    onClick={startScreenShare}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all border border-zinc-700 active:scale-95"
                  >
                    <MonitorUp size={20} />
                    <span>Share Screen</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Controls bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 flex flex-col gap-4 items-center z-30">
          {/* Seek Bar */}
          {videoSource && (
            <div className="w-full px-4 flex items-center gap-3 bg-zinc-900/50 backdrop-blur-md py-2 rounded-full border border-zinc-700/30">
              <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{formatTime(currentTime)}</span>
              <input 
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const time = Number(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = time;
                  setCurrentTime(time);
                }}
                className="flex-1 accent-orange-500 h-1.5 rounded-full bg-zinc-800 cursor-pointer appearance-none"
              />
              <span className="text-[10px] font-mono text-zinc-500 w-10">{formatTime(duration)}</span>
            </div>
          )}

          {/* Real-time Transcript Overlay */}
          <AnimatePresence>
            {isRecording && transcript && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-4 w-full shadow-2xl overflow-hidden max-h-24 overflow-y-auto"
              >
                <p className="text-sm font-medium text-white/90 leading-relaxed italic">
                  <span className="text-orange-500 not-italic font-bold mr-2">LIVE:</span>
                  {transcript}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isTypingNote && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-2 w-full max-w-md shadow-2xl flex items-center gap-2"
                onClick={e => e.stopPropagation()}
              >
                <input 
                  type="text"
                  autoFocus
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Enter' && noteText.trim()) {
                      addTextNote(noteText);
                      setNoteText('');
                      setIsTypingNote(false);
                    } else if (e.key === 'Escape') {
                      setIsTypingNote(false);
                    }
                  }}
                  placeholder="Type your note and press Enter..."
                  className="flex-1 bg-transparent text-white px-3 py-1.5 focus:outline-none text-sm placeholder:text-zinc-500"
                />
                <button 
                  onClick={() => setIsTypingNote(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                >
                  <Square size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full py-2 px-6 flex items-center shadow-2xl gap-3"
            onClick={(e) => e.stopPropagation()} // Prevent capture when clicking controls
          >
            {!isScreenSharing && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="p-2 hover:bg-zinc-700/50 rounded-full text-white transition-all transform active:scale-95"
                  title={isPlaying ? "Pause (P)" : "Play (P)"}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                
                <div className="h-6 w-px bg-zinc-700/50" />
              </>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); captureFrame(); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-full transition-all text-sm font-medium shadow-lg shadow-orange-500/20 transform active:scale-95"
              title="Capture full frame or active region (Shortcut: C)"
            >
              <Camera size={18} />
              <span>Capture Frame</span>
            </button>

            {/* Quick Snip Tool */}
            {(videoSource || isScreenSharing) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSnipMode(prev => !prev);
                  setIsDefiningROI(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all text-sm font-medium border transform active:scale-95 ${
                  isSnipMode
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20 animate-pulse'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
                title="Drag a rectangle to capture a cropped screenshot (Shortcut: S)"
              >
                <Scissors size={16} />
                <span>Snip</span>
              </button>
            )}

            {/* Persistent Region of Interest (ROI) Lock */}
            {(videoSource || isScreenSharing) && (
              activeCropRegion ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCropRegion(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-full transition-all text-xs font-medium transform active:scale-95"
                  title="Crop region active. Click to reset to full frame."
                >
                  <Crop size={14} />
                  <span>ROI Locked</span>
                  <X size={12} className="ml-0.5 hover:text-white" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDefiningROI(prev => !prev);
                    setIsSnipMode(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all text-xs font-medium border transform active:scale-95 ${
                    isDefiningROI
                      ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700'
                  }`}
                  title="Lock a continuous crop region for all screenshots"
                >
                  <Crop size={14} />
                  <span>Set ROI</span>
                </button>
              )
            )}

            {/* Quick Reuse of Last Crop */}
            {(videoSource || isScreenSharing) && !activeCropRegion && lastCropRegion && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCropRegion(lastCropRegion);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 border border-zinc-700 rounded-full transition-all text-xs font-medium transform active:scale-95"
                title="Restore and lock your last crop rectangle without re-drawing"
              >
                <RotateCcw size={13} />
                <span>Use Last Crop</span>
              </button>
            )}

            <div className="h-6 w-px bg-zinc-700/50" />

            {!isRecording ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); startRecording(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-all text-sm font-medium border border-zinc-700"
                >
                  <Mic size={18} />
                  <span>Start Voiceover</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsTypingNote(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-all text-sm font-medium border border-zinc-700"
                >
                  <Type size={18} />
                  <span>Type Note</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); stopRecording(); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-full transition-all text-sm font-medium shadow-lg shadow-red-500/20 animate-pulse"
              >
                <Square size={18} fill="currentColor" />
                <span>Stop Recording</span>
              </button>
            )}

            {isScreenSharing && (
              <>
                <div className="h-6 w-px bg-zinc-700/50" />
                <button 
                  onClick={(e) => { e.stopPropagation(); stopScreenShareInternal(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-full transition-all text-sm font-medium border border-red-500/30"
                >
                  <Square size={18} fill="currentColor" />
                  <span>Stop Sharing</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Info size={16} />
            <span>Capturing at native resolution ({videoRef.current?.videoWidth || '...'}px)</span>
          </div>
          {activeCropRegion && (
            <div className="flex items-center gap-2 text-orange-400 text-xs bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
              <span>Cropped Region Active</span>
              <button
                onClick={() => setActiveCropRegion(null)}
                className="text-zinc-400 hover:text-white underline ml-1 font-medium"
              >
                Reset to Full Frame
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={generateSOP}
          disabled={isGenerating || stepCount === 0}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all shadow-xl
            ${isGenerating || stepCount === 0 
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700' 
              : 'bg-white text-black hover:bg-zinc-200 active:scale-95'}
          `}
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
          {isGenerating ? 'Analyzing Content...' : 'Generate AI SOP'}
        </button>
      </div>
    </div>
  );
}
