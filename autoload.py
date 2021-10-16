import twint
import schedule
import time
import json
from datetime import datetime
import os

TWT_FILE_NAME = 'cibc.json'
TWT_LIMIT_RESULT = 1000
TWT_SINCE_RESULT = "2019-01-01"
TWT_SEARCH_FOR = '@cibc'
TWT_HIDE_OUTPUT = True

def jobsone():
	'''First search.

	Since only a limited number of tweets are returned (seemingly random in number),
	subsequent jobs are required to get the full set of results.
	'''
	print ("Fetching Initial Set of Tweets")
	c = twint.Config()
	# choose username (optional)
	#c.Username = "insert username here"
	# choose search term (optional)
	c.Search = TWT_SEARCH_FOR
	# choose beginning time (narrow results)
	c.Since = TWT_SINCE_RESULT
	# set limit on total tweets
	c.Limit = TWT_LIMIT_RESULT
	# no idea, but makes the csv format properly
	#c.Store_csv = True
	# format of the csv
	#c.Custom = ["date", "time", "username", "tweet", "link", "likes", "retweets", "replies", "mentions", "hashtags"]
	c.Store_json = True
	# change the name of the output file
	c.Output = TWT_FILE_NAME
	c.Hide_output = TWT_HIDE_OUTPUT
	twint.run.Search(c)

def jobstwo():
	'''Subsequent search.

	Since only a limited number of tweets are returned (seemingly random in number),
	subsequent jobs are required to get the full set of results.
	'''
	#CONCERN: This never stops
	print ("Fetching Subsequent Tweets")
	c = twint.Config()
	# choose username (optional)
	#c.Username = "insert username here"
	# choose search term (optional)
	c.Search = TWT_SEARCH_FOR
	# choose beginning time (narrow results)
	c.Until = str(earliest_tweet_in_file())
	c.Since = TWT_SINCE_RESULT
	# set limit on total tweets
	c.Limit = TWT_LIMIT_RESULT
	# no idea, but makes the csv format properly
	#c.Store_csv = True
	# format of the csv
	#c.Custom = ["date", "time", "username", "tweet", "link", "likes", "retweets", "replies", "mentions", "hashtags"]
	c.Store_json = True
	# change the name of the output file
	c.Output = TWT_FILE_NAME
	c.Hide_output = TWT_HIDE_OUTPUT
	print("---Fetching until: ", c.Until)
	twint.run.Search(c)
	print("---Done.")

def earliest_tweet_in_file():
	'''Find earliest tweet captured in file.
	'''
	#CONCERN: not optimized; hard coded file name and likely other elements; no error catching
	tweetsmetad = []
	earliest_tweet_dt = datetime.now()
	for line in open(TWT_FILE_NAME, 'r', encoding="utf8"): # without this encoding french characters don't show right; 	also causes errors for others
		tweetsmetad.append(json.loads(line))
		if datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')<earliest_tweet_dt:
			earliest_tweet_dt = datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')
	print("...Teets in file before search: ", len(tweetsmetad))
	return(earliest_tweet_dt)

if not os.path.isfile(TWT_FILE_NAME):
	jobsone()

schedule.every(2).minutes.do(jobstwo)
#schedule.every().hour.do(jobstwo)
# schedule.every().day.at("10:30").do(jobstwo)
# schedule.every().monday.do(jobstwo)
# schedule.every().wednesday.at("13:15").do(jobstwo)

while True:
  schedule.run_pending()
  time.sleep(1)
