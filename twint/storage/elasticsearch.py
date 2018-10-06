## TODO - Fix Weekday situation
from elasticsearch import Elasticsearch, helpers
from time import strftime, localtime
import contextlib
import sys

_index_tweet_status = False
_index_follow_status = False
_index_user_status = False

class RecycleObject(object):
    def write(self, junk): pass
    def flush(self): pass

@contextlib.contextmanager
def nostdout():
    savestdout = sys.stdout
    sys.stdout = RecycleObject()
    yield
    sys.stdout = savestdout

def handleIndexResponse(response):
    try:
        if response["status"] == 400:
            return True
    except KeyError:
        pass
    if response["acknowledged"]:
        print("[+] Index \"" + response["index"] + "\" created!")
    else:
        print("[x] error index creation :: storage.elasticsearch.handleIndexCreation")
    if response["shards_acknowledged"]:
        print("[+] Shards acknowledged, everything is ready to be used!")
        return True
    else:
        print("[x] error with shards :: storage.elasticsearch.HandleIndexCreation")
        return False


def createIndex(config, instance, **scope):
    if scope.get("scope") == "tweet":
        tweets_body = {
                "mappings": {
                    "items": {
                        "properties": {
                            "id": {"type": "long"},
                            "date": {"type": "date", "format": "yyyy-MM-dd HH:mm:ss"},
                            "timezone": {"type": "text"},
                            "location": {"type": "text"},
                            "hashtags": {"type": "text"},
                            "tweet": {"type": "text"},
                            "replies": {"type": "boolean"},
                            "retweets": {"type": "boolean"},
                            "likes": {"type": "boolean"},
                            "user_id": {"type": "keyword"},
                            "username": {"type": "keyword"},
                            "day": {"type": "integer"},
                            "hour": {"type": "integer"},
                            "link": {"type": "text"},
                            "retweet": {"type": "text"},
                            "user_rt": {"type": "text"},
                            "essid": {"type": "keyword"},
                            "nlikes": {"type": "integer"},
                            "nreplies": {"type": "integer"},
                            "nretweets": {"type": "integer"},
                            "search": {"type": "text"}
                            }
                        }
                    },
                    "settings": {
                        "number_of_shards": 1
                    }
                }
        with nostdout():
            resp = instance.indices.create(index=config.Index_tweets, body=tweets_body, ignore=400)
        return handleIndexResponse(resp)
    elif scope.get("scope") == "follow":
        follow_body = {
                "mappings": {
                    "items": {
                        "properties": {
                            "user": {"type": "keyword"},
                            "follow": {"type": "keyword"},
                            "essid": {"type": "keyword"}
                            }
                        }
                    },
                    "settings": {
                        "number_of_shards": 1
                    }
                }
        with nostdout():
            resp = instance.indices.create(index=config.Index_follow, body=follow_body, ignore=400)
        return handleIndexResponse(resp)
    elif scope.get("scope") == "user":
        user_body = {
                "mappings": {
                    "items": {
                        "properties": {
                            "id": {"type": "keyword"},
                            "name": {"type": "keyword"},
                            "username": {"type": "keyword"},
                            "bio": {"type": "text"},
                            "location": {"type": "keyword"},
                            "url": {"type": "text"},
                            "join_datetime": {"type": "date", "format": "yyyy-MM-dd HH:mm:ss"},
                            "join_date": {"type": "date", "format": "yyyy-MM-dd"},
                            "join_time": {"type": "date", "format": "HH:mm:ss"},
                            "tweets": {"type": "integer"},
                            "following": {"type": "integer"},
                            "followers": {"type": "integer"},
                            "likes": {"type": "integer"},
                            "media": {"type": "integer"},
                            "private": {"type": "boolean"},
                            "verified": {"type": "boolean"},
                            "avatar": {"type": "text"},
                            "essid": {"type": "keyword"}
                            }
                        }
                    },
                    "settings": {
                        "number_of_shards": 1
                    }
                }
        with nostdout():
            resp = instance.indices.create(index=config.Index_users, body=user_body, ignore=400)
        return handleIndexResponse(resp)
    else:
        print("[x] error index pre-creation :: storage.elasticsearch.createIndex")
        return False

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
    global _index_tweet_status
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
    nLikes = 1
    nReplies = 1
    nRetweets = 1

    dt = f"{Tweet.datestamp} {Tweet.timestamp}"

    j_data = {
            "_index": config.Index_tweets,
            "_type": config.Index_type,
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
                "essid": config.Essid,
                "nlikes": int(Tweet.likes),
                "nreplies": int(Tweet.replies),
                "nretweets": int(Tweet.retweets),
                "search": str(config.Search)
                }
            }
    actions.append(j_data)

    if config.ES_count["likes"]:
        for l in range(int(Tweet.likes)):
            j_data = {
                "_index": config.Index_tweets,
                "_type": config.Index_type,
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

    if config.ES_count["replies"]:
        for rep in range(int(Tweet.replies)):
            j_data = {
                "_index": config.Index_tweets,
                "_type": config.Index_type,
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

    if config.ES_count["retweets"]:
        for ret in range(int(Tweet.retweets)):
            j_data = {
                "_index": config.Index_tweets,
                "_type": config.Index_type,
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
    if not _index_tweet_status:
        _index_tweet_status = createIndex(config, es, scope="tweet")
    with nostdout():
        helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
    actions = []

def Follow(user, config):
    global _index_follow_status

    actions = []

    j_data = {
            "_index": config.Index_follow,
            "_type": config.Index_type,
            "_id": user + "_" + config.Username + "_" + config.Essid,
            "_source": {
                "user": user,
                "follow": config.Username,
                "essid": config.Essid
                }
            }
    actions.append(j_data)

    es = Elasticsearch(config.Elasticsearch)
    if not _index_follow_status:
        _index_follow_status = createIndex(config, es, scope="follow")
    with nostdout():
        helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
    actions = []

def UserProfile(user, config):
    global _index_user_status
    actions = []

    j_data = {
            "_index": config.Index_users,
            "_type": config.Index_type,
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
    if not _index_user_status:
        _index_user_status = createIndex(config, es, scope="user")
    with nostdout():
        helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
    actions = []
