import {
  ConnectionPoint,
  RoundNumber,
  ROUND_CANVAS_HEIGHTS,
  Stroke,
  getFoldLineY,
  getFoldZoneHeight,
} from 'monster-draw-shared';

/**
 * Find where strokes cross the fold line and extract connection points.
 */
export function computeConnectionPoints(round: RoundNumber, strokes: Stroke[]): ConnectionPoint[] {
  const points: ConnectionPoint[] = [];
  const foldLineY = getFoldLineY(round);

  for (const stroke of strokes) {
    if (stroke.tool === 'eraser') continue;

    const pts = stroke.points;
    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = pts[i];
      const y1 = pts[i + 1];
      const x2 = pts[i + 2];
      const y2 = pts[i + 3];

      if ((y1 <= foldLineY && y2 >= foldLineY) ||
          (y1 >= foldLineY && y2 <= foldLineY)) {
        const t = (foldLineY - y1) / (y2 - y1);
        const x = x1 + t * (x2 - x1);
        points.push({
          x: Math.round(x),
          y: foldLineY,
          color: stroke.color,
          width: stroke.width,
        });
      }
    }

    if (pts.length >= 2) {
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      if (Math.abs(lastY - foldLineY) < 5) {
        points.push({
          x: Math.round(lastX),
          y: foldLineY,
          color: stroke.color,
          width: stroke.width,
        });
      }
    }
  }

  const deduped: ConnectionPoint[] = [];
  for (const point of points) {
    const tooClose = deduped.some(
      (existing) => Math.abs(existing.x - point.x) < 8 && Math.abs(existing.y - point.y) < 8
    );
    if (!tooClose) deduped.push(point);
  }

  return deduped;
}

/**
 * Extract the portions of strokes that fall below the fold line.
 * Properly clips at the fold line boundary by computing intersection points,
 * then translates to fit the fold zone on the next player's canvas.
 */
export function extractConnectionStrokes(round: RoundNumber, strokes: Stroke[]): Stroke[] {
  if (round >= 3) return [];

  const result: Stroke[] = [];
  const foldLineY = getFoldLineY(round);
  const foldZoneHeight = getFoldZoneHeight(round);
  const zoneRange = ROUND_CANVAS_HEIGHTS[round] - foldLineY;
  const scaleY = zoneRange > 0 ? foldZoneHeight / zoneRange : 1;

  const toFoldZone = (x: number, y: number): [number, number] => {
    return [x, (y - foldLineY) * scaleY];
  };

  for (const stroke of strokes) {
    if (stroke.tool === 'eraser') continue;

    const pts = stroke.points;
    if (pts.length < 4) continue;

    let touchesFoldZone = false;
    for (let i = 1; i < pts.length; i += 2) {
      if (pts[i] >= foldLineY - 2) {
        touchesFoldZone = true;
        break;
      }
    }
    if (!touchesFoldZone) continue;

    let currentSegment: number[] = [];

    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = pts[i];
      const y1 = pts[i + 1];
      const x2 = pts[i + 2];
      const y2 = pts[i + 3];
      const below1 = y1 >= foldLineY;
      const below2 = y2 >= foldLineY;

      if (below1 && below2) {
        if (currentSegment.length === 0) {
          currentSegment.push(...toFoldZone(x1, y1));
        }
        currentSegment.push(...toFoldZone(x2, y2));
      } else if (!below1 && below2) {
        const t = (foldLineY - y1) / (y2 - y1);
        const ix = x1 + t * (x2 - x1);
        currentSegment.push(...toFoldZone(ix, foldLineY));
        currentSegment.push(...toFoldZone(x2, y2));
      } else if (below1 && !below2) {
        const t = (foldLineY - y1) / (y2 - y1);
        const ix = x1 + t * (x2 - x1);
        if (currentSegment.length === 0) {
          currentSegment.push(...toFoldZone(x1, y1));
        }
        currentSegment.push(...toFoldZone(ix, foldLineY));
        if (currentSegment.length >= 4) {
          result.push({ ...stroke, points: [...currentSegment] });
        }
        currentSegment = [];
      }
    }

    if (currentSegment.length >= 4) {
      result.push({ ...stroke, points: currentSegment });
    }
  }

  return result;
}
