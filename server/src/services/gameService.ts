import {
  Game, Player, Paper, RoundNumber, RoundData,
  Stroke, ConnectionPoint, GameStatus,
} from 'monster-draw-shared';
import { generateGameCode } from '../utils/codeGenerator';
import { generateAssignments } from './assignmentService';

// In-memory game store (Firestore can be added later for persistence)
const games = new Map<string, Game>();

const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF8C42', '#98D8C8',
];

export function createGame(hostName: string): { game: Game; playerId: string } {
  let code: string;
  do {
    code = generateGameCode();
  } while (games.has(code));

  const playerId = generateId();
  const player: Player = {
    id: playerId,
    name: hostName,
    color: PLAYER_COLORS[0],
    connected: true,
  };

  const game: Game = {
    code,
    hostId: playerId,
    status: 'lobby',
    currentRound: 1,
    players: { [playerId]: player },
    papers: {},
    assignments: [],
    createdAt: Date.now(),
  };

  games.set(code, game);
  return { game, playerId };
}

export function joinGame(gameCode: string, name: string): { game: Game; playerId: string } | { error: string } {
  const game = games.get(gameCode.toUpperCase());
  if (!game) return { error: 'Game not found. Check your code and try again.' };
  if (game.status !== 'lobby') return { error: 'Game has already started.' };
  if (Object.keys(game.players).length >= 8) return { error: 'Game is full (max 8 players).' };

  const playerId = generateId();
  const playerCount = Object.keys(game.players).length;
  const player: Player = {
    id: playerId,
    name,
    color: PLAYER_COLORS[playerCount % PLAYER_COLORS.length],
    connected: true,
  };

  game.players[playerId] = player;
  return { game, playerId };
}

export function startGame(gameCode: string, hostId: string): { game: Game } | { error: string } {
  const game = games.get(gameCode);
  if (!game) return { error: 'Game not found.' };
  if (game.hostId !== hostId) return { error: 'Only the host can start the game.' };
  if (Object.keys(game.players).length < 2) return { error: 'Need at least 2 players.' };

  const playerIds = Object.keys(game.players);
  game.assignments = generateAssignments(playerIds);
  game.status = 'playing';
  game.currentRound = 1;

  // Create papers
  for (const assignment of game.assignments) {
    game.papers[assignment.paperId] = {
      id: assignment.paperId,
      ownerId: assignment.paperId,
      rounds: {},
    };
  }

  return { game };
}

export function submitDrawing(
  gameCode: string,
  paperId: string,
  round: RoundNumber,
  strokes: Stroke[],
  connectionPoints: ConnectionPoint[],
  foldZoneImage: string,
  playerId: string
): { game: Game; allDone: boolean } | { error: string } {
  const game = games.get(gameCode);
  if (!game) return { error: 'Game not found.' };
  if (game.status !== 'playing') return { error: 'Game is not in progress.' };
  if (game.currentRound !== round) return { error: 'Wrong round.' };

  const paper = game.papers[paperId];
  if (!paper) return { error: 'Paper not found.' };

  // Verify this player is assigned to draw on this paper this round
  const assignment = game.assignments.find((a) => a.paperId === paperId);
  if (!assignment || assignment.artists[round] !== playerId) {
    return { error: 'You are not assigned to this paper this round.' };
  }

  // Save the round data
  const roundData: RoundData = {
    artistId: playerId,
    strokes,
    connectionPoints,
    foldZoneImage,
    status: 'done',
  };
  paper.rounds[round] = roundData;

  // Check if all papers have been submitted for this round
  const allDone = game.assignments.every((a) => {
    const p = game.papers[a.paperId];
    return p.rounds[round]?.status === 'done';
  });

  return { game, allDone };
}

export function advanceRound(gameCode: string): { game: Game; gameOver: boolean } | { error: string } {
  const game = games.get(gameCode);
  if (!game) return { error: 'Game not found.' };

  if (game.currentRound >= 3) {
    game.status = 'revealing';
    return { game, gameOver: true };
  }

  game.currentRound = (game.currentRound + 1) as RoundNumber;
  return { game, gameOver: false };
}

export function getGame(gameCode: string): Game | undefined {
  return games.get(gameCode);
}

export function getPlayerList(game: Game): Player[] {
  return Object.values(game.players);
}

export function setPlayerConnected(gameCode: string, playerId: string, connected: boolean): void {
  const game = games.get(gameCode);
  if (game && game.players[playerId]) {
    game.players[playerId].connected = connected;
  }
}

export function removeGame(gameCode: string): void {
  games.delete(gameCode);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
