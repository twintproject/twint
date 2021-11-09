'''
Main for Flask app in Google Cloud's AppEngine

TODO: Maybe can specify a file name instead of relying on 'main.py'?
'''

import twint
import pandas
import flask

from shutil import copyfile

# If `entrypoint` is not defined in app.yaml, App Engine will look for an app
# called `app` in `main.py`.
app = flask.Flask(__name__)

# Available at http://127.0.0.1:8080/ when using Development Docker image and VS Code
@app.route("/", methods=["GET"])
def TweetSearch():
    '''
    
    '''
    c = twint.Config()
    c.Search = "airtransat"
    c.Limit = 2
    c.Hide_output = True
    c.Pandas = True
    twint.run.Search(c)
    
    df = twint.storage.panda.Tweets_df
    tweets = str(df.sample(5)['tweet'])
    
    return tweets

if __name__ == "__main__":
    # Used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    
    app.run(host="localhost", port=8080, debug=True)

''' 
Approach:
- Get List of files and search terms
-- either hard coded or from config file
- Copy files from bucket to local
- Get latest tweet datetime
- TWINT search with JSON file and 'from' datetime
- copy files from local to bucket
'''

def _AppendToFilesJSON():

    fileinfo = {'filepath' : 'tempdata/src/cibc.json', 'search': 'cibc'}
    files = []
    files.append(fileinfo)

    for f in files:
        _CopyFileFromBucket(f['filepath'], '')



    return 0

def _CopyFileFromBucket(srcfilepath, bucket):
    dst = 'tempdata/dst/cibc.json'
    copyfile(srcfilepath, dst)
    return 0
