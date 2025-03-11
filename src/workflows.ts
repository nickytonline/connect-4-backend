import * as workflow from '@temporalio/workflow';
import { joinGame, type GameContext, type Player } from './activities';
import { produce } from 'immer';

export class MaxPlayersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxPlayersError';
  }
}

const joinGameSignal = workflow.defineSignal<[Player]>('joinGame');
export const getGameContextQuery = workflow.defineQuery<GameContext>('getGameContext');

export function startGame() {
  const gameContext: GameContext = {
    gameId: workflow.uuid4(),
    gameState: {
      players: [],
      isGameOver: false,
      board: Array.from({ length: 7 }, () => Array(7).fill(0)),
    },
  };

  workflow.setHandler(getGameContextQuery, () => gameContext);

  // Register the signal handler
  workflow.setHandler(joinGameSignal, async (player) => {
    try {
      console.log(`Player joining: ${player.name} (${player.playerId})`);
      produce(gameContext, (draft) => {
        draft.gameState.players.push(player);
      });
    } catch (error) {
      if (error instanceof MaxPlayersError) {
        console.log(`Failed to add player: ${error.message}`);
      } else {
        throw error; // Re-throw other errors
      }
    }
  });

  while (!gameContext.gameState.isGameOver) {
    await workflow.condition(() => gameContext.gameState.isGameOver);
  }
}
