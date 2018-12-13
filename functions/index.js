'use strict';

const {google} = require('googleapis');
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

    let tokenPromise = db.doc('config/token').get();
    let spreadsheetPromise = db.doc('config/spreadsheet').get();
    return Promise.all([tokenPromise, spreadsheetPromise]).then(results => {
        const token = results[0].data();
        const ssheetId = results[1].data().id;
        const client = new google.auth.OAuth2(token.client_id, token.client_secret);
        client.setCredentials(token);
        const sheets = google.sheets('v4');
        return new Promise((resolve, reject) => {
            sheets.spreadsheets.values.get({spreadsheetId: ssheetId,
                                            auth: client,
                                            range: "Summary!B8:E9"}, (err, result) => {
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