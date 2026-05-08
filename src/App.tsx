import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { ResultModal } from './components/ResultModal';
import { SequenceStep } from './types';

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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [useOCR, setUseOCR] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const lastTranscriptIndexRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const pipWindowRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({
        top: sidebarRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [steps.length]);

  useEffect(() => {
    return () => {
      if (videoSource && videoSource.startsWith('blob:')) {
        URL.revokeObjectURL(videoSource);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
      }
    };
  }, [videoSource]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'video/mp4') {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setSteps([]); 
      setAudioBlob(null);
      setGeneratedSOP(null);
      setTranscript("");
      lastTranscriptIndexRef.current = 0;
      setIsPlaying(false);
      setHasStarted(false);
      setCurrentTime(0);
      setDuration(0);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      stopScreenShareInternal();
    } else if (file) {
      alert("Please upload a valid MP4 file.");
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isScreenSharing) return; 
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      setHasStarted(true);
    }
    setIsPlaying(!isPlaying);
  };

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleClick = () => captureFrame();
    video.addEventListener('click', handleClick);
    return () => video.removeEventListener('click', handleClick);
  }, [captureFrame]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscript("");
      lastTranscriptIndexRef.current = 0; 

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
      const finalTranscript = transcript.trim();
      const leftover = finalTranscript.substring(lastTranscriptIndexRef.current).trim();

      mediaRecorderRef.current.stop();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      
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

  useEffect(() => {
    (window as any).toggleRecordingGlobal = () => {
      if (isRecordingRef.current) {
        stopRecording();
      } else {
        startRecording();
      }
    };
  }, [stopRecording, startRecording]);

  const stopScreenShareInternal = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    setIsScreenSharing(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    setHasStarted(false);
    setIsPlaying(false);
  }, []);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'monitor' },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsScreenSharing(true);
      setVideoSource("");
      setSteps([]); 
      setAudioBlob(null);
      setGeneratedSOP(null);
      setTranscript("");
      lastTranscriptIndexRef.current = 0;
      setIsPlaying(true);
      setHasStarted(true);

      stream.getVideoTracks()[0].addEventListener('ended', stopScreenShareInternal);

      if ('documentPictureInPicture' in window) {
        try {
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: 220,
            height: 260
          });
          pipWindowRef.current = pipWindow;

          const stylesheets = Array.from(document.styleSheets);
          for (let sheet of stylesheets) {
            try {
              if (sheet.href) {
                const link = pipWindow.document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                pipWindow.document.head.appendChild(link);
              } else {
                const style = pipWindow.document.createElement('style');
                let css = '';
                Array.from(sheet.cssRules).forEach(rule => css += rule.cssText);
                style.textContent = css;
                pipWindow.document.head.appendChild(style);
              }
            } catch (e) {
              console.warn("Could not copy stylesheet to PiP window", e);
            }
          }

          pipWindow.document.body.className = "bg-[#09090b] text-white font-sans h-full flex flex-col p-4 m-0 overflow-hidden";
          
          const container = pipWindow.document.createElement('div');
          container.className = "flex flex-col gap-3 flex-1 justify-center";
          
          container.innerHTML = `
            <div class="text-center mb-4">
              <h3 class="text-base font-bold text-zinc-100 mb-1">SOP Capture</h3>
              <p class="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Screen sharing active
              </p>
            </div>
            
            <button id="pip-capture-btn" class="w-full flex items-center justify-center px-3 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg font-bold text-sm transition-all shadow-xl active:scale-95">
              <span>Capture Frame</span>
            </button>
            
            <button id="pip-voice-btn" class="w-full flex items-center justify-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition-all border border-zinc-700 active:scale-95">
              <span id="pip-voice-text">Start Notes</span>
            </button>

            <div class="flex-1 mt-2"></div>

            <button id="pip-stop-btn" class="w-full flex items-center justify-center px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg font-bold text-sm transition-all border border-red-500/20 active:scale-95">
              <span>Stop Session</span>
            </button>
          `;
          
          pipWindow.document.body.appendChild(container);

          pipWindow.document.getElementById('pip-capture-btn')?.addEventListener('click', () => {
            (window as any).captureFrameGlobal();
          });
          
          pipWindow.document.getElementById('pip-voice-btn')?.addEventListener('click', () => {
            if ((window as any).toggleRecordingGlobal) {
              (window as any).toggleRecordingGlobal();
            }
          });

          pipWindow.document.getElementById('pip-stop-btn')?.addEventListener('click', () => {
            if ((window as any).stopScreenShareGlobal) {
              (window as any).stopScreenShareGlobal();
            }
          });

          pipWindow.addEventListener('pagehide', () => {
            if ((window as any).stopScreenShareGlobal) {
              (window as any).stopScreenShareGlobal();
            }
          });

        } catch (err) {
          console.error("PiP not supported or blocked", err);
        }
      }
      
    } catch (err) {
      console.error("Error starting screen share:", err);
    }
  };

  useEffect(() => {
    (window as any).captureFrameGlobal = captureFrame;
  }, [captureFrame]);

  useEffect(() => {
    (window as any).stopScreenShareGlobal = stopScreenShareInternal;
  }, [stopScreenShareInternal]);

  useEffect(() => {
    if (pipWindowRef.current) {
      const doc = pipWindowRef.current.document;
      const voiceBtn = doc.getElementById('pip-voice-btn');
      const voiceText = doc.getElementById('pip-voice-text');
      
      if (voiceBtn && voiceText) {
        if (isRecording) {
          voiceBtn.className = "w-full flex items-center justify-center px-3 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-red-500/20 active:scale-95 animate-pulse";
          voiceText.textContent = "Stop Notes";
        } else {
          voiceBtn.className = "w-full flex items-center justify-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition-all border border-zinc-700 active:scale-95";
          voiceText.textContent = "Start Notes";
        }
      }
    }
  }, [isRecording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); 
        if (isRecording) stopRecording();
        else startRecording();
      } else if (e.code === 'KeyC') {
        captureFrame();
      } else if (e.code === 'KeyP') {
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 3);
        }
      } else if (e.code === 'ArrowLeft') {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 3);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, captureFrame, togglePlay]);

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
    
    setIsExporting(true);
    setExportProgress("Preparing ZIP...");

    const zip = new JSZip();
    const imgFolder = zip.folder("images");
    let Tesseract: any;

    if (useOCR) {
      setExportProgress("Loading OCR Engine...");
      Tesseract = (await import('tesseract.js')).default;
    }

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
        
        if (useOCR && Tesseract) {
          setExportProgress(`Running OCR on Step ${stepIndex}...`);
          try {
            const { data: { text } } = await Tesseract.recognize(step.dataUrl, 'eng');
            if (text.trim()) {
              htmlContent += `<div style="display:none;" class="ai-ocr-metadata" data-step="${stepIndex}">\n${text.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}\n</div>`;
            }
          } catch (err) {
            console.error("OCR failed for step " + stepIndex, err);
          }
        }
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

    setExportProgress("Generating ZIP...");
    zip.file("index.html", htmlContent);
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOP_${new Date().getTime()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
    setExportProgress("");
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header 
        steps={steps}
        setSteps={setSteps}
        useOCR={useOCR}
        setUseOCR={setUseOCR}
        isExporting={isExporting}
        exportProgress={exportProgress}
        isRecording={isRecording}
        downloadZIP={downloadZIP}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
      />

      <main className="flex flex-1 overflow-hidden">
        <VideoPlayer 
          videoRef={videoRef}
          videoSource={videoSource}
          isScreenSharing={isScreenSharing}
          isPlaying={isPlaying}
          hasStarted={hasStarted}
          currentTime={currentTime}
          duration={duration}
          transcript={transcript}
          isRecording={isRecording}
          isGenerating={isGenerating}
          stepCount={steps.length}
          togglePlay={togglePlay}
          captureFrame={captureFrame}
          startRecording={startRecording}
          stopRecording={stopRecording}
          startScreenShare={startScreenShare}
          stopScreenShareInternal={stopScreenShareInternal}
          setCurrentTime={setCurrentTime}
          setDuration={setDuration}
          setHasStarted={setHasStarted}
          setIsPlaying={setIsPlaying}
          generateSOP={generateSOP}
          triggerFileUpload={() => fileInputRef.current?.click()}
        />
        
        <Sidebar 
          steps={steps}
          removeStep={removeStep}
          sidebarRef={sidebarRef}
        />
      </main>

      <ResultModal 
        generatedSOP={generatedSOP}
        setGeneratedSOP={setGeneratedSOP}
      />
      
      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
