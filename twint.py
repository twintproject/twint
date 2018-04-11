#!/usr/bin/python3
'''
Twint.py - Twitter Intelligence (formerly known as Tweep).
Written by Cody Zacharias (@now)

Special thanks to @hpiedcoq & @pielco11 for contributing
several search and storing options.

See wiki on Github for in-depth details.
https://github.com/haccer/twint/wiki

Licensed under MIT License
Copyright (c) 2018 Cody Zacharias
'''
from bs4 import BeautifulSoup
from elasticsearch import Elasticsearch, helpers
from time import gmtime, strftime
import argparse
import aiohttp
import asyncio
import async_timeout
import concurrent.futures
import contextlib
import csv
import datetime
import hashlib
import json
import re
import sys
import sqlite3

user_list = {}

## clean some output
class RecycleObject(object):
    def write(self, junk): pass

@contextlib.contextmanager
def nostdout():
    savestdout = sys.stdout
    sys.stdout = RecycleObject()
    yield
    sys.stdout = savestdout

def initdb(db):
    '''
    Creates a new SQLite database or connects to an existing one.
    '''
    try:
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        table_tweets = """
            CREATE TABLE IF NOT EXISTS
                tweets (
                    id integer primary key,
                    date text not null,
                    time text not null,
                    timezone text not null,
                    user text not null,
                    tweet text not null,
                    replies integer,
                    likes integer,
                    retweets integer,
                    hashtags text
                    );
            """
        cursor.execute(table_tweets)
        table_users = """
            CREATE TABLE IF NOT EXISTS
                users (
                    user text,
                    date_update text not null,
                    num_tweets integer,
                    PRIMARY KEY (user, date_update)
                );
            """
        cursor.execute(table_users)
        table_search = """
            CREATE TABLE IF NOT EXISTS
                searches (
                    user text,
                    date_update text not null,
                    num_tweets integer,
                    search_keyword text,
                    PRIMARY KEY (user, date_update, search_keyword)
                );
            """
        cursor.execute(table_search)
        table_followers = """
            CREATE TABLE IF NOT EXISTS
                followers (
                    user text not null,
                    date_update text not null,
                    follower text not null,
                    PRIMARY KEY (user, follower)
                );
            """
        cursor.execute(table_followers)
        table_following = """
            CREATE TABLE IF NOT EXISTS
                following (
                    user text not null,
                    date_update text not null,
                    follows text not null,
                    PRIMARY KEY (user, follows)
                );
            """
        cursor.execute(table_following)
        return conn
    except Exception as e:
        return str(e)

def getAction():
    if arg.following:
        action = "following"
    elif arg.followers:
        action = "followers"
    elif arg.favorites:
        action = "favorites"
    else:
        action = ""
    
    return action

async def getUrl(init):
    '''
    URL Descision:
    Twint utilizes positions of Tweet's from Twitter's search feature to
    iterate through a user's Twitter feed. This section decides whether
    this is the first URL request or not and forms the URL based on the
    args given.

    Mobile Twitter URLs are used to collect a Twitter user's Followers,
    Followings, and Favorites.

    Returns complete URL.
    '''
    action = getAction()
    if init == -1:
        if action != "":
            url = "https://mobile.twitter.com/{0.u}/{1}?".format(arg, action)
        else:
            url = "https://twitter.com/search?f=tweets&vertical=default&lang=en&q="
    else:
        if action != "":
            if arg.favorites:
                id = "max_id"
            else:
                id = "cursor"
            url = "https://mobile.twitter.com/{0.u}/{1}?{2}={3}".format(arg, action, id, init)
        else:

            url = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
            url+= "&lang=en&include_available_features=1&include_entities=1&reset_"
            url+= "error_state=false&src=typd&max_position={}&q=".format(init)
    
    if action == "":
        if arg.l != None:
            url = url.replace("lang=en", "l={0.l}&lang=en".format(arg))
        if arg.u != None:
            url+= "from%3A{0.u}".format(arg)
        if arg.g != None:
            arg.g = arg.g.replace(" ", "")
            url+= "geocode%3A{0.g}".format(arg)
        if arg.s != None:
            arg.s = arg.s.replace(" ", "%20").replace("#", "%23")
            url+= "%20{0.s}".format(arg)
        if arg.year != None:
            url+= "%20until%3A{0.year}-1-1".format(arg)
        if arg.since != None:
            url+= "%20since%3A{0.since}".format(arg)
        if arg.until != None:
            url+= "%20until%3A{0.until}".format(arg)
        if arg.fruit:
            url+= "%20myspace.com%20OR%20last.fm%20OR"
            url+= "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
            url+= "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
            url+= "%20OR%20keybase"
        if arg.verified:
            url+= "%20filter%3Averified"
        if arg.to:
            url+= "%20to%3A{0.to}".format(arg)
        if arg.all:
            url+= "%20to%3A{0.all}%20OR%20from%3A{0.all}%20OR%20@{0.all}".format(arg)
    
    return url

