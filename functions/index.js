const functions = require('firebase-functions');

exports.transaction = functions.https.onRequest((request, response) => {
    console.log(request.body);
    return response.status(200).send("Hello from Firebase!");
});
