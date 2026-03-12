import { GameAssignment, RoundNumber } from 'monster-draw-shared';

/**
 * Generate paper assignments for N players.
 * Each player owns one paper. Papers rotate in a ring:
 *   Round 1: player[i] draws on paper[i] (their own)
 *   Round 2: player[(i+1) % N] draws on paper[i]
 *   Round 3: player[(i+2) % N] draws on paper[i]
 *
 * For 2 players: owner draws head + feet, other draws body.
 */
export function generateAssignments(playerIds: string[]): GameAssignment[] {
  const n = playerIds.length;
  return playerIds.map((ownerId, i) => ({
    paperId: ownerId, // paper ID = owner's player ID for simplicity
    artists: {
      1: playerIds[i],
      2: playerIds[(i + 1) % n],
      3: playerIds[(i + 2) % n],
    } as Record<RoundNumber, string>,
  }));
}

/** Get which paper a player should draw on for a given round */
export function getPaperForPlayer(
  assignments: GameAssignment[],
  playerId: string,
  round: RoundNumber
): GameAssignment | undefined {
  return assignments.find((a) => a.artists[round] === playerId);
}
