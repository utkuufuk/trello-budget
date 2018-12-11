'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

exports.transaction = functions.https.onRequest((request, response) => {
    if (!('body' in request) || !('action' in request.body) || !('type' in request.body.action)) {
        console.warn("Invalid Trello webhook request.");
        return response.status(400).end();
    }

    // TODO: read spreadsheet ID from firestore
    // TODO: read auth token from firestore

    console.log("Card Name:", request.body.action.data.card.name);
    return response.status(200).end();
});

// sets the "spreadsheet" doc in "config" collection
exports.setSheet = functions.https.onRequest((request, response) => {
    db.collection('config').doc('spreadsheet').set(request.body)
    .then(snapshot => {
        console.log("Spreadsheet ID set:", request.body['id']);
        return response.status(200).end();
    })
    .catch(err => {
        console.error(err);
        return response.status(500).end();
    });
});

// sets the "token" doc in "config" collection
exports.setToken = functions.https.onRequest((request, response) => {
    db.collection('config').doc('token').set(request.body)
    .then(snapshot => {
        console.log("Auth token set.");
        return response.status(200).end();
    })
    .catch(err => {
        console.error(err);
        return response.status(500).end();
    });
});