from elasticsearch import Elasticsearch, helpers
import contextlib
import datetime
import time
import sys

class RecycleObject(object):
	def write(self, junk): pass
	def flush(self): pass

@contextlib.contextmanager
def nostdout():
	savestdout = sys.stdout
	sys.stdout = RecycleObject()
	yield
	sys.stdout = savestdout

def weekday(day):
	weekdays = {
			"Monday": 1,
			"Tuesday": 2,
			"Wednesday": 3,
			"Thursday": 4,
			"Friday": 5,
			"Saturday": 6,
			"Sunday": 7,
			}

	return weekdays[day]

def Tweet(Tweet, es, session):
	# Todo play around with this some more
	day = weekday(Tweet.date.strftime("%A"))
	 
	actions = []
	nLikes = 0
	nReplies = 0
	nRetweets = 0
	
	dt = "{} {}".format(Tweet.datestamp, Tweet.timestamp)
	
	j_data = {
			"_index": "twint",
			"_type": "items",
			"_id": Tweet.id + "_raw_" + session,
			"_source": {
				"id": Tweet.id,
				"date": dt,
				"timezone": Tweet.timezone,
				"location": Tweet.location,
				"tweet": Tweet.tweet,
				"hashtags": Tweet.hashtags,
				"user_id": Tweet.user_id,
				"username": Tweet.username,
				"day": day,
				"hour": Tweet.time.strftime("%H"),
				"link": Tweet.link,
				"essid": session
				}
			}

	actions.append(j_data)

	for l in range(int(Tweet.likes)):
		j_data = {
				"_index": "twint",
				"_type": "items",
				"_id": Tweet.id + "_likes_" + str(nLikes) + "_" + session,
				"_source": {
					"id": Tweet.id,
					"date": dt,
					"timezone": Tweet.timezone,
					"location": Tweet.location,
					"tweet": Tweet.tweet,
					"hashtags": Tweet.hashtags,
					"likes": True,
					"user_id": Tweet.user_id,
					"username": Tweet.username,
					"day": day,
					"hour": Tweet.time.strftime("%H"),
					"link": Tweet.link,
					"essid": session
					}
				}

		actions.append(j_data)
		nLikes += 1

	for rep in range(int(Tweet.replies)):
		j_data = {
				"_index": "twint",
				"_type": "items",
				"_id": Tweet.id + "_replies_" + str(nReplies) + "_" + session,
				"_source": {
						"id": Tweet.id,
						"date": dt,
						"timezone": Tweet.timezone,
						"location": Tweet.location,
						"tweet": Tweet.tweet,
						"hashtags": Tweet.hashtags,
						"replies": True,
						"user_id": Tweet.user_id,
						"username": Tweet.username,
						"day": day,
						"hour": Tweet.time.strftime("%H"),
						"link": Tweet.link,
						"essid": session
					}
				}

		actions.append(j_data)
		nReplies += 1

	for ret in range(int(Tweet.retweets)):
		j_data = {
				"_index": "twint",
				"_type": "items",
				"_id": Tweet.id + "_retweets_" + str(nRetweets) + "_" + session,
				"_source": {
					"id": Tweet.id,
					"date": dt,
					"timezone": Tweet.timezone,
					"location": Tweet.location,
					"tweet": Tweet.tweet,
					"hashtags": Tweet.hashtags,
					"retweets": True,
					"user_id": Tweet.user_id,
					"username": Tweet.username,
					"day": day,
					"hour": Tweet.time.strftime("%H"),
					"link": Tweet.link,
					"essid": session
					}
				}

		actions.append(j_data)
		nRetweets += 1

	es = Elasticsearch(es)
	with nostdout():
		helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
	actions = []

def Follow(es, user, follow, session):
	actions = []

	j_data = {
			"_index": "twintgraph2",
			"_type": "items",
			"_id": user + "_" + follow + "_" + session,
			"_source": {
				"user": user,
				"follow": follow,
				"essid": session
			}
	}

	actions.append(j_data)

	es = Elasticsearch(es)
	with nostdout():
		helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
	actions = []