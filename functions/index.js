'use strict';

const {google} = require('googleapis');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

function parseTransaction(cardName) {
    let args = cardName.split(",");
    if (args.length !== 3 && args.length !== 4) {
        console.warn("Invalid number of fields in transaction.");
        return null;
    }
    if (args.length === 3) {
        console.log("Only 3 args were specified. Assigning today to date field.");
        args.unshift(new Date().toISOString().split('T')[0]);
    }
    return args.map(s => s.trim());
}

// handles webhooks triggered by the Budget list in Trello
exports.transaction = functions.https.onRequest((request, response) => {
    // validate request body
    if (!('body' in request) || !('action' in request.body) || !('type' in request.body.action)) {
        console.warn("Invalid Trello webhook request.");
        return response.status(400).end();
    }

    // make sure that it's a card creation event
    if (request.body.action.type !== 'createCard') {
        console.log("Not a card creation event:", request.body.action.type);
        return response.status(204).end();
    }

    let transaction = parseTransaction(request.body.action.data.card.name);
    console.log(transaction);

    // retrieve auth token & spreadsheet ID from firestore
    let tokenPromise = db.doc('config/token').get();
    let spreadsheetPromise = db.doc('config/spreadsheet').get();
    return Promise.all([tokenPromise, spreadsheetPromise])
    .then(results => {
        const token = results[0].data();
        const ssheetId = results[1].data().id;
        const client = new google.auth.OAuth2(token.client_id, token.client_secret);
        client.setCredentials(token);

        // create & return a promise that reads the spreadsheet title
        return new Promise((resolve, reject) => {google.sheets('v4').spreadsheets.values.get({
                spreadsheetId:ssheetId,
                auth:client,
                range:"Summary!B8:E9"
            }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        })
    })
    .then(result => {
        console.log(result.data.values[0][0]);
        return response.status(200).end();
    })
    .catch(err => {
        console.error(err);
        return response.status(500).end();
    });
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