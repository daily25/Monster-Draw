import { useSocket } from './hooks/useSocket';
import { useGame } from './hooks/useGame';
import HomeScreen from './components/screens/HomeScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import DrawingScreen from './components/screens/DrawingScreen';
import WaitingScreen from './components/screens/WaitingScreen';
import RevealListScreen from './components/screens/RevealListScreen';
import RevealScreen from './components/screens/RevealScreen';

export default function App() {
  const { socket, connected } = useSocket();
  const {
    state,
    createGame,
    joinGame,
    startGame,
    submitDrawing,
    requestReveal,
    goToRevealList,
    clearError,
  } = useGame(socket);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="paper p-8 text-center">
          <h1 className="font-display text-3xl text-purple-600 mb-2">Monster Draw!</h1>
          <p className="text-gray-500">Connecting...</p>
          <div className="mt-4 w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  switch (state.screen) {
    case 'home':
      return (
        <HomeScreen
          onCreateGame={createGame}
          onJoinGame={joinGame}
          error={state.error}
          onClearError={clearError}
        />
      );

    case 'lobby':
      return (
        <LobbyScreen
          gameCode={state.gameCode}
          players={state.players}
          isHost={state.isHost}
          onStartGame={startGame}
        />
      );

    case 'drawing':
      return (
        <DrawingScreen
          round={state.currentRound}
          connectionPoints={state.connectionPoints}
          foldZoneImage={state.foldZoneImage}
          onSubmit={submitDrawing}
        />
      );

    case 'waiting':
      return (
        <WaitingScreen
          round={state.currentRound}
          players={state.players}
          submittedPlayers={state.submittedPlayers}
        />
      );

    case 'reveal-list':
      return (
        <RevealListScreen
          players={state.players}
          playerId={state.playerId}
          onReveal={(paperId) => requestReveal(paperId)}
        />
      );

    case 'reveal':
      return state.revealData ? (
        <RevealScreen
          ownerName={state.revealData.ownerName}
          rounds={state.revealData.rounds}
          onBack={goToRevealList}
        />
      ) : null;

    default:
      return null;
  }
}
