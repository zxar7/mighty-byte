const WebSocket = require('ws');
const { WS_SERVER, RETRY_INTERVAL } = require('./constants'); // assuming WS_SERVER is port 8080
const pendingMessages = {}; // Store pending messages for retry
const connectedClients = {}; // Track connected clients by their ID

// Start the WebSocket server
const wsServer = new WebSocket.Server({ host: '0.0.0.0', port: WS_SERVER });

console.log('\n\nWebSocket server started on port', WS_SERVER);

// Handling incoming connections
wsServer.on('connection', (ws) => {

    ws.on('message', (message) => {
        console.log(`\n\nMessage received from client:`, (message).toString());

        try {
            const { type, payload } = JSON.parse(message);
            const { clientId } = payload;

            if (type === 'clientId') {
                if (clientId) {
                    // Store the client connection by their unique ID
                    connectedClients[clientId] = ws;
                    console.log('\n\nClient connected with ID:', clientId);
                    ws.clientId = clientId;
                } else {
                    console.log('\n\nInvalid message from client, client ID missing');
                }
            }
            if (type === 'ack') {
                const { shortenedURL } = payload;
                if (pendingMessages[clientId] && pendingMessages[clientId][shortenedURL]) {
                    console.log(`\n\nAcknowledgment received from ${clientId} for ${shortenedURL}`);
                    // Clear retry timeout for this message
                    clearTimeout(pendingMessages[clientId][shortenedURL].retryTimeout);
                    delete pendingMessages[clientId][shortenedURL];
                } else {
                    console.warn(`\n\nUnknown acknowledgment for ${shortenedURL}`);
                }
            }
        } catch (error) {
            console.error('\n\nError processing message:', error);
        }
    });

    // When client disconnects
    ws.on('close', () => {
        console.log(`\n\nClient ${ws.clientId} disconnected`);
        delete connectedClients[ws.clientId]; // Remove from the connectedClients list only
    });

    ws.on('error', (error) => {
        console.error('\n\nWebSocket error for client', ws.clientId, error.message);
    });
});

// Function to send messages with retry logic
const sendWithRetry = (clientId, message, shortenedURL) => {
    const sendMessage = () => {
        const ws = connectedClients[clientId];
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            console.log(`\n\nMessage sent to client ${clientId}:`, JSON.stringify(message));
        } else {
            console.log(`\n\nClient ${clientId} is not connected. Will retry later.`);
        }
        // Store the message in the pendingMessages list
        pendingMessages[clientId][shortenedURL] = {
            retryTimeout: setTimeout(retry, RETRY_INTERVAL),
        };
    };

    const retry = () => {
        const ws = connectedClients[clientId];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log(`\n\nClient ${clientId} is not connected. Retrying later...`);
            pendingMessages[clientId][shortenedURL].retryTimeout = setTimeout(retry, RETRY_INTERVAL);
        } else {
            console.log(`\n\nRetrying delivery for ${shortenedURL} to client ${clientId}`);
            sendMessage();
        }
    };

    // Ensure that the client exists in the pending messages list
    if (!pendingMessages[clientId]) {
        pendingMessages[clientId] = {};
    }
    sendMessage();
};

module.exports = { wsServer, sendWithRetry };

