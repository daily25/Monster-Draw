import { useRef, useState, useCallback, useEffect, MutableRefObject } from 'react';
import { Stage, Layer, Line, Text, Rect, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import {
  Stroke, ConnectionPoint, CANVAS_WIDTH, CANVAS_HEIGHT,
  FOLD_LINE_Y, ROUND_LABELS, RoundNumber,
} from 'monster-draw-shared';

// Height of the "folded paper" zone showing the previous drawing's bottom edge
const FOLD_ZONE_HEIGHT = 50;

interface DrawingCanvasProps {
  round: RoundNumber;
  connectionPoints: ConnectionPoint[];
  foldZoneImage?: string;  // base64 PNG of previous player's fold zone
  onStrokesChange?: (strokes: Stroke[]) => void;
  stageRef?: MutableRefObject<Konva.Stage | null>;
  readOnly?: boolean;
  strokes?: Stroke[];
  width?: number;
  height?: number;
}

const COLORS = [
  '#1a1a2e', '#e74c3c', '#e67e22', '#f1c40f',
  '#2ecc71', '#3498db', '#9b59b6', '#e84393',
  '#ffffff', '#795548',
];

const BRUSH_SIZES = [3, 6, 10, 16];

export default function DrawingCanvas({
  round,
  connectionPoints,
  foldZoneImage = '',
  onStrokesChange,
  stageRef: externalStageRef,
  readOnly = false,
  strokes: externalStrokes,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
}: DrawingCanvasProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [foldImage, setFoldImage] = useState<HTMLImageElement | null>(null);
  const isDrawing = useRef(false);
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;

  const displayStrokes = externalStrokes || strokes;
  const scaleX = width / CANVAS_WIDTH;
  const scaleY = height / CANVAS_HEIGHT;

  // Load the fold zone image when it changes
  useEffect(() => {
    console.log('[Monster Draw] foldZoneImage prop received, length:', foldZoneImage?.length || 0);
    if (!foldZoneImage) {
      setFoldImage(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      console.log('[Monster Draw] Fold zone image loaded successfully:', img.width, 'x', img.height);
      setFoldImage(img);
    };
    img.onerror = (err) => {
      console.error('[Monster Draw] Failed to load fold zone image:', err);
      setFoldImage(null);
    };
    img.src = foldZoneImage;
  }, [foldZoneImage]);

  const getPointerPos = useCallback((stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scaleX, y: pos.y / scaleY };
  }, [scaleX, scaleY]);

  const handlePointerDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (readOnly) return;
    isDrawing.current = true;
    const pos = getPointerPos(e.target.getStage()!);
    if (!pos) return;

    const newStroke: Stroke = {
      tool,
      color: tool === 'eraser' ? '#fefef9' : color,
      width: tool === 'eraser' ? brushSize * 3 : brushSize,
      points: [pos.x, pos.y],
    };
    setCurrentStroke(newStroke);
  }, [readOnly, tool, color, brushSize, getPointerPos]);

  const handlePointerMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing.current || readOnly) return;
    e.evt.preventDefault();
    const pos = getPointerPos(e.target.getStage()!);
    if (!pos || !currentStroke) return;

    const updated = {
      ...currentStroke,
      points: [...currentStroke.points, pos.x, pos.y],
    };
    setCurrentStroke(updated);
  }, [readOnly, currentStroke, getPointerPos]);

  const finishStroke = useCallback(() => {
    if (!isDrawing.current || !currentStroke) return;
    isDrawing.current = false;

    const newStrokes = [...strokes, currentStroke];
    setStrokes(newStrokes);
    setRedoStack([]);
    setCurrentStroke(null);
    onStrokesChange?.(newStrokes);
  }, [currentStroke, strokes, onStrokesChange]);

  const handlePointerUp = finishStroke;

  const handlePointerLeave = useCallback(() => {
    if (isDrawing.current && currentStroke) {
      finishStroke();
    }
  }, [finishStroke, currentStroke]);

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const removed = strokes[strokes.length - 1];
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    setRedoStack([...redoStack, removed]);
    onStrokesChange?.(newStrokes);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    const newStrokes = [...strokes, restored];
    setStrokes(newStrokes);
    setRedoStack(redoStack.slice(0, -1));
    onStrokesChange?.(newStrokes);
  };

  const handleClear = () => {
    setRedoStack([...redoStack, ...strokes]);
    setStrokes([]);
    onStrokesChange?.([]);
  };

  const hasFoldZone = !!foldImage || connectionPoints.length > 0;
  const showFoldLine = !readOnly && round < 3;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Round label */}
      {!readOnly && (
        <div className="text-white font-bold text-lg bg-black/20 px-4 py-1 rounded-full">
          Draw the {ROUND_LABELS[round]}
        </div>
      )}

      {/* Canvas */}
      <div className="paper overflow-hidden" style={{ width, height, touchAction: 'none' }}>
        <Stage
          ref={stageRef as any}
          width={width}
          height={height}
          scaleX={scaleX}
          scaleY={scaleY}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          style={{ cursor: readOnly ? 'default' : 'crosshair' }}
        >
          <Layer>
            {/* Folded paper zone — screenshot from previous player's fold area */}
            {hasFoldZone && (
              <>
                {/* Folded paper background */}
                <Rect
                  x={0}
                  y={0}
                  width={CANVAS_WIDTH}
                  height={FOLD_ZONE_HEIGHT}
                  fill="#f0ede6"
                />
                {/* The actual screenshot image from the previous drawing */}
                {foldImage && (
                  <KonvaImage
                    image={foldImage}
                    x={0}
                    y={0}
                    width={CANVAS_WIDTH}
                    height={FOLD_ZONE_HEIGHT}
                  />
                )}
                {/* Paper fold shadow / crease */}
                <Line
                  points={[0, FOLD_ZONE_HEIGHT, CANVAS_WIDTH, FOLD_ZONE_HEIGHT]}
                  stroke="#bbb"
                  strokeWidth={1.5}
                />
                <Rect
                  x={0}
                  y={FOLD_ZONE_HEIGHT}
                  width={CANVAS_WIDTH}
                  height={8}
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={{ x: 0, y: 8 }}
                  fillLinearGradientColorStops={[0, 'rgba(0,0,0,0.06)', 1, 'rgba(0,0,0,0)']}
                />
                {/* Label */}
                <Text
                  text="^ continue from here ^"
                  x={CANVAS_WIDTH / 2 - 62}
                  y={FOLD_ZONE_HEIGHT + 2}
                  fontSize={10}
                  fill="#aaa"
                  fontFamily="Nunito"
                  fontStyle="italic"
                />
              </>
            )}

            {/* Completed strokes */}
            {displayStrokes.map((stroke, i) => (
              <Line
                key={`stroke-${i}`}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}

            {/* Current stroke being drawn */}
            {currentStroke && (
              <Line
                points={currentStroke.points}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.width}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  currentStroke.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            )}

            {/* Fold line (dotted) — not shown on round 3 (last round) */}
            {showFoldLine && (
              <>
                <Line
                  points={[0, FOLD_LINE_Y, CANVAS_WIDTH, FOLD_LINE_Y]}
                  stroke="#aaa"
                  strokeWidth={2}
                  dash={[8, 6]}
                />
                <Text
                  text="--- fold line ---"
                  x={CANVAS_WIDTH / 2 - 50}
                  y={FOLD_LINE_Y + 4}
                  fontSize={11}
                  fill="#bbb"
                  fontFamily="Nunito"
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Drawing tools */}
      {!readOnly && (
        <div className="flex flex-col gap-2 w-full" style={{ maxWidth: width }}>
          {/* Colors */}
          <div className="flex justify-center gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen'); }}
                className="w-9 h-9 rounded-full border-2 transition-transform active:scale-90"
                style={{
                  backgroundColor: c,
                  borderColor: color === c && tool === 'pen' ? '#7C3AED' : '#ddd',
                  transform: color === c && tool === 'pen' ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #ddd' : undefined,
                }}
              />
            ))}
          </div>

          {/* Brush size + tools */}
          <div className="flex items-center justify-center gap-2">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all"
                style={{
                  borderColor: brushSize === size ? '#7C3AED' : '#e5e7eb',
                  backgroundColor: brushSize === size ? '#f3e8ff' : 'white',
                }}
              >
                <div
                  className="rounded-full bg-gray-700"
                  style={{ width: size + 2, height: size + 2 }}
                />
              </button>
            ))}

            <div className="w-px h-8 bg-gray-200 mx-1" />

            <button
              onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
              className="w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg transition-all"
              style={{
                borderColor: tool === 'eraser' ? '#e74c3c' : '#e5e7eb',
                backgroundColor: tool === 'eraser' ? '#fde8e8' : 'white',
              }}
            >
              {tool === 'eraser' ? '🖊️' : '🧹'}
            </button>

            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg bg-white disabled:opacity-30"
            >
              ↩️
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg bg-white disabled:opacity-30"
            >
              ↪️
            </button>

            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg bg-white disabled:opacity-30"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
