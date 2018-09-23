from . import format
from .tweet import Tweet
from .user import User
from datetime import datetime
from .storage import db, elasticsearch, write, panda

follow_object = {}

tweets_object = []
user_object = []

_follow_list = []

def clean_follow_list():
    global _follow_list
    _follow_list = []

def datecheck(datestamp, config):
    if config.Since and config.Until:
        d = int(datestamp.replace("-", ""))
        s = int(config.Since.replace("-", ""))
        if d < s:
            return False
    return True

def is_tweet(tw):
    try:
        tw.find("div")["data-item-id"]
        return True
    except:
        return False

def _output(obj, output, config, **extra):
    if config.Lowercase:
        obj.username = obj.username.lower()
        for i in range(len(obj.mentions)):
            obj.mentions[i] = obj.mentions[i].lower()
        for i in range(len(obj.hashtags)):
            obj.hashtags[i] = obj.hashtags[i].lower()
    if config.Output != None:
        if config.Store_csv:
            write.Csv(obj, config)
        elif config.Store_json:
            write.Json(obj, config)
        else:
            write.Text(output, config.Output)

    if config.Pandas and config.User_full:
        panda.update(obj, config)
    if extra.get("follow_list"):
        follow_object.username = config.Username
        follow_object.action = config.Following*"following" + config.Followers*"followers"
        follow_object.users = _follow_list
        panda.update(follow_object, config.Essid)
    if config.Elasticsearch:
        print("", end=".", flush=True)
    else:
        try:
            print(output)
        except UnicodeEncodeError:
            pass

async def Tweets(tw, location, config, conn):
    copyright = tw.find("div", "StreamItemContent--withheld")
    if copyright is None and is_tweet(tw):
        tweet = Tweet(tw, location, config)
        if datecheck(tweet.datestamp, config):
            output = format.Tweet(config, tweet)

            if config.Database:
                db.tweets(conn, tweet, config)

            if config.Elasticsearch:
                elasticsearch.Tweet(tweet, config)

            if config.Store_object:
                tweets_object.append(tweet) #twint.tweet.tweet

            _output(tweet, output, config)

async def Users(u, config, conn):
    global user_object

    user = User(u)
    output = format.User(config.Format, user)

    if config.Database:
        db.user(conn, config.Username, config.Followers, user)

    if config.Elasticsearch:
        _save_date = user.join_date
        _save_time = user.join_time
        user.join_date = str(datetime.strptime(user.join_date, "%d %b %Y")).split()[0]
        user.join_time = str(datetime.strptime(user.join_time, "%I:%M %p")).split()[1]
        elasticsearch.UserProfile(user, config)
        user.join_date = _save_date
        user.join_time = _save_time

    if config.Store_object:
        user_object.append(user) # twint.user.user

    _output(user, output, config)

async def Username(username, config, conn):
    global follow_object
    follow_var = config.Following*"following" + config.Followers*"followers"

    if config.Database:
        db.follow(conn, config.Username, config.Followers, username)

    if config.Elasticsearch:
        elasticsearch.Follow(username, config)

    if config.Store_object or config.Pandas:
        try:
            _ = follow_object[config.Username][follow_var]
        except KeyError:
            follow_object.update({config.Username: {follow_var: []}})
        follow_object[config.Username][follow_var].append(username)
        if config.Pandas_au:
            panda.update(follow_object[config.Username], config)
    _output(username, username, config, follow_list=_follow_list)