async def fetch(session, url):
    '''
    Standard aiohttp request with a 30 second timeout.
    '''
    with async_timeout.timeout(30):
        async with session.get(url) as response:
            return await response.text()

def initial(response):
    '''
    Initial response parsing and collecting the position ID
    '''
    soup = BeautifulSoup(response, "html.parser")
    feed = soup.find_all("li", "js-stream-item")
    init = "TWEET-{}-{}".format(feed[-1]["data-item-id"], feed[0]["data-item-id"])
    
    return feed, init

def cont(response):
    '''
    Regular JSON response parsing and collecting position ID
    '''
    json_response = json.loads(response)
    html = json_response["items_html"]
    soup = BeautifulSoup(html, "html.parser")
    feed = soup.find_all("li", "js-stream-item")
    split = json_response["min_position"].split("-")
    split[1] = feed[-1]["data-item-id"]
    
    return feed, "-".join(split)

def follow(response):
    '''
    Response and parsing of a user's followers or following list.
    '''
    soup = BeautifulSoup(response, "html.parser")
    followers = soup.find_all("td", "info fifty screenname")
    cursor = soup.find_all("div", "w-button-more")
    # Try & Except neccessary for collecting the last feed. 
    try:
        cursor = re.findall(r'cursor=(.*?)">', str(cursor))[0]
    except:
        pass

    return followers, cursor

def favorite(response):
    '''
    Response and parsing of a user's favorites/likes list.
    '''
    soup = BeautifulSoup(response, "html.parser")
    tweets = soup.find_all("span", "metadata")
    max_id = soup.find_all("div", "w-button-more")
    # Try & Except neccessary for collecting the last feed.
    try:
        max_id = re.findall(r'max_id=(.*?)">', str(max_id))[0]
    except:
        pass
    return tweets, max_id

async def getfeed(init):
    '''
    The magic user-agent was Lynx (but could be any old one).
    If we want to collect a person's favorites, we're signalling
    that function; if not, we're signalling the follow() function.
    '''
    ua = {'User-Agent': 'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/0.8.12'}
    connect = aiohttp.TCPConnector(verify_ssl=False)
    async with aiohttp.ClientSession(headers=ua, connector=connect) as session:
        response = await fetch(session, await getUrl(init))
    feed = []
    try:
        if arg.favorites:
            feed, init = favorite(response)
        else:
            feed, init = follow(response)
    except:
        pass
    
    return feed, init

async def getFeed(init):
    '''
    Parsing Descision:
    Responses from requests with the position ID's are JSON,
    so this section decides whether this is an initial request
    or not to use the appropriate function for parsing with
    BeautifulSoup4.
    '''
    connect = aiohttp.TCPConnector(verify_ssl=False)
    async with aiohttp.ClientSession(connector=connect) as session:
        response = await fetch(session, await getUrl(init))
    feed = []
    try:
        if init == -1:
            feed, init = initial(response)
        else:
            feed, init = cont(response)
    except:
        # Realize that it's done scraping.
        pass

    return feed, init

