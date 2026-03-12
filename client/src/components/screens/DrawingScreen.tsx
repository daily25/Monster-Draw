import { useState, useCallback, useRef } from 'react';
import {
  Stroke, ConnectionPoint, RoundNumber,
  CANVAS_WIDTH, ROUND_CANVAS_HEIGHTS, getFoldLineY, getFoldZoneHeight,
} from 'monster-draw-shared';
import DrawingCanvas from '../canvas/DrawingCanvas';
import { computeConnectionPoints } from '../../utils/connectionPoints';
import Konva from 'konva';

interface DrawingScreenProps {
  round: RoundNumber;
  connectionPoints: ConnectionPoint[];
  foldZoneImage: string;
  onSubmit: (strokes: Stroke[], connectionPoints: ConnectionPoint[], foldZoneImage: string) => void;
}

export default function DrawingScreen({ round, connectionPoints, foldZoneImage, onSubmit }: DrawingScreenProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [confirming, setConfirming] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);

  // Responsive canvas size
  const maxWidth = Math.min(window.innerWidth - 32, CANVAS_WIDTH);
  const scale = maxWidth / CANVAS_WIDTH;
  const canvasWidth = maxWidth;
  const logicalHeight = ROUND_CANVAS_HEIGHTS[round];
  const canvasHeight = logicalHeight * scale;

  const handleStrokesChange = useCallback((newStrokes: Stroke[]) => {
    setStrokes(newStrokes);
  }, []);

  const handleSubmit = () => {
    if (strokes.length === 0) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    const cps = computeConnectionPoints(round, strokes);

    // Capture the fold zone area as a screenshot
    if (stageRef.current && round < 3) {
      const foldLineY = getFoldLineY(round);
      const foldZoneHeight = getFoldZoneHeight(round);
      // Get the full stage as a data URL, then crop to the fold zone
      const fullDataUrl = stageRef.current.toDataURL({ pixelRatio: 1 });
      const img = new window.Image();
      img.onload = () => {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = CANVAS_WIDTH;
        cropCanvas.height = foldZoneHeight;
        const ctx = cropCanvas.getContext('2d')!;
        // Crop from the fold line to the bottom of the stage
        // Source coords are in the rendered pixel space of the full image
        ctx.drawImage(
          img,
          0, foldLineY * scale,
          canvasWidth, foldZoneHeight * scale,
          0, 0,
          CANVAS_WIDTH, foldZoneHeight
        );
        const foldImage = cropCanvas.toDataURL('image/png');
        console.log('[Monster Draw] Fold zone captured, size:', foldImage.length);
        onSubmit(strokes, cps, foldImage);
      };
      img.onerror = () => {
        console.error('[Monster Draw] Failed to load stage image for cropping');
        onSubmit(strokes, cps, '');
      };
      img.src = fullDataUrl;
    } else {
      onSubmit(strokes, cps, '');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-3">
      <DrawingCanvas
        round={round}
        connectionPoints={connectionPoints}
        foldZoneImage={foldZoneImage}
        onStrokesChange={handleStrokesChange}
        stageRef={stageRef}
        width={canvasWidth}
        height={canvasHeight}
      />

      <button
        onClick={handleSubmit}
        disabled={strokes.length === 0}
        className={`w-full disabled:opacity-50 ${
          confirming ? 'btn-secondary' : 'btn-primary'
        }`}
        style={{ maxWidth: canvasWidth }}
      >
        {confirming ? 'Tap again to confirm & fold!' : `Done! Fold & Send`}
      </button>

      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-white/70 underline text-sm"
        >
          Wait, let me keep drawing
        </button>
      )}
    </div>
  );
}
