import { useCallback, useEffect, useReducer } from 'react';
import { Socket } from 'socket.io-client';
import {
  ClientEvents, ServerEvents, Player, RoundNumber,
  Stroke, ConnectionPoint,
} from 'monster-draw-shared';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

export type GameScreen = 'home' | 'lobby' | 'drawing' | 'waiting' | 'reveal-list' | 'reveal';

interface GameState {
  screen: GameScreen;
  gameCode: string;
  playerId: string;
  isHost: boolean;
  players: Player[];
  currentRound: RoundNumber;
  currentPaperId: string;
  connectionPoints: ConnectionPoint[];
  foldZoneImage: string;
  revealPaperId: string;
  revealData: {
    ownerName: string;
    rounds: Record<RoundNumber, { strokes: Stroke[]; artistName: string }>;
  } | null;
  submittedPlayers: string[];
  error: string;
}

type Action =
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'GAME_CREATED'; gameCode: string; playerId: string }
  | { type: 'GAME_JOINED'; gameCode: string; playerId: string }
  | { type: 'LOBBY_UPDATE'; players: Player[] }
  | { type: 'ROUND_START'; round: RoundNumber; paperId: string; connectionPoints: ConnectionPoint[]; foldZoneImage: string }
  | { type: 'PLAYER_SUBMITTED'; playerId: string }
  | { type: 'ALL_SUBMITTED'; nextRound?: RoundNumber; gameOver: boolean }
  | { type: 'DRAWING_SUBMITTED' }
  | { type: 'REVEAL_READY'; paperId: string; ownerName: string; rounds: any }
  | { type: 'SET_REVEAL_PAPER'; paperId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

const initialState: GameState = {
  screen: 'home',
  gameCode: '',
  playerId: '',
  isHost: false,
  players: [],
  currentRound: 1,
  currentPaperId: '',
  connectionPoints: [],
  foldZoneImage: '',
  revealPaperId: '',
  revealData: null,
  submittedPlayers: [],
  error: '',
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'GAME_CREATED':
      return { ...state, gameCode: action.gameCode, playerId: action.playerId, isHost: true, screen: 'lobby' };
    case 'GAME_JOINED':
      return { ...state, gameCode: action.gameCode, playerId: action.playerId, isHost: false, screen: 'lobby' };
    case 'LOBBY_UPDATE':
      return { ...state, players: action.players };
    case 'ROUND_START':
      return {
        ...state,
        screen: 'drawing',
        currentRound: action.round,
        currentPaperId: action.paperId,
        connectionPoints: action.connectionPoints,
        foldZoneImage: action.foldZoneImage,
        submittedPlayers: [],
      };
    case 'PLAYER_SUBMITTED':
      return { ...state, submittedPlayers: [...state.submittedPlayers, action.playerId] };
    case 'DRAWING_SUBMITTED':
      return { ...state, screen: 'waiting' };
    case 'ALL_SUBMITTED':
      if (action.gameOver) {
        return { ...state, screen: 'reveal-list' };
      }
      return state; // round-start will handle the transition
    case 'REVEAL_READY':
      return { ...state, screen: 'reveal', revealData: { ownerName: action.ownerName, rounds: action.rounds }, revealPaperId: action.paperId };
    case 'SET_REVEAL_PAPER':
      return { ...state, revealPaperId: action.paperId };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: '' };
    default:
      return state;
  }
}

export function useGame(socket: TypedSocket | null) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Register socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('lobby-update', ({ players }) => {
      dispatch({ type: 'LOBBY_UPDATE', players });
    });

    socket.on('round-start', ({ round, paperId, connectionPoints, foldZoneImage }) => {
      dispatch({ type: 'ROUND_START', round, paperId, connectionPoints, foldZoneImage });
    });

    socket.on('player-submitted', ({ playerId }) => {
      dispatch({ type: 'PLAYER_SUBMITTED', playerId });
    });

    socket.on('all-submitted', ({ nextRound, gameOver }) => {
      dispatch({ type: 'ALL_SUBMITTED', nextRound, gameOver });
    });

    socket.on('reveal-ready', ({ paperId, ownerName, rounds }) => {
      dispatch({ type: 'REVEAL_READY', paperId, ownerName, rounds });
    });

    socket.on('game-error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', error: message });
    });

    return () => {
      socket.off('lobby-update');
      socket.off('round-start');
      socket.off('player-submitted');
      socket.off('all-submitted');
      socket.off('reveal-ready');
      socket.off('game-error');
    };
  }, [socket]);

  const createGame = useCallback((hostName: string) => {
    if (!socket) return;
    socket.emit('create-game', { hostName }, ({ gameCode, playerId }) => {
      dispatch({ type: 'GAME_CREATED', gameCode, playerId });
    });
  }, [socket]);

  const joinGame = useCallback((gameCode: string, name: string) => {
    if (!socket) return;
    socket.emit('join-game', { gameCode, name }, ({ success, playerId, error }) => {
      if (success && playerId) {
        dispatch({ type: 'GAME_JOINED', gameCode: gameCode.toUpperCase(), playerId });
      } else {
        dispatch({ type: 'SET_ERROR', error: error || 'Failed to join game' });
      }
    });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('start-game', { gameCode: state.gameCode }, ({ success, error }) => {
      if (!success) {
        dispatch({ type: 'SET_ERROR', error: error || 'Failed to start game' });
      }
    });
  }, [socket, state.gameCode]);

  const submitDrawing = useCallback((strokes: Stroke[], connectionPoints: ConnectionPoint[], foldZoneImage: string) => {
    if (!socket) return;
    socket.emit('submit-drawing', {
      gameCode: state.gameCode,
      paperId: state.currentPaperId,
      round: state.currentRound,
      strokes,
      connectionPoints,
      foldZoneImage,
    }, ({ success, error }) => {
      if (success) {
        dispatch({ type: 'DRAWING_SUBMITTED' });
      } else {
        dispatch({ type: 'SET_ERROR', error: error || 'Failed to submit drawing' });
      }
    });
  }, [socket, state.gameCode, state.currentPaperId, state.currentRound]);

  const requestReveal = useCallback((paperId: string) => {
    if (!socket) return;
    socket.emit('request-reveal', { gameCode: state.gameCode, paperId });
  }, [socket, state.gameCode]);

  const goToRevealList = useCallback(() => {
    dispatch({ type: 'SET_SCREEN', screen: 'reveal-list' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return {
    state,
    createGame,
    joinGame,
    startGame,
    submitDrawing,
    requestReveal,
    goToRevealList,
    clearError,
  };
}
