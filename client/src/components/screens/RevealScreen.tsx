import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import {
  Stroke, RoundNumber, CANVAS_WIDTH, CANVAS_HEIGHT,
  FOLD_LINE_Y, ROUND_LABELS,
} from 'monster-draw-shared';

interface RevealScreenProps {
  ownerName: string;
  rounds: Record<RoundNumber, { strokes: Stroke[]; artistName: string }>;
  onBack: () => void;
}

const SECTION_HEIGHT = FOLD_LINE_Y; // Each section shows up to the fold line

export default function RevealScreen({ ownerName, rounds, onBack }: RevealScreenProps) {
  const [revealedSections, setRevealedSections] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const combinedStageRef = useRef<Konva.Stage>(null);

  // Responsive sizing
  const maxWidth = Math.min(window.innerWidth - 32, CANVAS_WIDTH);
  const scale = maxWidth / CANVAS_WIDTH;

  const startReveal = () => {
    setIsRevealing(true);
    setRevealedSections(1);
  };

  useEffect(() => {
    if (!isRevealing) return;
    if (revealedSections >= 3) return;

    const timer = setTimeout(() => {
      setRevealedSections((prev) => prev + 1);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isRevealing, revealedSections]);

  const handleSave = useCallback(() => {
    if (!combinedStageRef.current) return;
    const uri = combinedStageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `${ownerName}-monster.png`;
    link.href = uri;
    link.click();
  }, [ownerName]);

  const sectionHeight = SECTION_HEIGHT * scale;
  const totalHeight = sectionHeight * 3;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <h2 className="font-display text-3xl text-white text-center">
        {ownerName}'s Monster
      </h2>

      {!isRevealing ? (
        <div className="text-center">
          {/* Folded paper */}
          <div
            className="paper mx-auto mb-6 flex items-center justify-center"
            style={{ width: maxWidth, height: 120 }}
          >
            <div className="text-center">
              <p className="text-gray-400 text-lg mb-2">A mystery awaits...</p>
              <p className="text-6xl">🎁</p>
            </div>
          </div>
          <button onClick={startReveal} className="btn-primary text-2xl px-12">
            Reveal!
          </button>
        </div>
      ) : (
        <>
          {/* The unfolding sections */}
          <div
            className="relative"
            style={{ width: maxWidth, height: totalHeight, perspective: '1000px' }}
          >
            {([1, 2, 3] as RoundNumber[]).map((roundNum) => {
              const roundData = rounds[roundNum];
              if (!roundData) return null;
              const isVisible = revealedSections >= roundNum;

              return (
                <div
                  key={roundNum}
                  className={`absolute left-0 right-0 overflow-hidden ${
                    isVisible ? 'unfold unfold-delay-1' : ''
                  }`}
                  style={{
                    top: (roundNum - 1) * sectionHeight,
                    height: sectionHeight,
                    opacity: isVisible ? undefined : 0,
                    transformOrigin: 'top center',
                    transform: isVisible ? undefined : 'rotateX(-90deg)',
                  }}
                >
                  <div className="paper" style={{ width: maxWidth, height: sectionHeight }}>
                    <Stage
                      width={maxWidth}
                      height={sectionHeight}
                      scaleX={scale}
                      scaleY={scale}
                    >
                      <Layer>
                        {roundData.strokes.map((stroke, i) => (
                          <Line
                            key={i}
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
                      </Layer>
                    </Stage>
                  </div>
                  {/* Artist credit */}
                  {isVisible && (
                    <div className="absolute bottom-1 right-2 text-xs text-gray-300 italic">
                      {ROUND_LABELS[roundNum]} by {roundData.artistName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hidden combined stage for PNG export */}
          {revealedSections >= 3 && (
            <>
              <div style={{ position: 'absolute', left: -9999 }}>
                <Stage
                  ref={combinedStageRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT * 3}
                >
                  {([1, 2, 3] as RoundNumber[]).map((roundNum) => {
                    const roundData = rounds[roundNum];
                    if (!roundData) return null;
                    const offsetY = (roundNum - 1) * CANVAS_HEIGHT;
                    return (
                      <Layer key={roundNum} y={offsetY}>
                        {roundData.strokes.map((stroke, i) => (
                          <Line
                            key={i}
                            points={stroke.points}
                            stroke={stroke.color}
                            strokeWidth={stroke.width}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                          />
                        ))}
                      </Layer>
                    );
                  })}
                </Stage>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave} className="btn-secondary">
                  Save as PNG
                </button>
                <button onClick={onBack} className="btn-primary">
                  See More Monsters
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
