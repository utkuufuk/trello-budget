'use strict';

var crypto = require('crypto');
const {google} = require('googleapis');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

// callback URL of Trello webhook requests
const TRELLO_CALLBACK_URL = "https://us-central1-" + process.env.GCLOUD_PROJECT + ".cloudfunctions.net/transaction";

// parses transaction fields from card name & assigns today if date is not specified
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

// create & return a promise that reads cells from a spreadsheet
function readCells(ssheetId, client, range) {
    return new Promise((resolve, reject) => {
        google.sheets('v4').spreadsheets.values.get({
            spreadsheetId: ssheetId,
            auth: client,
            range: range
        }, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
}

// create & return a promise that updates cells in a spreadsheet
function updateCells(ssheetId, client, range, transaction) {
    return new Promise((resolve, reject) => {
        google.sheets('v4').spreadsheets.values.update({
            spreadsheetId: ssheetId,
            auth: client,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {values: [transaction]}
        }, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
}

// verifies that the webhook request originated from Trello 
function verifyTrelloWebhookRequest(request, secret) {
  var base64Digest = function (s) {
    return crypto.createHmac('sha1', secret).update(s).digest('base64');
  }
  if (!("x-trello-webhook" in request.headers)) {
      return false;
  }
  var content = JSON.stringify(request.body) + TRELLO_CALLBACK_URL;
  var doubleHash = base64Digest(content);
  var headerHash = request.headers['x-trello-webhook'];
  return doubleHash === headerHash;
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
    let ssheetId;
    let client;

    // retrieve auth token & spreadsheet ID from firestore
    let tokenPromise = db.doc('config/token').get();
    let spreadsheetPromise = db.doc('config/spreadsheet').get();
    let secretPromise = db.doc('config/auth').get();
    return Promise.all([tokenPromise, spreadsheetPromise, secretPromise])
    .then(results => {
        const token = results[0].data();
        ssheetId = results[1].data().id;
        const secret = results[2].data()["trello-secret"];
        if (!verifyTrelloWebhookRequest(request, secret)) {
            response.status(403).end();
            throw new Error("Invalid or unauthorized Trello webhook request."); 
        }
        client = new google.auth.OAuth2(token.client_id, token.client_secret);
        client.setCredentials(token);
        return readCells(ssheetId, client, "Transactions!B5:E100");
    })
    .then(results => {
        const rowIndex = 5 + (results.data.values ? results.data.values.length : 0);
        const range = "Transactions!B" + rowIndex + ":E" + rowIndex;
        const updatePromise = updateCells(ssheetId, client, range, transaction);
        const titlePromise = readCells(ssheetId, client, "Summary!B8:E9");
        return Promise.all([updatePromise, titlePromise]);
    })
    .then(results => {
        const title = results[1].data.values[0][0];
        const numCells = results[0].data.updatedCells;
        console.log(`${numCells} cells updated in ${title} budget: ${transaction}`);
        return response.status(200).end();
    })
    .catch(err => {
        console.error(err);
        return response.status(500).end();
    });
});

// executes a callback only if the request authorization headers are valid
function authorizeUser(request, response, callback) {
    let creds = (new Buffer(request.headers.authorization.split(" ")[1], 'base64')).toString().split(":");
    db.doc('config/auth').get()
    .then(snapshot => {
        if (snapshot.data().username !== creds[0] || snapshot.data().password !== creds[1]) {
            console.warn("Incorrect username & password.");
            return response.status(403).end();
        }
        return callback();
    })
    .catch(err => {
        console.error(err);
        return response.status(500).end();
    })
}

// sets the "spreadsheet" doc in "config" collection
exports.setSheet = functions.https.onRequest((request, response) => {
    authorizeUser(request, response, () => {
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
});

// sets the "token" doc in "config" collection
exports.setToken = functions.https.onRequest((request, response) => {
    authorizeUser(request, response, () => {
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
});
