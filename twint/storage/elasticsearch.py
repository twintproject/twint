## TODO - Fix Weekday situation
from elasticsearch import Elasticsearch, helpers
from time import strftime, localtime
import contextlib
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

def hour(datetime):
    return strftime("%H", localtime(datetime))

def Tweet(Tweet, config):
    weekdays = {
            "Monday": 1,
            "Tuesday": 2,
            "Wednesday": 3,
            "Thursday": 4,
            "Friday": 5,
            "Saturday": 6,
            "Sunday": 7,
            }
    day = weekdays[strftime("%A", localtime(Tweet.datetime))]

    actions = []
    nLikes = 0
    nReplies = 0
    nRetweets = 0

    dt = f"{Tweet.datestamp} {Tweet.timestamp}"

    j_data = {
            "_index": config.Index_tweets,
            "_type": "items",
            "_id": Tweet.id + "_raw_" + config.Essid,
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
                "hour": hour(Tweet.datetime),
                "link": Tweet.link,
                "retweet": Tweet.retweet,
                "user_rt": Tweet.user_rt,
                "essid": config.Essid
                }
            }
    actions.append(j_data)

    for l in range(int(Tweet.likes)):
        j_data = {
                "_index": config.Index_tweets,
                "_type": "items",
                "_id": Tweet.id + "_likes_" + str(nLikes) + "_" + config.Essid,
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
                    "hour": hour(Tweet.datetime),
                    "link": Tweet.link,
                    "retweet": Tweet.retweet,
                    "user_rt": Tweet.user_rt,
                    "essid": config.Essid
                    }
                }
        actions.append(j_data)
        nLikes += 1

    for rep in range(int(Tweet.replies)):
        j_data = {
                "_index": config.Index_tweets,
                "_type": "items",
                "_id": Tweet.id + "_replies_" + str(nReplies) + "_" + config.Essid,
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
                    "hour": hour(Tweet.datetime),
                    "link": Tweet.link,
                    "retweet": Tweet.retweet,
                    "user_rt": Tweet.user_rt,
                    "essid": config.Essid
                    }
                }
        actions.append(j_data)
        nReplies += 1

    for ret in range(int(Tweet.retweets)):
        j_data = {
                "_index": config.Index_tweets,
                "_type": "items",
                "_id": Tweet.id + "_retweets_" + str(nRetweets) + "_" + config.Essid,
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
                    "hour": hour(Tweet.datetime),
                    "link": Tweet.link,
                    "retweet": Tweet.retweet,
                    "user_rt": Tweet.user_rt,
                    "essid": config.Essid
                    }
                }
        actions.append(j_data)
        nRetweets += 1

    es = Elasticsearch(config.Elasticsearch)
    with nostdout():
        helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
    actions = []

def Follow(user, config):
    actions = []

    j_data = {
            "_index": config.Index_follow,
            "_type": "items",
            "_id": user + "_" + config.Username + "_" + config.Essid,
            "_source": {
                "user": user,
                "follow": config.Username,
                "essid": config.Essid
                }
            }
    actions.append(j_data)

    es = Elasticsearch(config.Elasticsearch)
    with nostdout():
        helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
    actions = []

def UserProfile(user, config):
    actions = []

    j_data = {
            "_index": config.Index_users,
            "_type": "items",
            "_id": user.id + "_" + user.join_date + "_" + user.join_time + "_" + config.Essid,
            "_source": {
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "bio": user.bio,
                "location": user.location,
                "url": user.url,
                "join_datetime": user.join_date + " " + user.join_time,
                "join_date": user.join_date,
                "join_time": user.join_time,
                "tweets": user.tweets,
                "following": user.following,
                "followers": user.followers,
                "likes": user.likes,
                "media": user.media_count,
                "private": user.is_private,
                "verified": user.is_verified,
                "avatar": user.avatar,
                "session": config.Essid
                }
            }
    actions.append(j_data)

    es = Elasticsearch(config.Elasticsearch)
    with nostdout():
        helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
    actions = []