async def outTweet(tweet):
    '''
    Parsing Section:
    This function will create the desired output string
    and store it if specified.

    Returns output
    '''
    tweetid = tweet.find("div")["data-item-id"]
    # Formatting the date & time stamps just how I like it.
    datestamp = tweet.find("a", "tweet-timestamp")["title"].rpartition(" - ")[-1]
    d = datetime.datetime.strptime(datestamp, "%d %b %Y")
    date = d.strftime("%Y-%m-%d")
    timestamp = str(datetime.timedelta(seconds=int(tweet.find("span", "_timestamp")["data-time"]))).rpartition(", ")[-1]
    t = datetime.datetime.strptime(timestamp, "%H:%M:%S")
    time = t.strftime("%H:%M:%S")
    # The @ in the username annoys me.
    username = tweet.find("span", "username").text.replace("@", "")
    timezone = strftime("%Z", gmtime())
    # Replace all emoticons with their title, to be included in the Tweet text
    for img in tweet.findAll("img", "Emoji Emoji--forText"):
        img.replaceWith("<{}>".format(img['aria-label']))
    # The context of the Tweet compressed into a single line.
    text = tweet.find("p", "tweet-text").text.replace("\n", "").replace("http", " http").replace("pic.twitter", " pic.twitter")
    # Regex for gathering hashtags
    hashtags = ",".join(re.findall(r'(?i)\#\w+', text, flags=re.UNICODE))
    replies = tweet.find("span", "ProfileTweet-action--reply u-hiddenVisually").find("span")["data-tweet-stat-count"]
    retweets = tweet.find("span", "ProfileTweet-action--retweet u-hiddenVisually").find("span")["data-tweet-stat-count"]
    likes = tweet.find("span", "ProfileTweet-action--favorite u-hiddenVisually").find("span")["data-tweet-stat-count"]
    '''
    This part tries to get a list of mentions.
    It sometimes gets slow with Tweets that contains
    40+ mentioned people.. rather than just appending
    the whole list to the Tweet, it goes through each
    one to make sure there arn't any duplicates.
    '''
    try:
        mentions = tweet.find("div", "js-original-tweet")["data-mentions"].split(" ")
        for i in range(len(mentions)):
            mention = "@{}".format(mentions[i])
            if mention not in text:
                text = "{} {}".format(mention, text)
    except:
        pass
    
    # Preparing storage
    
    if arg.database:
        try:
            cursor = conn.cursor()
            entry = (tweetid, date, time, timezone, username, text, replies, likes, retweets, hashtags,)
            cursor.execute('INSERT INTO tweets VALUES(?,?,?,?,?,?,?,?,?,?)', entry)
            conn.commit()
            if username in list(user_list):
                old_tot = user_list[list(user_list)[list(user_list).index(username)]]
                user_list.update({username: old_tot + 1})
            else:
                user_list.update({username: 1})
        except sqlite3.IntegrityError: # this happens if the tweet is already in the db
            return ""


    if arg.elasticsearch:

        day = d.strftime("%A")
        if day == "Monday":
            _day = 1
        elif day == "Tuesday":
            _day = 2
        elif day == "Wednesday":
            _day = 3
        elif day == "Thursday":
            _day = 4
        elif day == "Friday":
            _day = 5
        elif day == "Saturday":
            _day = 6
        elif day == "Sunday":
            _day = 7
        else:
            print("[x] Something is going wrong!")
            sys.exit(1)

        hashtags = re.findall(r'(?i)\#\w+', text, flags=re.UNICODE)
        actions = []
        nLikes = 0
        nReplies = 0
        nRetweets = 0

        for l in range(int(likes)):
            jObject = {
                "tweetid": tweetid,
                "datestamp": date + " " + time,
                "timezone": timezone,
                "text": text,
                "hashtags": hashtags,
                "likes": True,
                "username": username,
                "day": _day,
                "hour": time.split(":")[0]
                }
            j_data = {
                "_index": "twint",
                "_type": "items",
                "_id": tweetid + "_likes_" + str(nLikes),
                "_source": jObject
            }
            actions.append(j_data)
            nLikes += 1
        for rep in range(int(replies)):
            jObject = {
                "tweetid": tweetid,
                "datestamp": date + " " + time,
                "timezone": timezone,
                "text": text,
                "hashtags": hashtags,
                "replies": True,
                "username": username,
                "day": _day,
                "hour": time.split(":")[0]
                }
            j_data = {
                "_index": "twint",
                "_type": "items",
                "_id": tweetid + "_replies_" + str(nReplies),
                "_source": jObject
            }
            actions.append(j_data)
            nReplies += 1
        for rep in range(int(retweets)):
            jObject = {
                "tweetid": tweetid,
                "datestamp": date + " " + time,
                "timezone": timezone,
                "text": text,
                "hashtags": hashtags,
                "retweets": True,
                "username": username,
                "day": _day,
                "hour": time.split(":")[0]
                }
            j_data = {
                "_index": "twint",
                "_type": "items",
                "_id": tweetid + "_retweets_" + str(nRetweets),
                "_source": jObject
            }
            actions.append(j_data)
            nRetweets += 1

        es = Elasticsearch(arg.elasticsearch)
        with nostdout():
            helpers.bulk(es, actions, chunk_size=2000, request_timeout=200)
        actions = []
        output = ""
    elif arg.users:
        output = username
    elif arg.tweets:
        output = text
    else:
        '''
        The standard output is how I like it, although
        This can be modified to your desire. Uncomment
        the line bellow and add the variables in the
        order/format you want them to look.
        '''
        # output = ""
        output = "{} {} {} {} <{}> {}".format(tweetid, date, time, timezone, username, text)
        if arg.hashtags:
            output+= " {}".format(hashtags)
        if arg.stats:
            output+= " | {} replies {} retweets {} likes".format(replies, retweets, likes)

    # Output section

    if arg.o != None:
        if arg.csv:
            # Write all variables scraped to CSV
            dat = [tweetid, date, time, timezone, username, text, replies, retweets, likes, hashtags]
            with open(arg.o, "a", newline='', encoding="utf-8") as csv_file:
                writer = csv.writer(csv_file, delimiter="|")
                writer.writerow(dat)
        elif arg.json:
            # Write all variables scraped to JSON
            dat = {"id":tweetid, "date":date, "time":time, "timezone":timezone, "username":username, "content":text, "replies":replies, "retweets":retweets, "likes":likes, "hashtags":hashtags}
            with open(arg.o, "a", newline='', encoding="utf-8") as json_file:
                json.dump(dat,json_file)
                json_file.write('\n')
        else:
            # Writes or appends to a file.
            print(output, file=open(arg.o, "a", encoding="utf-8"))

    return output

