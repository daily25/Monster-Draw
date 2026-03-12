import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import {
  Stroke,
  RoundNumber,
  CANVAS_WIDTH,
  ROUND_LABELS,
  getRevealSectionHeight,
} from 'monster-draw-shared';

interface RevealScreenProps {
  ownerName: string;
  rounds: Record<RoundNumber, { strokes: Stroke[]; artistName: string }>;
  onBack: () => void;
}

const ROUND_ORDER: RoundNumber[] = [1, 2, 3];

export default function RevealScreen({ ownerName, rounds, onBack }: RevealScreenProps) {
  const [revealedSections, setRevealedSections] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const combinedStageRef = useRef<Konva.Stage>(null);

  const maxWidth = Math.min(window.innerWidth - 32, CANVAS_WIDTH);
  const scale = maxWidth / CANVAS_WIDTH;

  const logicalSectionHeights = ROUND_ORDER.map((roundNum) => getRevealSectionHeight(roundNum));
  const logicalSectionOffsets = logicalSectionHeights.map((_, index) =>
    logicalSectionHeights.slice(0, index).reduce((sum, height) => sum + height, 0)
  );
  const scaledSectionHeights = logicalSectionHeights.map((height) => height * scale);
  const scaledSectionOffsets = logicalSectionOffsets.map((offset) => offset * scale);
  const totalHeight = scaledSectionHeights.reduce((sum, height) => sum + height, 0);
  const exportHeight = logicalSectionHeights.reduce((sum, height) => sum + height, 0);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <h2 className="font-display text-3xl text-white text-center">
        {ownerName}'s Monster
      </h2>

      {!isRevealing ? (
        <div className="text-center">
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
          <div
            className="relative"
            style={{ width: maxWidth, height: totalHeight, perspective: '1000px' }}
          >
            {ROUND_ORDER.map((roundNum, index) => {
              const roundData = rounds[roundNum];
              if (!roundData) return null;

              const isVisible = revealedSections >= roundNum;
              const sectionHeight = scaledSectionHeights[index];

              return (
                <div
                  key={roundNum}
                  className={`absolute left-0 right-0 overflow-hidden ${
                    isVisible ? 'unfold unfold-delay-1' : ''
                  }`}
                  style={{
                    top: scaledSectionOffsets[index],
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
                        {roundData.strokes.map((stroke, strokeIndex) => (
                          <Line
                            key={strokeIndex}
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
                  {isVisible && (
                    <div className="absolute bottom-1 right-2 text-xs text-gray-300 italic">
                      {ROUND_LABELS[roundNum]} by {roundData.artistName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {revealedSections >= 3 && (
            <>
              <div style={{ position: 'absolute', left: -9999 }}>
                <Stage
                  ref={combinedStageRef}
                  width={CANVAS_WIDTH}
                  height={exportHeight}
                >
                  {ROUND_ORDER.map((roundNum, index) => {
                    const roundData = rounds[roundNum];
                    if (!roundData) return null;

                    return (
                      <Layer key={roundNum} y={logicalSectionOffsets[index]}>
                        {roundData.strokes.map((stroke, strokeIndex) => (
                          <Line
                            key={strokeIndex}
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
