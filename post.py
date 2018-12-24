import sys
import json
import requests
from requests.auth import HTTPBasicAuth

LOCAL_PORT = 5002

def extractId(url):
    start = url.find("spreadsheets/d/")
    end = url.find("/edit#")
    if start == -1 or end == -1:
        print("Invalid URL:", url, file=sys.stderr)
        sys.exit(1)
    return url[(start + 15):end]

if __name__ == "__main__":
    # read firebase app ID from .firebaserc to build local & remote endpoint addresses
    firebaserc = json.load(open('.firebaserc'))
    appId = firebaserc['projects']['budget']
    localEndpoint = "http://localhost:" + str(LOCAL_PORT) + "/" + appId + "/us-central1/"
    remoteEndpoint = "https://us-central1-" + appId + ".cloudfunctions.net/"

    # read admin username & password from configuration file to use in HTTP request auth header
    auth = json.load(open('functions/.runtimeconfig.json'))
    username = auth["admin"]["username"]
    password = auth["admin"]["password"]

    # read arguments & make a post request
    [_, endpoint, function, arg] = sys.argv
    url = (localEndpoint if (endpoint == 'local') else remoteEndpoint) + function
    payload = {'id': extractId(arg)} if function == 'setSheet' else json.load(open(arg))
    req = requests.post(url, auth=HTTPBasicAuth(username, password), json=payload)
    print("Server returned status code:", req.status_code)