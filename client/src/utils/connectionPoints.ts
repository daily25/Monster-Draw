import { Stroke, ConnectionPoint, FOLD_LINE_Y, CANVAS_HEIGHT } from 'monster-draw-shared';

const FOLD_ZONE_HEIGHT = 45; // must match DrawingCanvas

/**
 * Find where strokes cross the fold line and extract connection points.
 */
export function computeConnectionPoints(strokes: Stroke[]): ConnectionPoint[] {
  const points: ConnectionPoint[] = [];

  for (const stroke of strokes) {
    if (stroke.tool === 'eraser') continue;

    const pts = stroke.points;
    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = pts[i], y1 = pts[i + 1];
      const x2 = pts[i + 2], y2 = pts[i + 3];

      if ((y1 <= FOLD_LINE_Y && y2 >= FOLD_LINE_Y) ||
          (y1 >= FOLD_LINE_Y && y2 <= FOLD_LINE_Y)) {
        const t = (FOLD_LINE_Y - y1) / (y2 - y1);
        const x = x1 + t * (x2 - x1);
        points.push({
          x: Math.round(x),
          y: FOLD_LINE_Y,
          color: stroke.color,
          width: stroke.width,
        });
      }
    }

    if (pts.length >= 2) {
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      if (Math.abs(lastY - FOLD_LINE_Y) < 5) {
        points.push({
          x: Math.round(lastX),
          y: FOLD_LINE_Y,
          color: stroke.color,
          width: stroke.width,
        });
      }
    }
  }

  const deduped: ConnectionPoint[] = [];
  for (const p of points) {
    const tooClose = deduped.some(
      (d) => Math.abs(d.x - p.x) < 8 && Math.abs(d.y - p.y) < 8
    );
    if (!tooClose) deduped.push(p);
  }

  return deduped;
}

/**
 * Extract the portions of strokes that fall below the fold line.
 * Properly clips at the fold line boundary by computing intersection points,
 * then translates/scales to fit the fold zone on the next player's canvas.
 */
export function extractConnectionStrokes(strokes: Stroke[]): Stroke[] {
  const result: Stroke[] = [];
  const zoneRange = CANVAS_HEIGHT - FOLD_LINE_Y; // 60px of original
  const scaleY = FOLD_ZONE_HEIGHT / zoneRange;

  // Transform a point from original canvas space to fold zone space
  const toFoldZone = (x: number, y: number): [number, number] => {
    return [x, (y - FOLD_LINE_Y) * scaleY];
  };

  for (const stroke of strokes) {
    if (stroke.tool === 'eraser') continue;

    const pts = stroke.points;
    if (pts.length < 4) continue; // need at least 2 points

    // Check if any part of this stroke is at or below the fold line
    let touchesFoldZone = false;
    for (let i = 1; i < pts.length; i += 2) {
      if (pts[i] >= FOLD_LINE_Y - 2) { // small tolerance
        touchesFoldZone = true;
        break;
      }
    }
    if (!touchesFoldZone) continue;

    // Walk through segments, clip to fold zone, collect sub-paths
    let currentSegment: number[] = [];

    for (let i = 0; i < pts.length - 2; i += 2) {
      const x1 = pts[i], y1 = pts[i + 1];
      const x2 = pts[i + 2], y2 = pts[i + 3];
      const below1 = y1 >= FOLD_LINE_Y;
      const below2 = y2 >= FOLD_LINE_Y;

      if (below1 && below2) {
        // Both points in fold zone — add them
        if (currentSegment.length === 0) {
          currentSegment.push(...toFoldZone(x1, y1));
        }
        currentSegment.push(...toFoldZone(x2, y2));
      } else if (!below1 && below2) {
        // Crossing INTO fold zone — compute intersection, start new segment
        const t = (FOLD_LINE_Y - y1) / (y2 - y1);
        const ix = x1 + t * (x2 - x1);
        currentSegment.push(...toFoldZone(ix, FOLD_LINE_Y));
        currentSegment.push(...toFoldZone(x2, y2));
      } else if (below1 && !below2) {
        // Crossing OUT of fold zone — compute intersection, end segment
        const t = (FOLD_LINE_Y - y1) / (y2 - y1);
        const ix = x1 + t * (x2 - x1);
        if (currentSegment.length === 0) {
          currentSegment.push(...toFoldZone(x1, y1));
        }
        currentSegment.push(...toFoldZone(ix, FOLD_LINE_Y));
        // Save this segment
        if (currentSegment.length >= 4) {
          result.push({ ...stroke, points: [...currentSegment] });
        }
        currentSegment = [];
      }
      // else: both above — skip
    }

    // Save any remaining segment
    if (currentSegment.length >= 4) {
      result.push({ ...stroke, points: currentSegment });
    }
  }

  return result;
}
