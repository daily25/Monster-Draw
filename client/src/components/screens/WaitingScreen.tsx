import { Player, RoundNumber, ROUND_LABELS } from 'monster-draw-shared';

interface WaitingScreenProps {
  round: RoundNumber;
  players: Player[];
  submittedPlayers: string[];
}

export default function WaitingScreen({ round, players, submittedPlayers }: WaitingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="paper p-8 w-full max-w-md text-center">
        <h2 className="font-display text-3xl mb-2 text-purple-600">Paper Folded!</h2>
        <p className="text-gray-500 mb-6">
          Waiting for others to finish drawing the {ROUND_LABELS[round]}...
        </p>

        {/* Folding animation */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-32 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-md animate-pulse relative">
            <div className="absolute inset-x-0 top-1/3 border-t-2 border-dashed border-gray-300" />
            <div className="absolute inset-x-0 top-2/3 border-t-2 border-dashed border-gray-300" />
          </div>
        </div>

        <div className="space-y-2">
          {players.map((player) => {
            const submitted = submittedPlayers.includes(player.id);
            return (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-4 rounded-xl"
                style={{ backgroundColor: player.color + '20' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="font-bold">{player.name}</span>
                </div>
                <span className={`text-sm font-bold ${submitted ? 'text-green-500' : 'text-gray-400'}`}>
                  {submitted ? 'Done!' : 'Drawing...'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
