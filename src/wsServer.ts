import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { Client, Connection } from '@temporalio/client';
import { TASK_QUEUE_NAME } from './utils';
import { getGameContextQuery } from './workflows';

const wss = new WebSocketServer({ port: 8080 });
let temporalClient: Client;

let playerCounter = 0;

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
  gameId: string;
  playerName: string;
}

interface MakeMoveAction {
  type: 'MAKE_MOVE';
  gameId: string;
  x: number;
  y: number;
  playerId: number;
}

interface ExplodePieceAction {
  type: 'EXPLODE_PIECE';
  x: number;
  y: number;
}

type ActionType = StartGameAction | JoinGameAction | MakeMoveAction | ExplodePieceAction;

async function startGame({ ws, action }: { ws: WebSocket; action: StartGameAction }) {
  const handle = await temporalClient.workflow.start('startGame', {
    taskQueue: TASK_QUEUE_NAME,
    workflowId: action.gameId,
    args: [],
  });

  ws.send(
    JSON.stringify({
      type: 'GAME_STARTED',
      workflowId: handle.workflowId,
    }),
  );
}

async function joinGame({ ws, action }: { ws: WebSocket; action: JoinGameAction }) {
  // get existing workflow handle based on gameId
  const workflowHandle = await temporalClient.workflow.getHandle(action.gameId);

  if (!workflowHandle) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Game not found' }));
    return;
  }

  try {
    // Send the join signal first
    await workflowHandle.signal('joinGame', {
      playerId: ++playerCounter,
      playerName: action.playerName,
    });

    const newGameContext = await workflowHandle.query(getGameContextQuery);

    ws.send(
      JSON.stringify({
        type: 'PLAYER_ADDED',
        workflowId: action.gameId,
        context: newGameContext,
      }),
    );
  } catch (error) {
    console.error('Error in joinGame:', error);
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to join game',
      }),
    );
  }
}

async function makeMove({ ws, action }: { ws: WebSocket; action: MakeMoveAction }) {
  const workflowHandle = await temporalClient.workflow.getHandle(action.gameId);

  if (!workflowHandle) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Game not found' }));
    return;
  }

  await workflowHandle.signal('makeMove', {
    x: action.x,
    y: action.y,
    gameId: action.gameId,
    playerId: action.playerId,
  });

  const newGameContext = await workflowHandle.query(getGameContextQuery);

  ws.send(JSON.stringify({ type: 'MOVE_MADE', workflowId: action.gameId, context: newGameContext }));
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
        case 'JOIN_GAME':
          await joinGame({ ws, action });
          break;
        case 'MAKE_MOVE':
          await makeMove({ ws, action });
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
