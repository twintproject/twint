'''
Main for Flask app in Google Cloud's AppEngine

TODO: Maybe can specify a file name instead of relying on 'main.py'?
'''

import twint
import pandas
import flask

from google.cloud import storage

from shutil import copyfile
from datetime import datetime
import json
import os

from os import listdir

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


''' 
Approach:
- Get List of files and search terms
-- either hard coded or from config file
- Copy files from bucket to local
- Get latest tweet datetime
- TWINT search with JSON file and 'from' datetime
- copy files from local to bucket
'''

@app.route("/updategcp", methods=["GET"])
def gcp_AppendToFilesJSON():
    bucket_dir = os.path.join('')
    local_dir = os.path.join('/tmp')

    fileinfo = {'bucketfilepath' : os.path.join(bucket_dir, 'cibc.json'), 'localfilepath' : os.path.join(local_dir, 'cibc.json'), 'search': 'cibc'}
    files = []
    files.append(fileinfo)

    #TODO: use GCP credentials; would allow for local testing
    storage_client = storage.Client()
    bucketName = 'industrious-eye-330414.appspot.com'
    bucket = storage_client.get_bucket(bucketName)

    result = ""

    myfiles = [f for f in listdir(local_dir)]
    result = result + ' Files in tmp folder before: '
    for f in myfiles:
        result = result + '\n' + f

    #myfiles = [f for f in listdir('/tmp')]
    #for f in myfiles:
     #   result = result + '\n' + f

    result = result + ' Looped files and folders: '

    for f in files:
        #TODO: prevent copying if file already exists in /tmp
        _gcp_CopyFileFromBucket(f['bucketfilepath'], f['localfilepath'], bucket)
        #SearchNewerTweets(f['localfilepath'], f['search']) # This does not work; results in error. I thought this worked a few times, but I guess not. THIS IS DISASTROUS AS THIS IS THE TWINT functionality.
        SearchNewerTweets(os.path.join(local_dir, 'cibc2.json'), f['search']) # This does not work; results in error. I thought this worked a few times, but I guess not. THIS IS DISASTROUS AS THIS IS THE TWINT functionality.
        _gcp_CopyFileToBucket(f['localfilepath'], f['bucketfilepath'], bucket)
        #_gcp_CopyFileToBucket(f['localfilepath'], 'cibc_updated.json', bucket)
        result = result + f['bucketfilepath'] + ' ' + f['localfilepath'] + " " + f['localfilepath'] + ' ' + f['localfilepath'] + ' ' + f['bucketfilepath']
    
    myfiles = [f for f in listdir(local_dir)]
    result = result + ' Files in tmp folder after: '
    for f in myfiles:
        result = result + '\n' + f
    result = result + '--' + str(latest_tweet_in_file(os.path.join(local_dir, 'cibc.json')))

    return result #'200'

@app.route("/update", methods=["GET"])
def AppendToFilesJSON():
    bucket_dir = os.path.join('tmpdata', 'src')
    local_dir = os.path.join('tmpdata', 'dst')

    fileinfo = {'bucketfilepath' : os.path.join(bucket_dir, 'cibc.json'), 'localfilepath' : os.path.join(local_dir, 'cibc.json'), 'search': 'cibc'}
    files = []
    files.append(fileinfo)

    for f in files:
        #TODO: prevent copying if file already exists in /tmp
        _CopyFileFromBucket(f['bucketfilepath'], f['localfilepath'], '')
        SearchNewerTweets(f['localfilepath'], f['search'])
        _CopyFileToBucket(f['localfilepath'], f['bucketfilepath'], '') 

    return '200'

def _gcp_CopyFileFromBucket(srcfilepath, destfilepath, bucket):
    #TODO: error handling (log when file does not exist; but continue)
    blob = bucket.blob(srcfilepath)
    blob.download_to_filename(destfilepath)
    return 0

def _gcp_CopyFileToBucket(srcfilepath, destfilepath, bucket):
    #TODO: error handling (log when file does not exist; but continue)
    blob = bucket.blob(destfilepath)
    blob.upload_from_filename(srcfilepath)
    return 0

def _CopyFileFromBucket(srcfilepath, destfilepath, bucket):
    #TODO: error handling (log when file does not exist; but continue)
    copyfile(srcfilepath, destfilepath)
    return 0

def _CopyFileToBucket(srcfilepath, destfilepath, bucket):
    #TODO: error handling (log when file does not exist; but continue)
    copyfile(srcfilepath, destfilepath)
    return 0

def SearchNewerTweets(filename_str, search_str):
	'''Searches for new tweets after the latest tweet present in the file.

    Since TWINT returns a limited and undefined number of tweets, there 
    is no guarantee that this results in a full file. Hence this would
    need to be run consistently and frequently to build histor.
    TODO: logic to ensure all tweets are obtained... (not worth it - only start from 'now'; history requires manual work)
	'''

	c = twint.Config()
	# choose username (optional)
	#c.Username = "insert username here"
	# choose search term (optional)
	c.Search = search_str
	# choose beginning time (narrow results)
	#c.Until = str(earliest_tweet_in_file())
	c.Since = str(latest_tweet_in_file(filename_str))
	# set limit on total tweets
	#c.Limit = TWT_LIMIT_RESULT
	# no idea, but makes the csv format properly
	#c.Store_csv = True
	# format of the csv
	#c.Custom = ["date", "time", "username", "tweet", "link", "likes", "retweets", "replies", "mentions", "hashtags"]
	c.Store_json = True
	# change the name of the output file
	c.Output = filename_str
	c.Hide_output = True
	twint.run.Search(c)

def latest_tweet_in_file(filename_str):
	'''Find earliest tweet captured in file.
	'''
	#CONCERN: not optimized, no error catching
	tweetsmetad = []
	#latest_tweet_dt = datetime.now()
	#print("---Starting ", filename_str)
	latest_tweet_dt = datetime(1990, 5, 17) # arbitraty, but Twitter did not exist at this date
	for line in open(filename_str, 'r', encoding="utf8"): # without this encoding french characters don't show right; also causes errors for others
		tweetsmetad.append(json.loads(line))
		if datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')>latest_tweet_dt:
			latest_tweet_dt = datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')
	#print("...Teets in file before search: ", len(tweetsmetad))
	return(latest_tweet_dt)

if __name__ == "__main__":
    # Used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    
    app.run(host="localhost", port=8080, debug=True)