const WebSocket = require('ws');
const { WS_SERVER } = require('./constants');
const { randomCodeGenerator } = require('./utilities');

// Create a WebSocket connection
const ws = new WebSocket(`ws://localhost:${WS_SERVER}`);

// const clientId = `client-${randomCodeGenerator()}`;
const clientId = `client-08V1w1E3Z1`;

console.log('\n\nTEST CLIENT: Attempting to connect to the WebSocket server');

// Handle WebSocket connection open event
ws.on('open', () => {
    console.log('\n\nTEST CLIENT: WebSocket connection established with server');
    
    // Example message sent to the server
    const initialMessage = JSON.stringify({ type: 'clientId', payload: {clientId} });
    ws.send(initialMessage);

    console.log('\n\nnTEST CLIENT: Message sent to server:', initialMessage);
});

// Handle messages from the server
ws.on('message', (message) => {
    console.log('\n\nnTEST CLIENT: Message received by Client:', message.toString());

    const { payload } = JSON.parse(message);

    // Acknowledge the received message
    const ackMessage = {
        type: 'ack',
        payload: {
            shortenedURL: payload.shortenedURL,
            clientId
        }
    };

    // ws.close () ---> to test disconnect

    // Send acknowledgment back to the server
    ws.send(JSON.stringify(ackMessage));
    console.log('\n\nnTEST CLIENT: Acknowledgment sent for:', payload.shortenedURL);
});

// Handle WebSocket close event
ws.on('close', () => {
    console.log('\n\nTEST CLIENT: WebSocket connection closed');
});

// Handle WebSocket error event
ws.on('error', (error) => {
    console.error('\n\nTEST CLIENT: WebSocket error:', error);
});
