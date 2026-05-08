/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { 
  Play, 
  Pause, 
  Camera, 
  Mic, 
  Square, 
  FileText, 
  Trash2, 
  History, 
  Zap,
  Info,
  ChevronRight,
  Loader2,
  Upload,
  Video,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';

interface SequenceStep {
  id: string;
  type: 'visual' | 'voice';
  timestamp: number;
  dataUrl?: string;
  text?: string;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSOP, setGeneratedSOP] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const lastTranscriptIndexRef = useRef(0);

  // Auto-scroll sidebar when steps change
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({
        top: sidebarRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [steps.length]);

  // Cleanup Blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoSource && videoSource.startsWith('blob:')) {
        URL.revokeObjectURL(videoSource);
      }
    };
  }, [videoSource]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'video/mp4') {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setSteps([]); // Clear sequence when video changes
      setAudioBlob(null);
      setGeneratedSOP(null);
      setTranscript("");
      lastTranscriptIndexRef.current = 0;
      setIsPlaying(false);
      setHasStarted(false);
      setCurrentTime(0);
      setDuration(0);
    } else if (file) {
      alert("Please upload a valid MP4 file.");
    }
  };

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      setHasStarted(true);
    }
    setIsPlaying(!isPlaying);
  };

  // Capture Screenshot
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    
    // Extract new transcript text since last step
    const currentFullTranscript = transcript.trim();
    const newText = currentFullTranscript.substring(lastTranscriptIndexRef.current).trim();
    lastTranscriptIndexRef.current = currentFullTranscript.length;

    const newStep: SequenceStep = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'visual',
      timestamp: video.currentTime,
      dataUrl,
      text: newText || undefined
    };

    setSteps(prev => [...prev, newStep]);
  }, [transcript]);

  // Global click listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleClick = () => captureFrame();
    video.addEventListener('click', handleClick);
    return () => video.removeEventListener('click', handleClick);
  }, [captureFrame]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscript(""); // Reset transcript
      lastTranscriptIndexRef.current = 0; // Reset tracking index for new session

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      
      // Start transcription
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for voice recording and transcription.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Capture the current transcript state before stopping
      const finalTranscript = transcript.trim();
      const leftover = finalTranscript.substring(lastTranscriptIndexRef.current).trim();

      mediaRecorderRef.current.stop();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      
      // Add the final voice note if there's any new text
      if (leftover && videoRef.current) {
        const voiceStep: SequenceStep = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'voice',
          timestamp: videoRef.current.currentTime,
          text: leftover
        };
        setSteps(stepsPrev => [...stepsPrev, voiceStep]);
        lastTranscriptIndexRef.current = finalTranscript.length;
      }
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is in an input field or typing
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      } else if (e.code === 'KeyC') {
        captureFrame();
      } else if (e.code === 'KeyP') {
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, captureFrame, togglePlay]); // Re-bind when stability-critical dependencies change

  // SOP Generation (Mocked as requested)
  const generateSOP = async () => {
    if (steps.length === 0) {
      alert("Please capture at least one step first.");
      return;
    }

    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const payload = {
      timestamp: new Date().toISOString(),
      audioSize: audioBlob ? `${(audioBlob.size / 1024).toFixed(2)} KB` : 'No audio',
      stepCount: steps.length,
      transcript: transcript || "[No voiceover text captured]",
      steps: steps.map((s, i) => ({
        id: `[STEP_${i + 1}]`,
        type: s.type,
        timestamp: s.timestamp.toFixed(2),
        text: s.text || ""
      }))
    };

    console.log("Structured JSON Payload for Multimodal LLM:", JSON.stringify(payload, null, 2));

    const mockSOP = `
# Standard Operating Procedure: Visual Task Analysis
Generated on: ${new Date().toLocaleDateString()}

## Objective
Automatically document visual steps captured from the source material.

${steps.map((s, i) => `
### Step ${i + 1} (${s.timestamp.toFixed(2)}s)
${s.type === 'visual' ? `![Step ${i + 1}](${s.dataUrl})` : '*Voice Note Only*'}
**Instructions**: ${s.text || (s.type === 'visual' ? "Visual documentation captured." : "No text provided.")}
`).join('\n')}

## Analysis Summary
The sequence has been analyzed and synchronized for SOP production.
    `.trim();

    setGeneratedSOP(mockSOP);
    setIsGenerating(false);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const downloadZIP = async () => {
    if (steps.length === 0) return;

    const zip = new JSZip();
    const imgFolder = zip.folder("images");

    let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOP Document - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; mx-auto; padding: 40px; background: #f9f9f9; }
        .container { background: white; padding: 40px; border-radius: 12px; shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #f97316; margin-bottom: 8px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .step { margin-bottom: 60px; padding-bottom: 40px; border-bottom: 1px solid #eee; }
        .step:last-child { border-bottom: none; }
        .step-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
        .step-number { font-weight: bold; font-size: 18px; color: #f97316; }
        .timestamp { font-family: monospace; color: #999; }
        img { width: 100%; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 16px; }
        .instruction { font-size: 16px; color: #444; }
        .voice-note { background: #fff7ed; border-left: 4px solid #f97316; padding: 16px; border-radius: 4px; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Standard Operating Procedure</h1>
        <div class="meta">Generated by AI SOP Architect on ${new Date().toLocaleString()}</div>
        
        <div class="steps text-zinc-100">
`;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepIndex = i + 1;
      
      htmlContent += `
        <div class="step">
            <div class="step-header">
                <span class="step-number">Step ${stepIndex}</span>
                <span class="timestamp">${step.timestamp.toFixed(2)}s</span>
            </div>
      `;

      if (step.type === 'visual' && step.dataUrl) {
        const base64Data = step.dataUrl.split(',')[1];
        const fileName = `step_${stepIndex}.png`;
        imgFolder?.file(fileName, base64Data, { base64: true });
        htmlContent += `<img src="images/${fileName}" alt="Step ${stepIndex}">`;
      }

      if (step.text) {
        htmlContent += `<div class="${step.type === 'voice' ? 'voice-note' : 'instruction'}">${step.text}</div>`;
      } else if (step.type === 'visual') {
        htmlContent += `<div class="instruction">Visual documentation captured.</div>`;
      }

      htmlContent += `</div>`;
    }

    htmlContent += `
        </div>
    </div>
</body>
</html>
    `;

    zip.file("index.html", htmlContent);
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOP_${new Date().getTime()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <h1 className="font-semibold tracking-tight text-zinc-100">AI SOP Architect <span className="text-zinc-500 font-normal ml-2">v1.0</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={downloadZIP}
            disabled={steps.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            <span>Export ZIP</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="video/mp4" 
            className="hidden" 
          />
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
            {isRecording ? 'RECORDING VOICE...' : 'IDLE'}
          </div>
          <button 
            onClick={() => setSteps([])}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            title="Clear all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-6 gap-6 min-w-0">
          {/* Player Container */}
          <div className="relative group flex-1 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
            <video 
              ref={videoRef}
              src={videoSource}
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
            
            {/* Overlay Instructions (Visible only when no video is uploaded) */}
            <AnimatePresence>
              {!videoSource && (
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
                      Upload an MP4 recording of the task you want to transform into an SOP.
                    </p>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all shadow-xl active:scale-95"
                      >
                        <Upload size={20} />
                        <span>Upload MP4 Recording</span>
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
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="p-2 hover:bg-zinc-700/50 rounded-full text-white transition-all transform active:scale-95"
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                
                <div className="h-6 w-px bg-zinc-700/50" />
                
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
              disabled={isGenerating || steps.length === 0}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all shadow-xl
                ${isGenerating || steps.length === 0 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700' 
                  : 'bg-white text-black hover:bg-zinc-200 active:scale-95'}
              `}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
              {isGenerating ? 'Analyzing Content...' : 'Generate AI SOP'}
            </button>
          </div>
        </div>

        {/* Sidebar */}
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
                      <img src={s.dataUrl} className="w-full aspect-video object-cover" />
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
      </main>

      {/* Result Modal / Overlay */}
      <AnimatePresence>
        {generatedSOP && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <FileText className="text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Analysis Result</h2>
                    <p className="text-xs text-zinc-500">Mock SOP based on visual and audio context</p>
                  </div>
                </div>
                <button 
                  onClick={() => setGeneratedSOP(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-all"
                >
                  Close Document
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-[#08090a]">
                <div className="max-w-2xl mx-auto prose prose-invert prose-orange">
                  <div className="whitespace-pre-wrap font-sans leading-relaxed text-zinc-300">
                    {generatedSOP}
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                  Full JSON payload logged to console for LLM consumption
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