async def getTweets(init):
    '''
    This function uses the HTML responses from getFeed()
    and sends that info to outTweet() to output it.

    Returns response feed, if it's first-run, and Tweet count.
    '''
    tweets, init = await getFeed(init)
    count = 0
    for tweet in tweets:
        '''
        Certain Tweets get taken down for copyright but are still
        visible in the search. We want to avoid those.
        '''
        copyright = tweet.find("div","StreamItemContent--withheld")
        if copyright is None:
            count +=1
            if arg.elasticsearch:
                print(await outTweet(tweet), end=".", flush=True)
            else:
                print(await outTweet(tweet))

    return tweets, init, count

async def getTweet(url):
    '''
    This function is used in a concurrent loop
    to fetch individual Tweets and send them
    for formatting/parsing, very similar to 
    getTweets().
    '''
    try:
        connect = aiohttp.TCPConnector(verify_ssl=False)
        async with aiohttp.ClientSession(connector=connect) as session:
            response = await fetch(session, url)
        soup = BeautifulSoup(response, "html.parser")
        tweet = soup.find("div", "permalink-inner permalink-tweet-container")
        copyright = tweet.find("div", "StreamItemContent--withheld")
        print(url)
        if copyright is None:
            if arg.elasticsearch:
                print(await outTweet(tweet), end=".", flush=True)
            else:
                print(await outTweet(tweet))
    except:
        pass

