import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Crop, Square, RotateCcw, Check, X, Undo2, Type } from 'lucide-react';

interface ImageEditorProps {
  dataUrl: string;
  onSave: (newDataUrl: string) => void;
  onCancel: () => void;
}

type Mode = 'crop' | 'draw' | 'text';
type Color = 'red' | 'blue' | 'yellow';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
}

interface TextNote {
  x: number;
  y: number;
  text: string;
  color: Color;
}

export function ImageEditor({ dataUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [color, setColor] = useState<Color>('red');
  const [rects, setRects] = useState<Rect[]>([]);
  const [texts, setTexts] = useState<TextNote[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [activeTextInput, setActiveTextInput] = useState<{ x: number, y: number } | null>(null);
  const [tempText, setTempText] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Initialize image
  useEffect(() => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      setImage(img);
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        drawAll(img, rects, texts, null, null);
      }
    };
  }, [dataUrl]);

  const drawAll = useCallback((img: HTMLImageElement, savedRects: Rect[], savedTexts: TextNote[], activeRect: Rect | null, activeCrop: { x: number, y: number, w: number, h: number } | null) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw saved rectangles
    savedRects.forEach(r => drawRect(ctx, r));

    // Draw saved texts
    savedTexts.forEach(t => drawText(ctx, t));

    // Draw active rectangle
    if (activeRect) drawRect(ctx, activeRect);

    // Draw crop box
    if (activeCrop) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      // Top
      ctx.fillRect(0, 0, canvas.width, activeCrop.y);
      // Bottom
      ctx.fillRect(0, activeCrop.y + activeCrop.h, canvas.width, canvas.height - (activeCrop.y + activeCrop.h));
      // Left
      ctx.fillRect(0, activeCrop.y, activeCrop.x, activeCrop.h);
      // Right
      ctx.fillRect(activeCrop.x + activeCrop.w, activeCrop.y, canvas.width - (activeCrop.x + activeCrop.w), activeCrop.h);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(activeCrop.x, activeCrop.y, activeCrop.w, activeCrop.h);
      
      // Corner handles
      ctx.fillStyle = '#fff';
      const handleSize = 8;
      ctx.fillRect(activeCrop.x - handleSize/2, activeCrop.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(activeCrop.x + activeCrop.w - handleSize/2, activeCrop.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(activeCrop.x - handleSize/2, activeCrop.y + activeCrop.h - handleSize/2, handleSize, handleSize);
      ctx.fillRect(activeCrop.x + activeCrop.w - handleSize/2, activeCrop.y + activeCrop.h - handleSize/2, handleSize, handleSize);
    }
  }, []);

  const drawRect = (ctx: CanvasRenderingContext2D, r: Rect) => {
    ctx.lineWidth = 4;
    switch (r.color) {
      case 'red': ctx.strokeStyle = '#ef4444'; break;
      case 'blue': ctx.strokeStyle = '#3b82f6'; break;
      case 'yellow': ctx.strokeStyle = '#facc15'; break;
    }
    ctx.strokeRect(r.x, r.y, r.width, r.height);
  };

  const drawText = (ctx: CanvasRenderingContext2D, t: TextNote) => {
    const fontSize = Math.max(20, ctx.canvas.width / 40);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    
    switch (t.color) {
      case 'red': ctx.fillStyle = '#ef4444'; break;
      case 'blue': ctx.fillStyle = '#3b82f6'; break;
      case 'yellow': ctx.fillStyle = '#facc15'; break;
    }

    // Add shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText(t.text, t.x, t.y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  useEffect(() => {
    if (image) {
      drawAll(image, rects, texts, currentRect, cropBox);
    }
  }, [image, rects, texts, currentRect, cropBox, drawAll]);

  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    
    if (mode === 'text') {
      setActiveTextInput({ x, y });
      setTempText("");
      return;
    }

    setStartPos({ x, y });
    setIsDrawing(true);

    if (mode === 'crop') {
      setCropBox({ x, y, w: 0, h: 0 });
    } else {
      setCurrentRect({ x, y, width: 0, height: 0, color });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getMousePos(e);

    if (mode === 'crop') {
      setCropBox({
        x: Math.min(x, startPos.x),
        y: Math.min(y, startPos.y),
        w: Math.abs(x - startPos.x),
        h: Math.abs(y - startPos.y)
      });
    } else {
      setCurrentRect({
        x: Math.min(x, startPos.x),
        y: Math.min(y, startPos.y),
        width: Math.abs(x - startPos.x),
        height: Math.abs(y - startPos.y),
        color
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (mode === 'draw' && currentRect && currentRect.width > 5) {
      setRects([...rects, currentRect]);
    }
    setCurrentRect(null);
  };

  const handleTextSubmit = () => {
    if (activeTextInput && tempText.trim()) {
      setTexts([...texts, { ...activeTextInput, text: tempText, color }]);
    }
    setActiveTextInput(null);
    setTempText("");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const outputCanvas = document.createElement('canvas');
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    if (cropBox && cropBox.w > 10 && cropBox.h > 10) {
      outputCanvas.width = cropBox.w;
      outputCanvas.height = cropBox.h;
      
      // Draw a temporary canvas with all annotations first
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(image, 0, 0);
        rects.forEach(r => drawRect(tempCtx, r));
        texts.forEach(t => drawText(tempCtx, t));
        ctx.drawImage(tempCanvas, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);
      }
    } else {
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      ctx.drawImage(image, 0, 0);
      rects.forEach(r => drawRect(ctx, r));
      texts.forEach(t => drawText(ctx, t));
    }

    onSave(outputCanvas.toDataURL('image/png'));
  };

  const undo = () => {
    if (texts.length > 0) {
      setTexts(texts.slice(0, -1));
    } else if (rects.length > 0) {
      setRects(rects.slice(0, -1));
    } else if (cropBox) {
      setCropBox(null);
    }
  };

  const reset = () => {
    setRects([]);
    setTexts([]);
    setCropBox(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('draw')}
            className={`p-2 rounded-lg transition-all ${mode === 'draw' ? 'bg-orange-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title="Draw Rectangle"
          >
            <Square size={20} />
          </button>
          <button 
            onClick={() => setMode('text')}
            className={`p-2 rounded-lg transition-all ${mode === 'text' ? 'bg-orange-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title="Add Text"
          >
            <Type size={20} />
          </button>
          <button 
            onClick={() => setMode('crop')}
            className={`p-2 rounded-lg transition-all ${mode === 'crop' ? 'bg-orange-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title="Crop Image"
          >
            <Crop size={20} />
          </button>
          
          <div className="w-px h-6 bg-zinc-800 mx-2" />
          
          {(mode === 'draw' || mode === 'text') && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setColor('red')}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === 'red' ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: '#ef4444' }}
              />
              <button 
                onClick={() => setColor('blue')}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === 'blue' ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: '#3b82f6' }}
              />
              <button 
                onClick={() => setColor('yellow')}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === 'yellow' ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: '#facc15' }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={undo}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-all"
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
          <button 
            onClick={reset}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-all"
            title="Reset"
          >
            <RotateCcw size={20} />
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-2" />
          <button 
            onClick={onCancel}
            className="px-4 py-2 hover:bg-zinc-800 rounded-lg text-zinc-400 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-bold transition-all active:scale-95"
          >
            <Check size={18} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#08090a] p-8 flex items-center justify-center relative cursor-crosshair"
      >
        <div className="relative inline-block">
          <canvas 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="shadow-2xl block rounded-sm"
            style={{ 
              touchAction: 'none',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
          
          {activeTextInput && (
            <div 
              className="absolute z-[100]"
              style={{ 
                left: `${(activeTextInput.x / (canvasRef.current?.width || 1)) * 100}%`,
                top: `${(activeTextInput.y / (canvasRef.current?.height || 1)) * 100}%`,
                transform: 'translate(-5px, -5px)' // Slight offset for better alignment with cursor
              }}
              onMouseDown={e => e.stopPropagation()} // Prevent canvas click when clicking input
            >
              <input 
                autoFocus
                type="text"
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                  if (e.key === 'Escape') {
                    setActiveTextInput(null);
                  }
                }}
                onBlur={() => {
                  if (tempText.trim()) handleTextSubmit();
                  else setActiveTextInput(null);
                }}
                placeholder="Type here..."
                className="bg-zinc-900/90 text-white border border-orange-500/50 px-3 py-1.5 rounded-lg shadow-2xl focus:outline-none focus:border-orange-500 min-w-[150px] backdrop-blur-xl"
                style={{
                  color: color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#facc15'
                }}
              />
            </div>
          )}
        </div>
        
        {/* Instructions Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-zinc-800 pointer-events-none">
          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest text-center">
            {mode === 'draw' ? 'Click & Drag to Highlight' : 
             mode === 'text' ? 'Click to add Text' : 
             'Click & Drag to define Crop area'}
          </p>
        </div>
      </div>
    </div>
  );
}
