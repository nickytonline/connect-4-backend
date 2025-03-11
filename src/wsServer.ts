import { WebSocketServer } from 'ws';
import { Client, Connection } from '@temporalio/client';

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

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
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

run();
