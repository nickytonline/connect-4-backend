import { produce } from 'immer';

interface GameState {
  isGameOver: boolean;
  players: Player[];
  board: number[][];
}

export interface GameContext {
  gameId: string;
  gameState: GameState;
  error?: string;
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
  });

  return nextGameContext;
}
