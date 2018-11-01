from . import format, get
from .tweet import Tweet
from .user import User
from datetime import datetime
from .storage import db, elasticsearch, write, panda

#import logging

_duplicate_dict = {}
follow_object = {}

tweets_object = []
user_object = []

_follow_list = []

def clean_follow_list():
    #logging.info("[<] " + str(datetime.now()) + ':: output+clean_follow_list')
    global _follow_list
    _follow_list = []

def datecheck(datestamp, config):
    #logging.info("[<] " + str(datetime.now()) + ':: output+datecheck')
    if config.Since and config.Until:
        d = int(datestamp.replace("-", ""))
        s = int(config.Since.replace("-", ""))
        if d < s:
            return False
    return True

def is_tweet(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: output+is_tweet')
    try:
        tw["data-item-id"]
        return True
    except:
        return False

def _output(obj, output, config, **extra):
    #logging.info("[<] " + str(datetime.now()) + ':: output+_output')
    if config.Lowercase:
        if isinstance(obj, str):
            obj = obj.lower()
        elif str(type(obj)) == "<class 'twint.user.user'>":
            pass
        else:
            obj.username = obj.username.lower()
            for i in range(len(obj.mentions)):
                obj.mentions[i] = obj.mentions[i]["screen_name"].lower()
            for i in range(len(obj.hashtags)):
                obj.hashtags[i] = obj.hashtags[i].lower()
    if config.Output != None:
        if config.Store_csv:
            try :
                write.Csv(obj, config)
            except Exception as e:
                print(str(e) + " [x] output._output")
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
        if config.Store_object:
            tweets_object.append(obj)
        else:
            if not config.Hide_output:
                try:
                    print(output)
                except UnicodeEncodeError:
                    print("unicode error [x] output._output")

async def checkData(tweet, location, config, conn):
    usernames = []
    user_ids = set()
    global _duplicate_dict
    copyright = tweet.find("div", "StreamItemContent--withheld")
    if copyright is None and is_tweet(tweet):
        tweet = Tweet(tweet, location, config)

    if config.Database is not None and config.User_info:
        for user in tweet.mentions:
            if db.get_user_id(conn, user["id"]) == -1 and user["id"] not in user_ids:
                user_ids.add(user["id"])
                usernames.append(user["screen_name"])
        for user in tweet.tags:
            if db.get_user_id(conn, user["id"]) == -1 and user["id"] not in user_ids:
                user_ids.add(user["id"])
                usernames.append(user["screen_name"])
        for user in tweet.replies:
            if db.get_user_id(conn, user["id"]) == -1 and user["id"] not in user_ids:
                user_ids.add(user["id"])
                usernames.append(user["screen_name"])

    if config.Database is not None and config.User_info:
        for user in usernames:
            url = f"http://twitter.com/{user}?lang=en"
            await get.User(url, config, conn)

    if config.User_info:
        for user in tweet.mentions:
            try:
                _duplicate_dict[user["screen_name"]]
            except KeyError:
                _duplicate_dict[user["screen_name"]] = True
                _user = user["screen_name"]
                url = f"http://twitter.com/{_user}?lang=en"
                await get.User(url, config, conn)
        for user in tweet.tags:
            try:
                _duplicate_dict[user["screen_name"]]
            except KeyError:
                _duplicate_dict[user["screen_name"]] = True
                _user = user["screen_name"]
                url = f"http://twitter.com/{_user}?lang=en"
                await get.User(url, config, conn)
        for user in tweet.replies:
            try:
                _duplicate_dict[user["screen_name"]]
            except KeyError:
                _duplicate_dict[user["screen_name"]] = True
                _user = user["screen_name"]
                url = f"http://twitter.com/{_user}?lang=en"
                await get.User(url, config, conn)

    if datecheck(tweet.datestamp, config):
        output = format.Tweet(config, tweet)

        if config.Database:
            db.tweets(conn, tweet, config)

        if config.Pandas:
            panda.update(tweet, config)

        if config.Elasticsearch:
            elasticsearch.Tweet(tweet, config)

        if config.Store_object:
            tweets_object.append(tweet) #twint.tweet.tweet

        _output(tweet, output, config)

async def Tweets(tweets, location, config, conn, url=''):
    if (config.Profile_full or config.Location) and config.Get_replies:
        for tw in tweets:
            await checkData(tw, location, config, conn)
    elif config.Favorites or config.Profile_full or config.Location:
        for tw in tweets:
            if tw['data-item-id'] == url.split('?')[0].split('/')[-1]:
                await checkData(tw, location, config, conn)
    elif config.TwitterSearch:
            await checkData(tweets, location, config, conn)
    else:
        if int(tweets["data-user-id"]) == config.User_id:
            await checkData(tweets, location, config, conn)

async def Users(u, config, conn):
    #logging.info("[<] " + str(datetime.now()) + ':: output+Users')
    global user_object

    user = User(u)
    output = format.User(config.Format, user)

    if config.Database:
        db.user(conn, config, user)

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
    #logging.info("[<] " + str(datetime.now()) + ':: output+Username')
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
