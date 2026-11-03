import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropRegion } from '../types';
import { Scissors, Check, X, Maximize2 } from 'lucide-react';

interface VideoCropOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeCropRegion: CropRegion | null;
  isSnipMode: boolean;
  isDefiningROI: boolean;
  onSnipComplete: (region: CropRegion) => void;
  onROIComplete: (region: CropRegion | null) => void;
  onCancelSnip: () => void;
  onCancelROI: () => void;
}

export function VideoCropOverlay({
  videoRef,
  activeCropRegion,
  isSnipMode,
  isDefiningROI,
  onSnipComplete,
  onROIComplete,
  onCancelSnip,
  onCancelROI,
}: VideoCropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number } | null>(null);

  // Calculate rendered video content area inside the container (accounting for object-contain letterbox)
  const getRenderedVideoRect = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return null;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh || !cw || !ch) {
      return { x: 0, y: 0, width: cw, height: ch, videoWidth: vw || cw, videoHeight: vh || ch };
    }

    const videoRatio = vw / vh;
    const containerRatio = cw / ch;

    let width = cw;
    let height = ch;
    let x = 0;
    let y = 0;

    if (videoRatio > containerRatio) {
      // Letterbox top and bottom
      width = cw;
      height = cw / videoRatio;
      y = (ch - height) / 2;
    } else {
      // Pillarbox left and right
      height = ch;
      width = ch * videoRatio;
      x = (cw - width) / 2;
    }

    return { x, y, width, height, videoWidth: vw, videoHeight: vh };
  }, [videoRef]);

  // Convert mouse event coordinates to normalized 0-1 coordinates relative to video content
  const getNormalizedPoint = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rendered = getRenderedVideoRect();
    const container = containerRef.current;
    if (!rendered || !container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Clamp to rendered video area
    const clampedX = Math.max(rendered.x, Math.min(rendered.x + rendered.width, clientX));
    const clampedY = Math.max(rendered.y, Math.min(rendered.y + rendered.height, clientY));

    return {
      x: (clampedX - rendered.x) / rendered.width,
      y: (clampedY - rendered.y) / rendered.height
    };
  }, [getRenderedVideoRect]);

  const isInteracting = isSnipMode || isDefiningROI;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isInteracting) return;
    e.stopPropagation();
    e.preventDefault();

    const pt = getNormalizedPoint(e);
    setDragStart(pt);
    setCurrentDrag(pt);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    e.stopPropagation();

    const pt = getNormalizedPoint(e);
    setCurrentDrag(pt);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !currentDrag) return;
    e.stopPropagation();
    setIsDragging(false);

    const x = Math.min(dragStart.x, currentDrag.x);
    const y = Math.min(dragStart.y, currentDrag.y);
    const width = Math.abs(currentDrag.x - dragStart.x);
    const height = Math.abs(currentDrag.y - dragStart.y);

    setDragStart(null);
    setCurrentDrag(null);

    // Require at least a small drag (e.g. 1.5% size) to avoid accidental single clicks
    if (width > 0.015 && height > 0.015) {
      const region: CropRegion = { x, y, width, height };
      if (isSnipMode) {
        onSnipComplete(region);
      } else if (isDefiningROI) {
        onROIComplete(region);
      }
    }
  };

  // Keyboard shortcut: Escape cancels current mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSnipMode) onCancelSnip();
        if (isDefiningROI) onCancelROI();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSnipMode, isDefiningROI, onCancelSnip, onCancelROI]);

  const rendered = getRenderedVideoRect();

  // Determine current active preview box (either while dragging, or persistent active region)
  let previewBox: { left: number; top: number; width: number; height: number; pixelW: number; pixelH: number } | null = null;

  if (rendered) {
    if (isDragging && dragStart && currentDrag) {
      const nx = Math.min(dragStart.x, currentDrag.x);
      const ny = Math.min(dragStart.y, currentDrag.y);
      const nw = Math.abs(currentDrag.x - dragStart.x);
      const nh = Math.abs(currentDrag.y - dragStart.y);

      previewBox = {
        left: rendered.x + nx * rendered.width,
        top: rendered.y + ny * rendered.height,
        width: nw * rendered.width,
        height: nh * rendered.height,
        pixelW: Math.round(nw * rendered.videoWidth),
        pixelH: Math.round(nh * rendered.videoHeight)
      };
    } else if (activeCropRegion && !isInteracting) {
      previewBox = {
        left: rendered.x + activeCropRegion.x * rendered.width,
        top: rendered.y + activeCropRegion.y * rendered.height,
        width: activeCropRegion.width * rendered.width,
        height: activeCropRegion.height * rendered.height,
        pixelW: Math.round(activeCropRegion.width * rendered.videoWidth),
        pixelH: Math.round(activeCropRegion.height * rendered.videoHeight)
      };
    }
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 pointer-events-auto ${
        isInteracting ? 'cursor-crosshair select-none' : 'pointer-events-none'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Banner / Instructions when in interactive mode */}
      {isInteracting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="bg-zinc-950/90 border border-orange-500/50 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-medium text-white">
            {isSnipMode ? (
              <>
                <Scissors size={14} className="text-orange-400 animate-pulse" />
                <span>Drag a rectangle to snip area</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} className="text-orange-400 animate-pulse" />
                <span>Drag a rectangle to set continuous crop region</span>
              </>
            )}
            <span className="text-zinc-500">•</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isSnipMode) onCancelSnip();
                else onCancelROI();
              }}
              className="text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-md transition-colors"
            >
              <X size={12} />
              <span>Cancel (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Dimmed backdrop when snipping or defining ROI */}
      {isInteracting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity" />
      )}

      {/* Render Box Overlay */}
      {previewBox && (
        <div
          className={`absolute transition-none ${
            isInteracting
              ? 'border-2 border-orange-400 bg-orange-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]'
              : 'border-2 border-dashed border-orange-500/80 bg-orange-500/5'
          }`}
          style={{
            left: `${previewBox.left}px`,
            top: `${previewBox.top}px`,
            width: `${previewBox.width}px`,
            height: `${previewBox.height}px`,
          }}
        >
          {/* Dimension indicator badge */}
          <div className="absolute -top-6 left-0 bg-zinc-900/90 text-[10px] font-mono text-orange-400 px-2 py-0.5 rounded border border-orange-500/40 backdrop-blur-sm whitespace-nowrap shadow-lg flex items-center gap-1">
            <span>{previewBox.pixelW} × {previewBox.pixelH}px</span>
            {!isInteracting && activeCropRegion && (
              <span className="text-[9px] text-zinc-400 font-sans">(ROI Active)</span>
            )}
          </div>

          {/* Corner anchor marks */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-orange-400 rounded-sm" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-sm" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-orange-400 rounded-sm" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-sm" />
        </div>
      )}
    </div>
  );
}

