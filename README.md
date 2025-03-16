# Connect 4 Workflow

The game engine for Connect 4 using Temporal.

## Prerequisites

1. [Install the Temporal Server](https://github.com/temporalio/cli/#installation).
1. Run `npm install` to install dependencies of the project.
1. Install [wscat](), a command line utility for interacting with a web socket server.

   ```bash
   npm install -g wscat
   ```

## Development Environnent Setup

1. Run `temporal server start-dev` to start the Temporal server.
1. Run `npm run start.watch` to start the Worker.
1. Run `npm run wss:watch` to start the web socket server in watch mode.

## Interacting with the workflow

Use `wscat` to send commands to the websocket server. Available payloads to send to the web socket server are:

- Start a game

  ```bash
  { "type": "START_GAME", "gameId": "game-123" }
  ```

- Join a game

  ```bash
  {"type": "JOIN_GAME","gameId":"game-123","playerName":"Nick" }
  ```

- Make a move

  ```bash
  {"type": "MAKE_MOVE", "gameId":"game-123", "x": 5, "y": 4, "playerId": 1}
  ```

- Get the current game context

  ```bash
  { "type": "GET_GAME_CONTEXT", "workflowId": "game-123" }
  ```

For example to start a game"

1. Run `wscat -c ws://localhost:8080` from a shell.
1. Paste in one of the payloads, e.g. `{ "type": "START_GAME", "gameId": "game-123" }`

   ```bash
   ❯ wscat -c ws://localhost:8080
   Connected (press CTRL+C to quit)
   > { "type": "START_GAME", "gameId": "game-123" }
   < {"type":"GAME_STARTED","workflowId":"game-123"}
   >
   ```

1. Look in the Temporal UI, http://localhost:8233/namespaces/default/workflows. Notice a new workflow has started.
