'''
Main for Flask app in Google Cloud's AppEngine



TODO: Optimize memory usage: 1 file for TWINT uses ~300MB or so; 6 use too much for F2 (now trying F4)
TODO: Set custom entrypoint (gunicorn, nginx)- some incomplete info: https://stackoverflow.com/questions/67463034/google-app-engine-using-custom-entry-point-with-python
'''

#import pandas
from datetime import datetime, timedelta, timezone
import dateutil.parser
import flask
from google.cloud import storage
import json
import logging as logme
import os
from os import listdir
import requests
from shutil import copyfile
import yaml

import decorators
import main_dbcontroller
from settings import app_settings
import twint


URL_LATEST_TWEET =  app_settings.URL_LATEST_TWEET
URL_CAPTURE_TWEETS = app_settings.URL_CAPTURE_TWEETS
URL_UPDATE_METRICS_FILES = app_settings.URL_UPDATE_METRICS_FILES
GCP_BUCKET = app_settings.GCP_BUCKET

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
    configuration file. Output is not formatted.
    '''
    result = parse_files_from_config(read_config_file())
    return str(result)


@app.route("/updategcp_db", methods=["GET"])
def tweets_to_db():
    """Reads search handles from config file, searches Twitter, and sends search results to
    database (using dbcontroller webservice call).
    
    Also updates/creates metrics .csv file for the dashboard"""
    # TODO: Can this time out? What to do about it? (touch the webservice first, try multiple times at the start of this call)
    # TODO: Can I reduce the instance to F2 or so if we don't have to deal with large files?

    logme.info("Start capturing searches in database.")
    comment = "TWINT webserver."
    
    # read part of config file
    entities = parse_files_from_config(read_config_file())
    
    # process config file (i.e. perform Twitter Search, capture results)
    for entity in entities:
        group_entity_id = entity["group_entity_id"]
        group_search_id = entity["search"]
        filepath = entity["localfilepath"]
        params = {'group_entity_id': group_entity_id}

        # avoid interference with same file names from file function
        if os.path.isfile(filepath): os.remove(filepath) 

        # Find most recent Tweet date
        response = requests.get(url = URL_LATEST_TWEET, params = params)
        if response.json() is not None:
            most_recent_tweet_date = dateutil.parser.isoparse(response.json())
        else:
            most_recent_tweet_date = None
        if most_recent_tweet_date == 'None': most_recent_tweet_date = None

        # Search tweets, save in file.
        search_newer_tweets(filepath, group_search_id, most_recent_tweet_date)

        logme.info("{} search done. Saving to database.".format(group_entity_id)) 

        # obtain tweets in JSON format from file
        if  os.path.isfile(filepath):
            tweet_json = main_dbcontroller.tweets_file_to_JSON(filepath, group_entity_id, group_search_id, comment)
            os.remove(filepath)

            # capture tweets in datbase
            headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'} # 'Content-Type' is essential; 'Accept' not sure.
            response = requests.post(URL_CAPTURE_TWEETS, data=tweet_json.encode('utf-8'), headers = headers) # .encode('utf-8') is essential
        
            logme.info("Progress for {}: {}. Latest tweet: {}.".format(group_entity_id, response, most_recent_tweet_date))
        else:
            logme.info("No results saved to database for {}.".format(group_entity_id))

    logme.info("Completed capturing searches in database.")
    
    logme.info("Creating updated metrics files.")
    response = requests.get(URL_UPDATE_METRICS_FILES)

    return "Completed."


@app.route("/updategcp", methods=["GET"])
def search_and_save_tweets():
    """Searches twitter and saves results into database; optionally additionally into files.

    The config file specifies what to search for and whether files should be created
    in addition to the database results.
    """
    
    # Update database with twitter search results. 
    tweets_to_db()
    
    # Update files with twitter search results (depending on config settings).
    files = parse_files_from_config(read_config_file())

    logme.info("Start capturing searches in file(s).")
    for f in files:
        if f['captureinfile']: # Don't save into file if we don't want to
            #TODO: prevent copying if file already exists in /tmp
            decorators.MakeCloudSafe(f['bucketfilepath'], f['localfilepath']).bucket_file(search_newer_tweets, f['localfilepath'], f['search'])
            if f.get('historyfill', False):
                decorators.MakeCloudSafe(f['bucketfilepath'], f['localfilepath']).bucket_file(SearchEarlierTweets, f['localfilepath'], f['search'])
    logme.info("Completed capturing searches in file(s).")

    return '200' # TODO: Can we return something useful?


#################################################
#################################################
## Utility functions
#################################################
#################################################
def search_newer_tweets(filename_str, search_str, from_date = None):
    """Search tweets more recent than the given date. Results will be captured in
    the file given.
    
    filename_str --
    search_str --
    from_date --
    """
    # TODO: Handle date properly
    if from_date is None: from_date = latest_tweet_in_file(filename_str)

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
    _, result = _earliest_and_latest_tweet_date_in_file(filename_str)
    return result


def earliest_tweet_in_file(filename_str):
    #TODO: Rename to EarliestTweetDateInFile
    result, _ = _earliest_and_latest_tweet_date_in_file(filename_str)
    return result


def _earliest_and_latest_tweet_date_in_file(filename_str):
    '''
    Given a file with tweets (as generated by TWINT), returns the datetime
    of the earliest and most recent tweet in the file.

    Note that a second is subtracted/added to this time.
    '''
    #TODO: not optimized
    #TODO: not sure whether time zones are dealt with properly
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
def read_config_file_gcp():
    '''
    Reads the config file from Google Storage

    Returns the contents as a Python dictionary.
    '''
    CONFIG_FILE = 'configgcp.yaml'

    storage_client = storage.Client()
    bucketName = GCP_BUCKET
    bucket = storage_client.get_bucket(bucketName)
    
    # TODO: Confirm file exists; or log error    
    blob = bucket.blob(CONFIG_FILE)
    data = blob.download_as_string(client=None)

    configdict = yaml.safe_load(data)

    return configdict


def read_config_file_local():
    ''' 
    Reads the config file from local storage

    Returns a dict with the contents of config file
    '''
    CONFIG_FILE = 'configgcp.yaml'

    # TODO: Confirm file exists
    with open(CONFIG_FILE, 'rt') as file:
        configdict = yaml.safe_load(file.read())

    return configdict


def read_config_file():
    """Reads the config file, either from Google Storage - if executing in
    GCP environment - or locally.

    Reads from configgcp.yaml
    
    Returns the contents as a Python dict.
    """
    if app_settings.Environment_GCP:
        configdict = read_config_file_gcp()
    else:
        configdict = read_config_file_local()

    return configdict


def parse_files_from_config(configdict):
    '''
    Interpret file information from config information
    
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
        f['group_entity_id'] = f.get('groupentityid', "")
        f['search'] = f.get('search', "")
        f['captureinfile'] = f.get('captureinfile', False)

    return filesinfo


if __name__ == "__main__":
    # Comment from Google examples at:
    # https://github.com/GoogleCloudPlatform/python-docs-samples/blob/main/appengine/standard_python3/building-an-app/building-an-app-1/main.py
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    # Flask's development server will automatically serve static files in
    # the "static" directory. See:
    # http://flask.pocoo.org/docs/1.0/quickstart/#static-files. Once deployed,
    # App Engine itself will serve those files as configured in app.yaml.   
    app.run(host="localhost", port=8080, debug=True)