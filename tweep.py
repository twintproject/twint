#!/usr/bin/python3
from bs4 import BeautifulSoup
from time import gmtime, strftime
import argparse
import aiohttp
import asyncio
import async_timeout
import csv
import datetime
import json
import re
import sys

async def getUrl(init):
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
    with async_timeout.timeout(30):
        async with session.get(url) as response:
            return await response.text()

async def getFeed(init):
    async with aiohttp.ClientSession() as session:
        r = await fetch(session, await getUrl(init))
    feed = []
    try:
        if init == -1:
            html = r
        else:
            json_response = json.loads(r)
            html = json_response["items_html"]
        soup = BeautifulSoup(html, "html.parser")
        feed = soup.find_all("li", "js-stream-item")
        if init == -1:
            init = "TWEET-{}-{}".format(feed[-1]["data-item-id"], feed[0]["data-item-id"])
        else:
            split = json_response["min_position"].split("-")
            split[1] = feed[-1]["data-item-id"]
            init = "-".join(split)
    except:
        pass

    return feed, init

async def getPic(url):
    async with aiohttp.ClientSession() as session:
        r = await fetch(session, url)
    soup = BeautifulSoup(r, "html.parser")
    picture = soup.find("div", "AdaptiveMedia-photoContainer js-adaptive-photo ")
    if picture is not None:
        return picture["data-image-url"].replace(" ", "")

async def getTweets(init):
    tweets, init = await getFeed(init)
    count = 0
    for tweet in tweets:
        tweetid = tweet["data-item-id"]
        datestamp = tweet.find("a", "tweet-timestamp")["title"].rpartition(" - ")[-1]
        d = datetime.datetime.strptime(datestamp, "%d %b %Y")
        date = d.strftime("%Y-%m-%d")
        timestamp = str(datetime.timedelta(seconds=int(tweet.find("span", "_timestamp")["data-time"]))).rpartition(", ")[-1]
        t = datetime.datetime.strptime(timestamp, "%H:%M:%S")
        time = t.strftime("%H:%M:%S")
        username = tweet.find("span", "username").text.replace("@", "")
        timezone = strftime("%Z", gmtime())
        text = tweet.find("p", "tweet-text").text.replace("\n", " ").replace("http"," http").replace("pic.twitter"," pic.twitter")
        hashtags = ",".join(re.findall(r'(?i)\#\w+', text, flags=re.UNICODE))
        replies = tweet.find("span", "ProfileTweet-action--reply u-hiddenVisually").find("span")["data-tweet-stat-count"]
        retweets = tweet.find("span", "ProfileTweet-action--retweet u-hiddenVisually").find("span")["data-tweet-stat-count"]
        likes = tweet.find("span", "ProfileTweet-action--favorite u-hiddenVisually").find("span")["data-tweet-stat-count"]
        if arg.rawpic and "pic.twitter.com" in text:
            try:
                picture = await getPic("https://twitter.com/{0}/status/{1}/photo/1".format(username, tweetid))
                if picture is not None:
                    pic = re.findall(r"pic.twitter.com/\w+", text)[-1]
                    text = text.replace(pic, picture)
            except:
                pass
        try:
            mentions = tweet.find("div", "js-original-tweet")["data-mentions"].split(" ")
            for i in range(len(mentions)):
                mention = "@{}".format(mentions[i])
                if mention not in text:
                    text = "{} {}".format(mention, text)
        except:
            pass

        if arg.users:
            output = username
        elif arg.tweets:
            output = tweets
        else:
            output = "{} {} {} {} <{}> {}".format(tweetid, date, time, timezone, username, text)
            if arg.hashtags:
                output+= " {}".format(hashtags)
            if arg.stats:
                output+= " | {} replies {} retweets {} likes".format(replies, retweets, likes)

        if arg.o != None:
            if arg.csv:
                dat = [tweetid, date, time, timezone, username, text, hashtags, replies, retweets, likes]
                with open(arg.o, "a", newline='') as csv_file:
                    writer = csv.writer(csv_file, delimiter="|")
                    writer.writerow(dat)
            else:
                print(output, file=open(arg.o, "a"))

        count += 1
        print(output)

    return tweets, init, count

async def getUsername():
    async with aiohttp.ClientSession() as session:
        r = await fetch(session, "https://twitter.com/intent/user?user_id={0.userid}".format(arg))
    soup = BeautifulSoup(r, "html.parser")
    return soup.find("a", "fn url alternate-context")["href"].replace("/", "")

async def main():
    if arg.userid is not None:
        arg.u = await getUsername()

    feed = [-1]
    init = -1
    num = 0
    while True:
        if len(feed) > 0:
            feed, init, count = await getTweets(init)
            num += count
        else:
            break
        if arg.limit is not None and num <= int(arg.limit):
            break
    if arg.count:
        print("Finished: Successfully collected {} Tweets.".format(num))


def Error(error, message):
    print("[-] {}: {}".format(error, message))
    sys.exit(0)

def check():
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
    if arg.u is None and arg.s is None and arg.userid is None:
        Error("Error", "Please specify a username, user id or search.")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(prog="tweep.py", usage="python3 %(prog)s [options]", description="tweep.py - An Advanced Twitter Scraping Tool")
    ap.add_argument("-u", help="User's Tweets you want to scrape.")
    ap.add_argument("-s", help="Search for Tweets containing this word or phrase.")
    ap.add_argument("-o", help="Save output to a file.")
    ap.add_argument("-g", help="Search for geocoded tweets.")
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
    ap.add_argument("--rawpic", help="Display raw picture URL (Slow).", action="store_true")
    arg = ap.parse_args()

    check()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
