import { Play, Pause, Camera, Mic, Square, Loader2, FileText, Info, Upload, Video, MonitorUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RefObject } from 'react';

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
  captureFrame: () => void;
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
  triggerFileUpload
}: VideoPlayerProps) {

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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 flex flex-col gap-4 items-center">
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

          <div 
            className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full py-2 px-6 flex items-center shadow-2xl gap-4"
            onClick={(e) => e.stopPropagation()} // Prevent capture when clicking controls
          >
            {!isScreenSharing && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="p-2 hover:bg-zinc-700/50 rounded-full text-white transition-all transform active:scale-95"
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                
                <div className="h-6 w-px bg-zinc-700/50" />
              </>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); captureFrame(); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-full transition-all text-sm font-medium shadow-lg shadow-orange-500/20 transform active:scale-95"
            >
              <Camera size={18} />
              <span>Capture Frame</span>
            </button>

            <div className="h-6 w-px bg-zinc-700/50" />

            {!isRecording ? (
              <button 
                onClick={(e) => { e.stopPropagation(); startRecording(); }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-all text-sm font-medium border border-zinc-700"
              >
                <Mic size={18} />
                <span>Start Voiceover</span>
              </button>
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
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Info size={16} />
            <span>Capturing at native resolution ({videoRef.current?.videoWidth || '...'}px)</span>
          </div>
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
