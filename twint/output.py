from . import db, elasticsearch, format, write
from .tweet import Tweet
from .user import User

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

def _output(obj, output, config):
    if config.Output != None:
        if config.Store_csv:
            write.Csv(obj, config)
        elif config.Store_json:
            write.Json(obj, config)
        else:
            write.Text(output, config.Output)

    if config.Elasticsearch:
        print(output, end=".", flush=True)
    else:
        print(output)

async def Tweets(tw, location, config, conn):
    copyright = tw.find("div", "StreamItemContent--withheld")
    if copyright is None and is_tweet(tw):
        tweet = Tweet(tw, location, config)
        if datecheck(tweet.datestamp, config):
            output = format.Tweet(config, tweet)
            
            if config.Database:
                db.tweets(conn, tweet)
            if config.Elasticsearch:
                elasticsearch.Tweet(tweet, config.Elasticsearch, config.Essid)
            
            _output(tweet, output, config)

async def Users(u, config, conn):
    user = User(u)
    output = format.User(config.Format, user)

    if config.Database:
        db.user(conn, config.Username, config.Followers, user)

    #if config.Elasticsearch:
    #    elasticsearch.Follow(config.Elasticsearch, user,
    #            config.Username, config.Essid)

    _output(user, output, config)

async def Username(username, config, conn):
    if config.Database:
        db.follow(conn, config.Username, config.Followers, username)

    if config.Elasticsearch:
        elasticsearch.Follow(config.Elasticsearch, username,
                config.Username, config.Essid)

    _output(username, username, config)
