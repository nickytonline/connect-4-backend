import * as workflow from '@temporalio/workflow';
import { joinGame, makeMove, type Move, type GameContext, type Player } from './activities';

export class MaxPlayersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxPlayersError';
  }
}

const joinGameSignal = workflow.defineSignal<[Player]>('joinGame');
export const getGameContextQuery = workflow.defineQuery<GameContext>('getGameContext');
const makeMoveSignal = workflow.defineSignal<[Move]>('makeMove');

export async function startGame() {
  let gameContext: GameContext = {
    // gameId: workflow.uuid4(),
    gameState: {
      players: [],
      isGameOver: false,
      board: Array.from({ length: 7 }, () => Array(7).fill(0)),
    },
  };

  workflow.setHandler(getGameContextQuery, () => {
    return gameContext;
  });

  // Register the signal handler
  workflow.setHandler(joinGameSignal, async (player) => {
    gameContext = await joinGame({ gameContext, player });
  });

  workflow.setHandler(makeMoveSignal, async (move) => {
    gameContext = await makeMove({ gameContext, move });
  });

  await workflow.condition(() => gameContext.gameState.isGameOver);
}
