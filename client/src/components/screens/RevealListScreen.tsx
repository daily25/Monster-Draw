import { Player } from 'monster-draw-shared';

interface RevealListScreenProps {
  players: Player[];
  playerId: string;
  onReveal: (paperId: string) => void;
}

export default function RevealListScreen({ players, playerId, onReveal }: RevealListScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="paper p-8 w-full max-w-md text-center">
        <h2 className="font-display text-3xl mb-2 text-purple-600">All Done!</h2>
        <p className="text-gray-500 mb-6">
          Time to reveal the monsters! Tap a paper to unfold it.
        </p>

        <div className="space-y-3">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => onReveal(player.id)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                {/* Folded paper icon */}
                <div className="w-10 h-14 bg-gradient-to-b from-gray-100 to-gray-200 rounded shadow-sm relative">
                  <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-gray-300" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-gray-300" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">{player.name}'s Monster</p>
                  <p className="text-xs text-gray-400">
                    {player.id === playerId ? '(yours!)' : ''}
                  </p>
                </div>
              </div>
              <span className="text-2xl group-hover:scale-125 transition-transform">
                👁️
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
