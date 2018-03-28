#!/usr/bin/python3
from bs4 import BeautifulSoup
from elasticsearch import Elasticsearch
from time import gmtime, strftime
import argparse
import aiohttp
import asyncio
import async_timeout
import csv
import datetime
import hashlib
import json
import re
import sys

async def getUrl(init):
    '''
    URL Descision:
    Tweep utilizes positions of Tweet's from Twitter's search feature to
    iterate through a user's Twitter feed. This section decides whether
    this is the first URL request or not and develops the URL based on the
    args given.

    Returns complete URL.
    '''
    if init == -1:
        url = "https://twitter.com/search?f=tweets&vertical=default&lang=en&q="
    else:
        url = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
        url+= "&lang=en&include_available_features=1&include_entities=1&reset_"
        url+= "error_state=false&src=typd&max_position={}&q=".format(init)

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
    if arg.fruit:
        url+= "%20myspace.com%20OR%20last.fm%20OR"
        url+= "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
        url+= "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
        url+= "%20OR%20keybase"
    if arg.verified:
        url+= "%20filter%3Averified"

    return url

async def fetch(session, url):
    '''
    Basic aiohttp request with a 30 second timeout.
    '''
    with async_timeout.timeout(30):
        async with session.get(url) as response:
            return await response.text()

async def initial(response):
    '''
    Initial response parsing and collecting the position ID
    '''
    soup = BeautifulSoup(response, "html.parser")
    feed = soup.find_all("li", "js-stream-item")
    init = "TWEET-{}-{}".format(feed[-1]["data-item-id"], feed[0]["data-item-id"])

    return feed, init

async def cont(response):
    '''
    Regular json response parsing and collecting Position ID
    '''
    json_response = json.loads(response)
    html = json_response["items_html"]
    soup = BeautifulSoup(html, "html.parser")
    feed = soup.find_all("li", "js-stream-item")
    split = json_response["min_position"].split("-")
    split[1] = feed[-1]["data-item-id"]
    init = "-".join(split)

    return feed, init

async def getFeed(init):
    '''
    Parsing Descision:
    Responses from requests with the position id's are JSON,
    so this section decides whether this is an initial request
    or not to use the approriate response reading for parsing
    with BeautifulSoup4.

    Returns html for Tweets and position id.
    '''
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(verify_ssl=False)) as session:
        response = await fetch(session, await getUrl(init))
    feed = []
    try:
        if init == -1:
            feed, init = await initial(response)
        else:
            feed, init = await cont(response)
    except:
        # Tweep will realize that it's done scraping.
        pass

    return feed, init

async def outTweet(tweet):
    '''
    Parsing Section:
    This function will create the desired output string and
    write it to a file or csv if specified.

    Returns output.
    '''
    tweetid = tweet["data-item-id"]
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
    # Replace all emoticons with their title, to be included in the tweet text
    for img in tweet.findAll("img", "Emoji Emoji--forText"):
        img.replaceWith("<%s>" % img['aria-label'])
    # The context of the Tweet compressed into a single line.
    text = tweet.find("p", "tweet-text").text.replace("\n", "").replace("http", " http").replace("pic.twitter", " pic.twitter")
    # Regex for gathering hashtags
    hashtags = ",".join(re.findall(r'(?i)\#\w+', text, flags=re.UNICODE))
    replies = tweet.find("span", "ProfileTweet-action--reply u-hiddenVisually").find("span")["data-tweet-stat-count"]
    retweets = tweet.find("span", "ProfileTweet-action--retweet u-hiddenVisually").find("span")["data-tweet-stat-count"]
    likes = tweet.find("span", "ProfileTweet-action--favorite u-hiddenVisually").find("span")["data-tweet-stat-count"]
    '''
    This part tries to get a list of mentions.
    It sometimes gets slow with Tweets that contain
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
    
    # Preparing to output

    '''
    There were certain cases where I used Tweep
    to gather a list of users and then fed that
    generated list into Tweep. That's why these
    modes exist.
    '''
    if arg.elasticsearch:
        jObject = {
            "tweetid": tweetid,
            "datestamp": date + " " + time,
            "timezone": timezone,
            "text": text,
            "hashtags": re.findall(r'(?i)\#\w+', text, flags=re.UNICODE),
            "replies": replies,
            "retweets": retweets,
            "likes": likes,
            "username": username
        }
        
        es = Elasticsearch(arg.elasticsearch)
        es.index(index="tweep", doc_type="items", id=tweetid, body=json.dumps(jObject))
        output = ""
    elif arg.users:
        output = username
    elif arg.tweets:
        output = text
    else:
        '''
        The standard output is how I like it, although
        this can be modified to your desire. Uncomment
        the bottom line and add in the variables in the
        order you want them or how you want it to look.
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
        else:
            # Writes or appends to a file.
            print(output, file=open(arg.o, "a"))

    return output

