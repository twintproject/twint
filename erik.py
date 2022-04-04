'''
Play area:
- Create list fo files
'''

from datetime import datetime, timedelta, timezone

earliest_tweet_dt = datetime.now(timezone.utc)

print(earliest_tweet_dt)

def erik():
    return 1, 2

result, _ = erik()

print(result)


import twint

def testread():
    search_str = "transat"

    c = twint.Config()
	# choose username (optional)
	#c.Username = "insert username here"
	# choose search term (optional)
    c.Search = search_str
	# choose beginning time (narrow results)
	#c.Until = str(earliest_tweet_in_file())
    ##c.Since = str(latest_tweet_in_file(filename_str))
    # set limit on total tweets
    c.Limit = 2
	# no idea, but makes the csv format properly
	#c.Store_csv = True
	# format of the csv
	#c.Custom = ["date", "time", "username", "tweet", "link", "likes", "retweets", "replies", "mentions", "hashtags"]
    c.Store_json = True
	# change the name of the output file
	##c.Output = filename_str
	#c.Hide_output = True
    c.Hide_output = False
    x = twint.run.Search(c)
    
    return(x)

print(testread())

"""I cannot figure out how to get the output just in JSON.
So save in file first; then 
"""

import main 
print(main.gcp_TestConfig())