async def getFavorites(init):
    '''
    This will get the URL for the Tweet that was
    liked by the user and schedules it to be
    requested. Also similar to getTweets().
    '''
    tweets, init = await getfeed(init)
    count = 0
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            loop = asyncio.get_event_loop()
            futures = []
            for tweet in tweets:
                count += 1
                link = tweet.find("a")["href"]
                url = "https://twitter.com{}".format(link)
                futures.append(loop.run_in_executor(executor, await getTweet(url)))

            await asyncio.gather(*futures)
    except:
        pass

    return tweets, init, count

async def outFollow(f):
    '''
    Will include more data on the user
    upon request.
    '''
    user = f.find("a")["name"]
    
    output = user

    if arg.database:
        try:
            date_time = str(datetime.datetime.now())
            cursor = conn.cursor()
            entry = (arg.u, date_time, user,)
            if arg.followers:
                cursor.execute('INSERT INTO followers VALUES(?,?,?)', entry)
            else:
                cursor.execute('INSERT INTO following VALUES(?,?,?)', entry)
            conn.commit()
        except sqlite3.IntegrityError: # this happens if the entry is already in the db
            pass

    if arg.o != None:
        print(output, file=open(arg.o, "a", encoding="utf-8"))

    return output

async def getFollow(init):
    '''
    For now, just printing the Twitter username
    of a follower/user followed.
    '''
    follow, init = await getfeed(init)
    for f in follow:
        print(await outFollow(f))

    return follow, init

async def getUsername():
    '''
    This function uses a Twitter ID search to resolve a Twitter user
    ID and return it's corresponding username.
    '''
    connect = aiohttp.TCPConnector(verify_ssl=False)
    async with aiohttp.ClientSession(connector=connect) as session:
        r = await fetch(session, "https://twitter.com/intent/user?user_id={0.userid}".format(arg))
    soup = BeautifulSoup(r, "html.parser")
    return soup.find("a", "fn url alternate-context")["href"].replace("/", "")

async def main():
    '''
    Putting it all together.
    '''

    if arg.until:
        _until = datetime.datetime.strptime(arg.until, "%Y-%m-%d").date()
    else:
        _until = datetime.date.today()
    
    if arg.since:
        _since = datetime.datetime.strptime(arg.since, "%Y-%m-%d").date()
    else:
        _since = datetime.datetime.strptime("2006-03-21", "%Y-%m-%d").date() # the 1st tweet

    if arg.elasticsearch:
        print("Indexing to Elasticsearch @ " + str(arg.elasticsearch))

    if arg.database:
        print("Inserting into Database: " + str(arg.database))
        global conn
        conn = initdb(arg.database)
        if isinstance(conn, str):
            print(str)
            sys.exit(1)

    if not arg.timedelta:
        arg.timedelta = 30

    if arg.userid is not None:
        arg.u = await getUsername()

    feed = [-1]
    init = -1
    num = 0
    action = getAction()
    while _since < _until:
        arg.since = str(_until - datetime.timedelta(days=int(arg.timedelta)))
        arg.until = str(_until)
        '''
        If our response from getFeed() has an exception,
        it signifies there are no position IDs to continue
        with, telling Twint it's finished scraping.
        '''
        if len(feed) > 0:
            if action != "":
                if arg.favorites:
                    feed, init, count = await getFavorites(init)
                else:
                    feed, init = await getFollow(init)
            else:
                feed, init, count = await getTweets(init)
                num += count
        else:
            _until = _until - datetime.timedelta(days=int(arg.timedelta))
            feed = [-1]
            break
        # Control when we want to stop scraping.
        if arg.limit is not None and num >= int(arg.limit):
            break

    if arg.database:
        now = str(datetime.datetime.now())
        cursor = conn.cursor()
        if arg.s:
            for user in list(user_list):
                tot = user_list[list(user_list)[list(user_list).index(user)]]
                entry = (user, now, tot, str(arg.s),)
                cursor.execute('INSERT OR REPLACE INTO searches VALUES(?,?,?,?)', entry)
                conn.commit()
        else:
            entry = (str(arg.u), now, num,)
            cursor.execute('INSERT OR REPLACE INTO users VALUES(?,?,?)', entry)
            conn.commit()
        conn.close()

    if arg.count:
        print("Finished: Successfully collected {} Tweets.".format(num))