async def getTweets(init):
    '''
    This function uses the html responses from getFeed()
    and sends that info to the Tweet parser outTweet() and
    outputs it.

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
                print(await outTweet(tweet),end=".", flush=True)
            else:
                print(await outTweet(tweet))

    return tweets, init, count

async def getUsername():
    '''
    This function uses a Twitter ID search to resolve a Twitter User
    ID and return it's corresponding username.
    '''
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(verify_ssl=False)) as session:
        r = await fetch(session, "https://twitter.com/intent/user?user_id={0.userid}".format(arg))
    soup = BeautifulSoup(r, "html.parser")
    return soup.find("a", "fn url alternate-context")["href"].replace("/", "")

async def main():
    '''
    Putting it all together.
    '''

    if arg.elasticsearch:
        print("Indexing to Elasticsearch @" + str(arg.elasticsearch))

    if arg.userid is not None:
        arg.u = await getUsername()

    feed = [-1]
    init = -1
    num = 0
    while True:
        '''
        If our response from getFeed() has an exception,
        it signifies there are no position IDs to continue
        with, telling Tweep it's finished scraping.
        '''
        if len(feed) > 0:
            feed, init, count = await getTweets(init)
            num += count
        else:
            break
        # Control when we want to stop scraping.
        if arg.limit is not None and num <= int(arg.limit):
            break
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
    ap = argparse.ArgumentParser(prog="tweep.py", usage="python3 %(prog)s [options]", description="tweep.py - An Advanced Twitter Scraping Tool")
    ap.add_argument("-u", help="User's Tweets you want to scrape.")
    ap.add_argument("-s", help="Search for Tweets containing this word or phrase.")
    ap.add_argument("-g", help="Search for geocoded tweets.")
    ap.add_argument("-o", help="Save output to a file.")
    ap.add_argument("-es", "--elasticsearch", help="Index to Elasticsearch")
    ap.add_argument("--year", help="Filter Tweets before specified year.")
    ap.add_argument("--since", help="Filter Tweets sent since date (Example: 2017-12-27).")
    ap.add_argument("--fruit", help="Display 'low-hanging-fruit' Tweets.", action="store_true")
    ap.add_argument("--tweets", help="Display Tweets only.", action="store_true")
    ap.add_argument("--verified", help="Display Tweets only from verified users (Use with -s).", action="store_true")
    ap.add_argument("--users", help="Display users only (Use with -s).", action="store_true")
    ap.add_argument("--csv", help="Write as .csv file.", action="store_true")
    ap.add_argument("--hashtags", help="Output hashtags in seperate column.", action="store_true")
    ap.add_argument("--userid", help="Twitter user id")
    ap.add_argument("--limit", help="Number of Tweets to pull (Increments of 20).")
    ap.add_argument("--count", help="Display number Tweets scraped at the end of session.", action="store_true")
    ap.add_argument("--stats", help="Show number of replies, retweets, and likes", action="store_true")
    arg = ap.parse_args()

    check()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
