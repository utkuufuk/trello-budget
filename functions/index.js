'use strict';

const functions = require('firebase-functions');

exports.transaction = functions.https.onRequest((request, response) => {
    if (!('body' in request) || !('action' in request.body) || !('type' in request.body.action)) {
        console.warn("Invalid Trello webhook request.");
        return response.status(400).end();
    }
    console.log("Card Name:", request.body.action.data.card.name);
    return response.status(200).end();
});
