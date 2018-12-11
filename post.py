import sys
import json
import requests

LOCAL_PORT = 5000

def extractId(url):
    start = url.find("spreadsheets/d/")
    end = url.find("/edit#")
    if start == -1 or end == -1:
        print("Invalid URL:", url, file=sys.stderr)
        sys.exit(1)
    return url[(start + 15):end]

if __name__ == "__main__":
    # read firebase app ID from .firebaserc
    firebaserc = json.load(open('.firebaserc'))
    appId = firebaserc['projects']['budget']

    # build local & remote endpoint addresses
    localEndpoint = "http://localhost:" + str(LOCAL_PORT) + "/" + appId + "/us-central1/"
    remoteEndpoint = "https://us-central1-" + appId + ".cloudfunctions.net/"

    # read arguments & make a post request
    [_, endpoint, function, arg] = sys.argv
    url = (localEndpoint if (endpoint == 'local') else remoteEndpoint) + function
    payload = {'id': extractId(arg)} if function == 'setSheet' else json.load(open(arg))
    req = requests.post(url, json=payload)
    print("Server returned status code:", req.status_code)