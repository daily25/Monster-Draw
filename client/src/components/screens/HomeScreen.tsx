import { useState } from 'react';

interface HomeScreenProps {
  onCreateGame: (name: string) => void;
  onJoinGame: (code: string, name: string) => void;
  error: string;
  onClearError: () => void;
}

export default function HomeScreen({ onCreateGame, onJoinGame, error, onClearError }: HomeScreenProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleCreate = () => {
    if (name.trim().length < 1) return;
    onCreateGame(name.trim());
  };

  const handleJoin = () => {
    if (name.trim().length < 1 || code.trim().length < 4) return;
    onJoinGame(code.trim(), name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="paper p-8 w-full max-w-md text-center">
        <h1 className="font-display text-5xl mb-2 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          Monster Draw!
        </h1>
        <p className="text-gray-500 mb-8 text-lg font-body font-semibold">
          Draw weird & wonderful creatures with friends!
        </p>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
            <button onClick={onClearError} className="ml-2 font-bold">✕</button>
          </div>
        )}

        {mode === 'choose' && (
          <div className="space-y-4">
            <button onClick={() => setMode('create')} className="btn-primary w-full">
              Create a Game
            </button>
            <button onClick={() => setMode('join')} className="btn-secondary w-full">
              Join a Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full text-center text-2xl font-bold py-4 px-4 rounded-2xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <button onClick={handleCreate} disabled={name.trim().length < 1} className="btn-primary w-full disabled:opacity-50">
              Create Game
            </button>
            <button onClick={() => setMode('choose')} className="text-gray-400 underline">
              Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full text-center text-2xl font-bold py-4 px-4 rounded-2xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <input
              type="text"
              placeholder="Game code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full text-center text-3xl font-bold py-4 px-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none tracking-[0.3em]"
            />
            <button
              onClick={handleJoin}
              disabled={name.trim().length < 1 || code.trim().length < 4}
              className="btn-secondary w-full disabled:opacity-50"
            >
              Join Game
            </button>
            <button onClick={() => setMode('choose')} className="text-gray-400 underline">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
