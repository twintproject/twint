'''
Main for Flask app in Google Cloud's AppEngine

TODO: Maybe can specify a file name instead of relying on 'main.py'?
'''

import twint
import pandas
import flask

from shutil import copyfile
from datetime import datetime
import json

# If `entrypoint` is not defined in app.yaml, App Engine will look for an app
# called `app` in `main.py`.
app = flask.Flask(__name__)

# Available at http://127.0.0.1:8080/ when using Development Docker image and VS Code
@app.route("/", methods=["GET"])
def TweetSearch():
    '''
    
    '''

    fileinfo = {'filepath' : 'tmpdata/src/cibc.json', 'search': 'cibc'}
    files = []
    files.append(fileinfo)

    for f in files:
        _CopyFileFromBucket(f['filepath'], '')
        SearchNewerTweets('tmpdata/dst/cibc.json', f['search'])
        _CopyFileToBucket(f['filepath'], '')    

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


@app.route("/er", methods=["GET"])
def AppendToFilesJSON():

    fileinfo = {'filepath' : 'tmpdata/src/cibc.json', 'search': 'cibc'}

    '''
    files = []
    files.append(fileinfo)

    for f in files:
        _CopyFileFromBucket(f['filepath'], '')
        _CopyFileToBucket(f['filepath'], '')

    '''
    return 200

def _CopyFileFromBucket(srcfilepath, bucket):
    dst = 'tmpdata/dst/cibc.json'
    copyfile(srcfilepath, dst)
    return 0

def _CopyFileToBucket(dstfilepath, bucket):
    srcfilepath = 'tmpdata/dst/cibc.json'
    dst = dstfilepath
    dst='tmpdata/src/cibc2.json'
    #dst='tmpdata/src/'
    copyfile(srcfilepath, dst)
    return 0

def SearchNewerTweets(filename_str, search_str):
	'''Subsequent search.

	Since only a limited number of tweets are returned (seemingly random in number),
	subsequent jobs are required to get the full set of results.
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