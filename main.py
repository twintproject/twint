'''
Main for Flask app in Google Cloud's AppEngine



TODO: Optimize memory usage: 1 file for TWINT uses ~300MB or so; 6 use too much for F2 (now trying F4)
TODO: return a meaningful '200' message?
TODO: Set custom entrypoint (gunicorn, nginx)- some incomplete info: https://stackoverflow.com/questions/67463034/google-app-engine-using-custom-entry-point-with-python
'''

import pandas
import flask
import json
import os
import requests
import yaml

from datetime import datetime, timedelta, timezone
from google.cloud import storage
from os import listdir
from shutil import copyfile

import main_dbcontroller
import twint

# TODO: put in a config file?
URL_LATEST_TWEET = 'https://dbcontroller-7zupgnxiba-uc.a.run.app/latesttweet'
URL_CAPTURE_TWEETS = 'https://dbcontroller-7zupgnxiba-uc.a.run.app/tweets'

# If `entrypoint` is not defined in app.yaml, App Engine will look for an app
# called `app` in `main.py`.
app = flask.Flask(__name__)

# Available at http://127.0.0.1:8080/ when using Development Docker image and VS Code
@app.route("/", methods=["GET"])
def TweetSearch():
    '''
    Basic example using Google Cloud, Flask, Twint
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


@app.route("/configgcp", methods=["GET"])
def gcp_TestConfig():
    '''
    Returns a representation of what is contained in the configgcp.yaml
    configuration file.
    '''
    result = ParseFilesFromConfig(ReadConfigFileGCP())
    return str(result)

@app.route("/updategcp_db", methods=["GET"])
def gcp_tweets_to_db():
    """Reads search handles from config file, searches Twitter, and sends search results to
    database (using dbcontroller webservice call."""
    # TODO: Can this time out? What to do about it? (touch the webservice first, try multiple times at the start of this call)
    # TODO: [L] Do it without saving to file first? But pandas seems to have a different Tweet data structure?
    # TODO: Promote into app engine; test against dev datbase, and redirect this function to work with GCP.
    # TODO: The promote Cloud run again, against prod database. Build prod databaes first.
    # TODO: change this URL so that the existing CRON job works? Or maybe I want both to run for a while? (But becomes expensive.)
    # TODO: Can I reduce the instance to F2 or so if we don't have to deal with large files?

    # setup connection to webservice
    url_latest_tweet = URL_LATEST_TWEET
    url_capture_tweets = URL_CAPTURE_TWEETS
    comment = "TWINT webserver."
    
    # TODO: set to GCP before deployment
    #entities = ParseFilesFromConfig(ReadConfigFileLocal())
    entities = ParseFilesFromConfig(ReadConfigFileGCP())

    for entity in entities:
        group_entity_id = entity["group_entity_id"]
        group_search_id = entity["search"]
        filepath = entity["localfilepath"]
        params = {'group_entity_id': group_entity_id}

        # don't want interference with same file names from file function
        if os.path.isfile(filepath): os.remove(filepath) 

        # Find most recent Tweet date
        response = requests.get(url = url_latest_tweet, params = params)
        most_recent_tweet_date = response.text
        if most_recent_tweet_date == 'None': most_recent_tweet_date = None

        # TODO: Remove this log, only here for trouble shooting
        # print("Is {} found: {}.".format(filepath, os.path.isfile(filepath)))
        
        # Search tweets, save in file.
        search_newer_tweets(filepath, group_search_id, most_recent_tweet_date)

        # TODO: Remove this log.
        print("{} Search done. Now saving in dbase.".format(group_entity_id)) 

        # obtain tweet in JSON format from file
        if  os.path.isfile(filepath):
            tweet_json = main_dbcontroller.tweets_file_to_JSON(filepath, group_entity_id, group_search_id, comment)
            os.remove(filepath)

            # capture tweets in datbase
            headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'} # 'Content-Type' is essential; 'Accept' not sure.
            response = requests.post(url_capture_tweets, data=tweet_json.encode('utf-8'), headers = headers) # .encode('utf-8') is essential
        
        # TODO: Remove this log.
        print("Progress for {}: {}. Latest tweet: {}.".format(group_entity_id, response, most_recent_tweet_date))
    return "Completed."


# NOTE: This is the original webservice to capture tweet results into files
# We should migrate to the DB version.
# NOTE: For now this also runs the database function (gcp_tweets_to_db)
@app.route("/updategcp", methods=["GET"])
def gcp_AppendToFilesJSON():
    '''
    Adds tweets to files specified in configgcp.yalm (on Google Storage)

    The files are captured on Google Storage. If no file exists it will be created.
    The function may take a long time to run. There is no meaningful return value.
    This works in Google Cloud App Engine environment.
    '''
    # TODO: Maybe not combine these; for now it is expedient.
    gcp_tweets_to_db()

    files = ParseFilesFromConfig(ReadConfigFileGCP())

    #TODO: use GCP credentials; would allow for local testing
    storage_client = storage.Client()
    bucketName = 'industrious-eye-330414.appspot.com'
    bucket = storage_client.get_bucket(bucketName)


    for f in files:
        #TODO: prevent copying if file already exists in /tmp
        #TODO: logging: adding tweets to file xyz
        _gcp_CopyFileFromBucket(f['bucketfilepath'], f['localfilepath'], bucket)
        SearchNewerTweets(f['localfilepath'], f['search'])
        if f.get('historyfill', False):
            SearchEarlierTweets(f['localfilepath'], f['search'])
        _gcp_CopyFileToBucket(f['localfilepath'], f['bucketfilepath'], bucket)
        #TODO: logging: completed adding tweets to file xyz
    
    return '200' # has to be a string


@app.route("/update", methods=["GET"])
def AppendToFilesJSON():
    '''
    Similar to gcp_AppendToFilesJSON above, but uses local files only.

    Not maintained.
    TODO: just remove?
    '''
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

    if blob.exists():
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
	c.Limit = 2000 
	# no idea, but makes the csv format properly
	#c.Store_csv = True
	# format of the csv
	#c.Custom = ["date", "time", "username", "tweet", "link", "likes", "retweets", "replies", "mentions", "hashtags"]
	c.Store_json = True
	# change the name of the output file
	c.Output = filename_str
	c.Hide_output = True
	twint.run.Search(c)


def search_newer_tweets(filename_str, search_str, from_date = None):
    """Search tweets more recent than the given date. Results will be captured in
    the file given.
    
    filename_str --
    search_str --
    from_date --
    """
    # TODO: Handle date properly
    if from_date is None: from_date = datetime(1990, 1, 1)

    c = twint.Config()
    c.Search = search_str
    #c.Until
    c.Since = str(from_date)
    c.Limit = 2000 
    c.Store_json = True
    c.Output = filename_str
    c.Hide_output = True

    twint.run.Search(c)


def SearchEarlierTweets(filename_str, search_str):
    '''Searches for new tweets before the earliest tweet present in the file.'''
    c = twint.Config()
    c.Search = search_str
    c.Until = str(earliest_tweet_in_file(filename_str))
    c.Limit = 2000
    c.Store_json = True
    c.Output = filename_str
    c.Hide_output = True
    twint.run.Search(c) 

def latest_tweet_in_file(filename_str):
    #TODO: Rename to LatestTweetDateInFile
    _, result = _EarliestLatestTweetDateInFile(filename_str)
    return result

def earliest_tweet_in_file(filename_str):
    #TODO: Rename to EarliestTweetDateInFile
    result, _ = _EarliestLatestTweetDateInFile(filename_str)
    return result

def _EarliestLatestTweetDateInFile(filename_str):
    '''
    Given a file with tweets (as generated by TWINT), returns the datetime
    of the earliest and most recent tweet in the file.

    Note that a second is subtracted/added to this time.
    '''
    #TODO: not optimized
    #TODO: not sure of time zones are dealt with properly
    tweetsmetad = []
    latest_tweet_dt = datetime(1990, 5, 17) # arbitraty, but Twitter did not exist at this date
    earliest_tweet_dt = datetime.now()
    if os.path.isfile(filename_str): #only read file if it exists
        for line in open(filename_str, 'r', encoding="utf8"):
            tweetsmetad.append(json.loads(line))
            if datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')>latest_tweet_dt:
                latest_tweet_dt = datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')
            if datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')<earliest_tweet_dt:
                earliest_tweet_dt = datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')
            

    # adding 1 second (microseconds not captured at source) to avoid duplicates when searching using TWINT
    latest_tweet_dt = latest_tweet_dt + timedelta(0, 1, 0)

    earliest_tweet_dt = earliest_tweet_dt - timedelta(0, 1, 0)

    return earliest_tweet_dt, latest_tweet_dt

    
#################################################
#################################################
## Logic for Configuration file
#################################################
#################################################
def ReadConfigFileGCP():
    '''
    Reads the config file from Google Storage

    Returns the contents as a Python dictionary.
    '''
    CONFIG_FILE = 'configgcp.yaml'

    #TODO: use GCP credentials; would allow for local testing
    storage_client = storage.Client()
    bucketName = 'industrious-eye-330414.appspot.com'
    bucket = storage_client.get_bucket(bucketName)
    
    # TODO: Confirm file exists; or log error    
    blob = bucket.blob(CONFIG_FILE)
    data = blob.download_as_string(client=None)

    configdict = yaml.safe_load(data)

    return configdict


def ReadConfigFileLocal():
    ''' 
    Reads the config file from local storage

    Returns a dict with the contents of config file
    '''
    CONFIG_FILE = 'configgcp.yaml'

    # TODO: Confirm file exists
    with open(CONFIG_FILE, 'rt') as file:
        configdict = yaml.safe_load(file.read())

    return configdict

def ParseFilesFromConfig(configdict):
    '''
    Read file information from configgcp file
    
    arguments:
    - configdict: dictionary containing the configfile info

    Returns a list of dictionary values representing files to update with tweets
    and their search terms. 

    This function is indepenent of location of config file (cloud, local etc.)
    '''
    bucket_dir = os.path.join('')
    local_dir = os.path.join('/tmp')
    
    filesinfo = configdict.get('files', ['no files'])

    for f in filesinfo:
        f['bucketfilepath'] = os.path.join(bucket_dir, f.get('filename', 'nothing found in config file'))
        f['localfilepath'] = os.path.join(local_dir, f.get('filename', 'nothing found in config file'))
        f['historyfill'] = f.get('historyfill', False)
        f['group_entity_id'] = f.get('groupentityid', "") # TODO: Remove any spaces? Not sure if it truly matters.
        f['search'] = f.get('search', "")

    return filesinfo

if __name__ == "__main__":
    # Used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    
    app.run(host="localhost", port=8080, debug=True)