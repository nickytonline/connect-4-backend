import { produce } from 'immer';

interface GameState {
  isGameOver: boolean;
  players: Player[];
  board: number[][];
}

export interface GameContext {
  // gameId: string;
  gameState: GameState;
  error?: string;
}

export interface Move {
  x: number;
  y: number;
  playerId: number;
}

export interface Player {
  playerId: string;
  name: string;
}

export async function joinGame({ gameContext, player }: { gameContext: GameContext; player: Player }) {
  if (gameContext.gameState.players.length >= 2) {
    const nextGameContext = produce(gameContext, (draft) => {
      draft.error = "Can't add player. The max player count of 2 has been reached.";
    });

    return nextGameContext;
  }

  const nextGameContext = produce(gameContext, (draft) => {
    draft.gameState.players.push(player);
    draft.error = undefined;
  });

  return nextGameContext;
}

export async function makeMove({ gameContext, move }: { gameContext: GameContext; move: Move }) {
  const nextGameContext = produce(gameContext, (draft) => {
    draft.gameState.board[move.x][move.y] = move.playerId;
  });

  return nextGameContext;
}
