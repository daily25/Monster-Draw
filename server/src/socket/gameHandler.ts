import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents, RoundNumber } from 'monster-draw-shared';
import { getPaperForPlayer } from '../services/assignmentService';
import * as gameService from '../services/gameService';

interface SocketData {
  playerId: string;
  gameCode: string;
}

export function registerGameHandlers(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents> & { data: SocketData }
) {
  socket.on('create-game', ({ hostName }, cb) => {
    const { game, playerId } = gameService.createGame(hostName);
    socket.data.playerId = playerId;
    socket.data.gameCode = game.code;
    socket.join(game.code);
    cb({ gameCode: game.code, playerId });
    console.log(`Game ${game.code} created by ${hostName}`);
  });

  socket.on('join-game', ({ gameCode, name }, cb) => {
    const normalizedCode = gameCode.toUpperCase();
    const result = gameService.joinGame(normalizedCode, name);
    if ('error' in result) {
      cb({ success: false, error: result.error });
      return;
    }

    const { game, playerId } = result;
    socket.data.playerId = playerId;
    socket.data.gameCode = game.code;
    socket.join(game.code);
    cb({ success: true, playerId });

    // Broadcast updated player list to the lobby
    io.to(game.code).emit('lobby-update', {
      players: gameService.getPlayerList(game),
    });
    console.log(`${name} joined game ${game.code}`);
  });

  socket.on('start-game', ({ gameCode }, cb) => {
    const result = gameService.startGame(gameCode, socket.data.playerId);
    if ('error' in result) {
      cb({ success: false, error: result.error });
      return;
    }

    cb({ success: true });
    const { game } = result;

    // Send each player their round 1 assignment
    for (const [pid, player] of Object.entries(game.players)) {
      const assignment = getPaperForPlayer(game.assignments, pid, 1);
      if (assignment) {
        const sockets = io.sockets.adapter.rooms.get(gameCode);
        if (sockets) {
          for (const sid of sockets) {
            const s = io.sockets.sockets.get(sid) as Socket<ClientEvents, ServerEvents> & { data: SocketData } | undefined;
            if (s && s.data.playerId === pid) {
              s.emit('round-start', {
                round: 1,
                paperId: assignment.paperId,
                connectionPoints: [],
                foldZoneImage: '',
              });
            }
          }
        }
      }
    }
    console.log(`Game ${gameCode} started with ${Object.keys(game.players).length} players`);
  });

  socket.on('submit-drawing', ({ gameCode, paperId, round, strokes, connectionPoints, foldZoneImage }, cb) => {
    console.log(`[Monster Draw] submit-drawing: round=${round}, strokes=${strokes.length}, foldZoneImage length=${foldZoneImage?.length || 0}`);
    const result = gameService.submitDrawing(
      gameCode, paperId, round, strokes, connectionPoints, foldZoneImage, socket.data.playerId
    );
    if ('error' in result) {
      cb({ success: false, error: result.error });
      return;
    }

    cb({ success: true });
    const { game, allDone } = result;
    const player = game.players[socket.data.playerId];

    // Notify others that this player submitted
    socket.to(gameCode).emit('player-submitted', {
      playerId: socket.data.playerId,
      playerName: player?.name || 'Unknown',
    });

    if (allDone) {
      const advResult = gameService.advanceRound(gameCode);
      if ('error' in advResult) return;

      const { game: updatedGame, gameOver } = advResult;

      if (gameOver) {
        io.to(gameCode).emit('all-submitted', { gameOver: true });
      } else {
        const nextRound = updatedGame.currentRound;
        io.to(gameCode).emit('all-submitted', { nextRound, gameOver: false });

        // Send each player their next round assignment with connection points
        setTimeout(() => {
          sendRoundAssignments(io, updatedGame, nextRound);
        }, 1500); // brief delay for the fold animation
      }
    }
  });

  socket.on('request-reveal', ({ gameCode, paperId }) => {
    const game = gameService.getGame(gameCode);
    if (!game) return;

    const paper = game.papers[paperId];
    if (!paper) return;

    const rounds: Record<number, { strokes: any[]; artistName: string }> = {};
    for (const r of [1, 2, 3] as RoundNumber[]) {
      const rd = paper.rounds[r];
      if (rd) {
        const artist = game.players[rd.artistId];
        rounds[r] = {
          strokes: rd.strokes,
          artistName: artist?.name || 'Unknown',
        };
      }
    }

    socket.emit('reveal-ready', {
      paperId,
      ownerName: game.players[paper.ownerId]?.name || 'Unknown',
      rounds: rounds as any,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.data.gameCode && socket.data.playerId) {
      gameService.setPlayerConnected(socket.data.gameCode, socket.data.playerId, false);
      const game = gameService.getGame(socket.data.gameCode);
      if (game) {
        io.to(socket.data.gameCode).emit('lobby-update', {
          players: gameService.getPlayerList(game),
        });
      }
    }
  });
}

function sendRoundAssignments(
  io: Server<ClientEvents, ServerEvents>,
  game: Game,
  round: RoundNumber
) {
  const sockets = io.sockets.adapter.rooms.get(game.code);
  if (!sockets) return;

  for (const sid of sockets) {
    const s = io.sockets.sockets.get(sid) as Socket<ClientEvents, ServerEvents> & { data: SocketData } | undefined;
    if (!s) continue;

    const pid = s.data.playerId;
    const assignment = getPaperForPlayer(game.assignments, pid, round);
    if (!assignment) continue;

    // Get connection points from the previous round
    const paper = game.papers[assignment.paperId];
    const prevRound = (round - 1) as RoundNumber;
    const prevData = paper?.rounds[prevRound];
    const connectionPoints = prevData?.connectionPoints || [];
    const foldZoneImage = prevData?.foldZoneImage || '';

    console.log(`[Monster Draw] Sending round-start to ${pid}: round=${round}, foldZoneImage length=${foldZoneImage.length}, connectionPoints=${connectionPoints.length}`);
    s.emit('round-start', {
      round,
      paperId: assignment.paperId,
      connectionPoints,
      foldZoneImage,
    });
  }
}

// Need Game type for the helper
import { Game } from 'monster-draw-shared';
