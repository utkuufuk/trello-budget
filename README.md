# budget-trello
Quickly insert transactions in your budget spreadsheet by creating a Trello card.

### Installation & Configuration

#### Generate Auth Token for Spreadsheets 
1. Install [pip](https://pypi.org/project/pip/)
2. `pip install --upgrade google-api-python-client oauth2client`
3. Follow [quickstart guide step 1](https://developers.google.com/sheets/api/quickstart/python#step_1_turn_on_the) to create a console project, enable the Google Sheets API and download your credentials.
4. Copy the `credentials.json` file in project directory and run the following to generate `token.json`:
    ``` sh
    python createtoken.py
    ```

#### Set Up the Firebase CLI
1. [Install Node.js & npm](https://nodejs.org/en/download/package-manager/)
2. `npm install firebase-functions@latest firebase-admin@latest --save`
3. `sudo npm install -g firebase-tools`

#### Initialize Firebase SDK for Cloud Functions
1. Run `firebase login` to authenticate the firebase tool.
2. From [Firebase project console](https://console.firebase.google.com), select *Create a New Project*, and then add Firebase to your existing Google Spreadsheet project. 
3. Set your Firebase project ID in [`.firebaserc:`](.firebaserc) 
    ``` json
    {
        "projects": {
            "budget": "<project-ID>"
        }
    }
    ```
 * Run `npm install` from the [`functions`](functions)  directory.

#### Create a Trello Webhook
Set the following fields in [`webhook.sh`](webhook.sh) & run it to create a Trello webhook:
 * `APIToken`
 * `APIKey`
 * `CallbackURL`
 * `ModelID`
``` sh
./webhook.sh
```
Refer to [developer page](https://developers.trello.com/page/webhooks) for more info.

### Serve Locally or Deploy to Cloud
Serve functions locally without deploying functions to cloud:
``` sh
# default port is 5000
sudo firebase serve --only functions --port=5123
```

Deploy functions to cloud:
``` sh
firebase deploy --only functions
```

### Invoke Functions
 * Create a new collection called `config` in your Cloud Firestore and create a document called `auth` in it. Then set your username & password in it as shown below:

 ![Auth Doc](auth.png)

 * Also modify `USERNAME` and `PASSWORD` in [`post.py`](post.py) accordingly.
 * Finally make sure to set `LOCAL_PORT` correctly in [`post.py`](post.py) while serving functions locally.

#### Local Endpoint 
``` sh
# set spreadsheet ID by URL
python post.py local setSheet <SPREADSHEET_URL>

# set auth token
python post.py local setToken token.json

# make a transaction request
python post.py local transaction trello.json
```

#### Remote Endpoint
``` sh
# set spreadsheet ID by URL
python post.py remote setSheet <SPREADSHEET_URL>

# set auth token
python post.py remote setToken token.json

# make a transaction request
python post.py remote transaction trello.json
```

### References
 * [Trello Webhooks Guide](https://developers.trello.com/page/webhooks)
 * [Trello Webhooks Reference](https://developers.trello.com/reference#webhooks)
 * [Firebase Cloud Functions Guide](https://firebase.google.com/docs/functions/get-started)
 * [Google Spreadsheets API](https://developers.google.com/sheets/api/quickstart/nodejs)
 * [Express API](http://expressjs.com/en/4x/api.html)
