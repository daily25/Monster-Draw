import { Player } from 'monster-draw-shared';

interface LobbyScreenProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
}

export default function LobbyScreen({ gameCode, players, isHost, onStartGame }: LobbyScreenProps) {
  const canStart = players.length >= 2;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="paper p-8 w-full max-w-md text-center">
        <h2 className="font-display text-3xl mb-2 text-purple-600">Game Lobby</h2>

        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Share this code with friends:</p>
          <p className="font-display text-5xl tracking-[0.3em] text-purple-700">{gameCode}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-600 mb-3">
            Players ({players.length}/8)
          </h3>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl"
                style={{ backgroundColor: player.color + '20' }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="font-bold text-lg">{player.name}</span>
                {!player.connected && (
                  <span className="text-xs text-gray-400">(disconnected)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {players.length < 2 && (
          <p className="text-amber-600 font-semibold mb-4">
            Waiting for at least 1 more player...
          </p>
        )}

        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="btn-primary w-full disabled:opacity-50"
          >
            {canStart ? "Let's Draw!" : 'Need more players...'}
          </button>
        ) : (
          <p className="text-gray-500 font-semibold text-lg">
            Waiting for host to start...
          </p>
        )}
      </div>
    </div>
  );
}
