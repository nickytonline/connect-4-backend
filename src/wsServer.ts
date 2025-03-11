import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { Client, Connection } from '@temporalio/client';
import { TASK_QUEUE_NAME } from './utils';

const wss = new WebSocketServer({ port: 8080 });
let temporalClient: Client;

async function initializeTemporalClient() {
  const connection = await Connection.connect({
    address: 'localhost:7233',
  });

  temporalClient = new Client({
    connection,
    namespace: 'default',
  });
}

interface StartGameAction {
  type: 'START_GAME';
  gameId: string;
}

interface JoinGameAction {
  type: 'JOIN_GAME';
  playerName: string;
}

interface MakeMoveAction {
  type: 'MAKE_MOVE';
  x: number;
  y: number;
}

interface ExplodePieceAction {
  type: 'EXPLODE_PIECE';
  x: number;
  y: number;
}

type ActionType = StartGameAction | JoinGameAction | MakeMoveAction | ExplodePieceAction;

async function startGame({ ws, action }: { ws: WebSocket; action: StartGameAction }) {
  const handle = await temporalClient.workflow.start('start-game', {
    taskQueue: TASK_QUEUE_NAME,
    workflowId: action.gameId,
  });

  ws.send(
    JSON.stringify({
      type: 'GAME_STARTED',
      workflowId: handle.workflowId,
    }),
  );
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const action = JSON.parse(message.toString()) as ActionType;

      switch (action.type) {
        case 'START_GAME':
          await startGame({ ws, action });
          break;
        default:
          ws.send(
            JSON.stringify({
              type: 'ERROR',
              message: 'Unknown request type',
            }),
          );
      }
    } catch (error: unknown) {
      // Type-safe error handling
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      ws.send(
        JSON.stringify({
          type: 'ERROR',
          message: errorMessage,
        }),
      );
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Initialize the server
async function run() {
  try {
    await initializeTemporalClient();
    console.log('WebSocket server is running on ws://localhost:8080');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Failed to initialize server:', error.message);
    } else {
      console.error('Failed to initialize server with unknown error');
    }
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Failed to run server:', error);
  process.exit(1);
});
