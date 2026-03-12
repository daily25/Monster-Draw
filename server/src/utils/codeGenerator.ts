// Generate a 4-character uppercase game code (no ambiguous chars like O/0, I/1)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateGameCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
