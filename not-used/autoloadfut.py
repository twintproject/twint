import twint
import schedule
import time
import json
from datetime import datetime
import os

TWT_FILE_NAME = 'cibc.json'
TWT_LIMIT_RESULT = 5000
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

'''
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
'''

#####################################
def jobsthree(filename_str, search_str):
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
	c.Search = search_str
	# choose beginning time (narrow results)
	#c.Until = str(earliest_tweet_in_file())
	c.Since = str(latest_tweet_in_file(filename_str))
	# set limit on total tweets
	c.Limit = TWT_LIMIT_RESULT
	# no idea, but makes the csv format properly
	#c.Store_csv = True
	# format of the csv
	#c.Custom = ["date", "time", "username", "tweet", "link", "likes", "retweets", "replies", "mentions", "hashtags"]
	c.Store_json = True
	# change the name of the output file
	c.Output = filename_str
	c.Hide_output = TWT_HIDE_OUTPUT
	print("---", search_str)
	print("---Fetching from: ", c.Since)
	twint.run.Search(c)
	print("---Done.")

def jobsfour():
	'''Appends recent tweets to existing file

	Quick shortcut code. Many short comings, incl:
	- exits with error when file does not exist
	- no guarantee that there will be no gaps between existing tweets in file and new tweets
	(as twint seems to return an arbitrary number of tweets, with most recent first; though
	I am not  sure this will even be consistent.)
	'''
	jobsthree('cibc.json', '@cibc')
	jobsthree('bmo.json', '@BMO')
	jobsthree('national.json', '@nationalbank')
	jobsthree('rbc.json', '@RBC')
	jobsthree('td.json', '@TD_Canada')
	jobsthree('scotia.json', '@scotiabank')

	print("Going to sleep")

	
def latest_tweet_in_file(filename_str):
	'''Find earliest tweet captured in file.
	'''
	#CONCERN: not optimized; hard coded file name and likely other elements; no error catching
	tweetsmetad = []
	#latest_tweet_dt = datetime.now()
	print("---Starting ", filename_str)
	latest_tweet_dt = datetime(1990, 5, 17) # arbitraty, but Twitter did not exist at this date
	for line in open(filename_str, 'r', encoding="utf8"): # without this encoding french characters don't show right; 	also causes errors for others
		tweetsmetad.append(json.loads(line))
		if datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')>latest_tweet_dt:
			latest_tweet_dt = datetime.strptime(tweetsmetad[-1]['created_at'], '%Y-%m-%d %H:%M:%S %Z')
	print("...Teets in file before search: ", len(tweetsmetad))
	return(latest_tweet_dt)

#schedule.every(1).minutes.do(jobsfour)
schedule.every(1).hour.do(jobsfour)
# schedule.every().day.at("10:30").do(jobstwo)
# schedule.every().monday.do(jobstwo)
# schedule.every().wednesday.at("13:15").do(jobstwo)

while True:
  schedule.run_pending()
  time.sleep(1)
