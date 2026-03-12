// ---- Drawing Types ----

export interface Stroke {
  tool: 'pen' | 'eraser';
  color: string;
  width: number;
  points: number[]; // [x1,y1, x2,y2, ...] flat array (Konva Line format)
}

// Connection points where strokes cross the fold line
// These are the only thing the next player sees
export interface ConnectionPoint {
  x: number;
  y: number;
  color: string;  // stroke color at crossing
  width: number;  // stroke width at crossing
}

// ---- Game Types ----

export type GameStatus = 'lobby' | 'playing' | 'revealing' | 'done';
export type RoundNumber = 1 | 2 | 3;
export type RoundStatus = 'waiting' | 'drawing' | 'done';

export const ROUND_LABELS: Record<RoundNumber, string> = {
  1: 'Head & Neck',
  2: 'Body & Legs',
  3: 'Feet & Shoes',
};

export interface RoundData {
  artistId: string;
  strokes: Stroke[];
  connectionPoints: ConnectionPoint[];
  foldZoneImage: string; // base64 PNG screenshot of the fold zone area
  status: RoundStatus;
}

export interface Paper {
  id: string;
  ownerId: string; // player who gets the reveal
  rounds: Partial<Record<RoundNumber, RoundData>>;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  currentPaperId?: string;
}

export interface GameAssignment {
  paperId: string;
  artists: Record<RoundNumber, string>; // round -> playerId
}

export interface Game {
  code: string;
  hostId: string;
  status: GameStatus;
  currentRound: RoundNumber;
  players: Record<string, Player>;
  papers: Record<string, Paper>;
  assignments: GameAssignment[];
  createdAt: number;
}

// ---- Socket Events ----

export interface ClientEvents {
  'create-game': (data: { hostName: string }, cb: (res: { gameCode: string; playerId: string }) => void) => void;
  'join-game': (data: { gameCode: string; name: string }, cb: (res: { success: boolean; playerId?: string; error?: string }) => void) => void;
  'start-game': (data: { gameCode: string }, cb: (res: { success: boolean; error?: string }) => void) => void;
  'submit-drawing': (data: {
    gameCode: string;
    paperId: string;
    round: RoundNumber;
    strokes: Stroke[];
    connectionPoints: ConnectionPoint[];
    foldZoneImage: string;
  }, cb: (res: { success: boolean; error?: string }) => void) => void;
  'request-reveal': (data: { gameCode: string; paperId: string }) => void;
}

export interface ServerEvents {
  'lobby-update': (data: { players: Player[] }) => void;
  'round-start': (data: {
    round: RoundNumber;
    paperId: string;
    connectionPoints: ConnectionPoint[];
    foldZoneImage: string;
  }) => void;
  'player-submitted': (data: { playerId: string; playerName: string }) => void;
  'all-submitted': (data: { nextRound?: RoundNumber; gameOver: boolean }) => void;
  'reveal-ready': (data: {
    paperId: string;
    ownerName: string;
    rounds: Record<RoundNumber, { strokes: Stroke[]; artistName: string }>;
  }) => void;
  'game-error': (data: { message: string }) => void;
}

// ---- Canvas Constants ----

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 500;
export const FOLD_LINE_Y = CANVAS_HEIGHT - 60; // dotted line position from top
export const CONNECTION_ZONE_HEIGHT = 60; // area around fold line where connection points are captured