def Error(error, message):
    # Error formatting
    print("[-] {}: {}".format(error, message))
    sys.exit(0)

def check():
    # Performs main argument checks so nothing unintended happens.
    if arg.u is not None:
        if arg.users:
            Error("Contradicting Args", "Please use --users in combination with -s.")
        if arg.verified:
            Error("Contradicting Args", "Please use --verified in combination with -s.")
        if arg.userid:
            Error("Contradicting Args", "--userid and -u cannot be used together.")
    if arg.tweets and arg.users:
        Error("Contradicting Args", "--users and --tweets cannot be used together.")
    if arg.csv and arg.o is None:
        Error("Error", "Please specify an output file (Example: -o file.csv")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(prog="twint.py", usage="python3 %(prog)s [options]", description="twint.py - An Advanced Twitter Scraping Tool")
    ap.add_argument("-u", help="User's Tweets you want to scrape.")
    ap.add_argument("-s", help="Search for Tweets containing this word or phrase.")
    ap.add_argument("-g", help="Search for geocoded tweets.")
    ap.add_argument("-l", help="Serch for Tweets in a specific language")
    ap.add_argument("-o", help="Save output to a file.")
    ap.add_argument("-es", "--elasticsearch", help="Index to Elasticsearch")
    ap.add_argument("-t", "--timedelta", help="Time intervall for every request")
    ap.add_argument("--year", help="Filter Tweets before specified year.")
    ap.add_argument("--since", help="Filter Tweets sent since date (Example: 2017-12-27).")
    ap.add_argument("--until", help="Filter Tweets sent until date (Example: 2017-12-27).")
    ap.add_argument("--fruit", help="Display 'low-hanging-fruit' Tweets.", action="store_true")
    ap.add_argument("--tweets", help="Display Tweets only.", action="store_true")
    ap.add_argument("--verified", help="Display Tweets only from verified users (Use with -s).", action="store_true")
    ap.add_argument("--users", help="Display users only (Use with -s).", action="store_true")
    ap.add_argument("--csv", help="Write as .csv file.", action="store_true")
    ap.add_argument("--json", help="Write as .json file.", action="store_true")
    ap.add_argument("--hashtags", help="Output hashtags in seperate column.", action="store_true")
    ap.add_argument("--userid", help="Twitter user id")
    ap.add_argument("--limit", help="Number of Tweets to pull (Increments of 20).")
    ap.add_argument("--count", help="Display number Tweets scraped at the end of session.", action="store_true")
    ap.add_argument("--stats", help="Show number of replies, retweets, and likes", action="store_true")
    ap.add_argument("--database", help="Store tweets in the database")
    ap.add_argument("--to", help="Search Tweets to a user")
    ap.add_argument("--all", help="Search all Tweets associated with a user")
    ap.add_argument("--followers", help="Scrape a person's followers", action="store_true")
    ap.add_argument("--following", help="Scrape who a person follows.", action="store_true")
    ap.add_argument("--favorites", help="Scrape Tweets a user has liked.", action="store_true")
    arg = ap.parse_args()

    check()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
