const express = require('express');
const path = require('path');
const fsp = require('fs').promises;
const { SERVER_PORT } = require('./constants');
const { wsServer, sendWithRetry } = require('./wsServer'); // Import WebSocket functions
const { createUniqueCode, randomCodeGenerator } = require('./utilities');

const app = express();
app.use(express.json());

const PORT = SERVER_PORT;

app.listen(PORT, (error) => {
    if (error) {
        console.log('Error occurred, ', error);
    } else {
        console.log('App successfully running on port ', PORT);
    }
});

// Persist shortened URL and code in a JSON file
const persistCode = async (url) => {
    const filePath = path.join(__dirname, 'codes.json');
    try {
        const data = await fsp.readFile(filePath, 'utf-8');
        let jsonData = JSON.parse(data);
        const code = createUniqueCode(Object.keys(jsonData));
        jsonData[code] = url;

        await fsp.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
        return code;
    } catch (err) {
        if (err.code === 'ENOENT') {
            const newCode = randomCodeGenerator();
            const jsonData = { [newCode]: url };
            await fsp.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
            return newCode;
        } else {
            console.log('Error handling the file', err);
            return 0;
        }
    }
};

// Route to handle POST requests for shortening URLs
app.post('/url', async (req, res) => {
    const { url, clientId } = req.body;  // Expecting clientId in the request body

    if (!url || !clientId) {
        return res.status(400).send('Missing URL or clientId');
    }

    const regex = /[A-Za-z0-9]+\.(com|org|net)/;
    if (!regex.test(url)) {
        return res.status(400).send('Bad URL');
    }

    const code = await persistCode(url);
    const shortenedURL = `http://localhost:${PORT}/${code}`;

    // Send the shortened URL to the client via WebSocket
    const ws = Array.from(wsServer.clients).find((client) => client.clientId === clientId); // Find the correct ws clients. This is a set

    if (ws) {
        console.log('Sending shortened URL to client through WebSocket', clientId);
        sendWithRetry(clientId, { type: 'shortened', payload: { shortenedURL } }, shortenedURL);
    } else {
        console.warn(`No client connected with ID ${clientId}`);
    }

    // Respond to the original POST request with a success message
    res.send('Created shortened URL');
});

// Route to handle GET requests for shortened URLs
const fetchTheCode = async (code) => {
    try {
        const filePath = path.join(__dirname, 'codes.json');
        const data = await fsp.readFile(filePath, 'utf-8');
        let jsonData = JSON.parse(data);
        return jsonData[code] || false;
    } catch (err) {
        console.log('Something went wrong');
        return false;
    }
};

app.get('/:code', async (req, res) => {
    const code = req.params.code;
    const url = await fetchTheCode(code);
    if (url) {
        res.send({ url });
    } else {
        res.status(400).send('Invalid URL');
    }
});


/*

Examples of the POST API call

curl --location 'localhost:3000/url' \
--header 'Content-Type: application/json' \
--data '{ "url" : "google.com",
"clientId"  : "client-08V1w1E3Z1"}'


*/