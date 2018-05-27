from . import db, elasticsearch
from .tweet import Tweet
from .user import User
from bs4 import BeautifulSoup
from time import localtime, strftime
import asyncio
import csv
import datetime
import json
import os
import re
import sys

def write(entry, f):
    print(entry, file=open(f, "a", encoding="utf-8"))

def writeCSV(Tweet, config):
    data = {
            "id": Tweet.id,
            "date": Tweet.datestamp,
            "time": Tweet.timestamp,
            "timezone": Tweet.timezone,
            "user_id": Tweet.user_id,
            "username": Tweet.username,
            "tweet": Tweet.tweet,
            "replies": Tweet.replies,
            "likes": Tweet.likes,
            "location": Tweet.location,
            "hashtags": Tweet.hashtags,
            "link": Tweet.link,
            "retweet": Tweet.is_retweet,
            "user_rt": Tweet.user_rt,
            "mentions": Tweet.mentions,
            }

    if config.Custom_csv:
        fieldnames = config.Custom_csv
        row = {}
        for f in fieldnames:
            row[f] = data[f]
    else:
        fieldnames = [
                "id",
                "date",
                "time",
                "timezone",
                "user_id",
                "username",
                "tweet",
                "replies",
                "retweets",
                "likes",
                "location",
                "hashtags",
                "link",
                "retweet",
                "user_rt",
                "mentions",
                ]
        row = data

    if not (os.path.exists(config.Output)):
        with open(config.Output, "w", newline='', encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
    
    with open(config.Output, "a", newline='', encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writerow(row)

def writeJSON(Tweet, file):
    data = {
            "id": Tweet.id,
            "date": Tweet.datestamp,
            "time": Tweet.timestamp,
            "timezone": Tweet.timezone,
            "user_id": Tweet.user_id,
            "username": Tweet.username,
            "tweet": Tweet.tweet,
            "replies": Tweet.replies,
            "retweets": Tweet.retweets,
            "likes": Tweet.likes,
            "location": Tweet.location,
            "hashtags": ",".join(Tweet.hashtags),
            "link": Tweet.link,
            "retweet": Tweet.is_retweet,
            "user_rt": Tweet.user_rt,
            "mentions": ",".join(Tweet.mentions)
            }

    with open(file, "a", newline='', encoding="utf-8") as json_file:
        json_dump(data, json_file)
        json_file.write("\n")

def getText(tweet):
    text = tweet.find("p", "tweet-text").text
    text = text.replace("\n", "")
    text = text.replace("http", " http")
    text = text.replace("pic.twitter", " pic.twitter")
    return text

def getHashtags(text):
    hashtag = re.findall(r'(?i)\#\w+', text, flags=re.UNICODE)
    return hashtag
    #return ",".join(hashtag)

def getStat(tweet, stat):
    st = "ProfileTweet-action--{} u-hiddenVisually".format(stat)
    return tweet.find("span", st).find("span")["data-tweet-stat-count"]

def getMentions(tweet):
    try:
        return tweet.find("div", "js-original-tweet")["data-mentions"].split(" ")
    except:
        return ""

def textMentions(tweet, mentions, text):
    try:
        for i in range(len(mentions)):
            mention = "@{}".format(mentions[i])
            if mention not in text:
                text = "{} {}".format(mention, text)
    except:
        pass

    return text

def datecheck(datestamp, config):
    if config.Since and config.Until:
        d = int(datestamp.replace("-", ""))
        s = int(config.Since.replace("-", ""))
        if d < s:
            return False
    return True

def retweet(config, tweet):
    if config.Profile and tweet.username.lower() != config.Username:
        return True

def getTweet(tw, location, config):
    t = Tweet()
    
    t.id = tw.find("div")["data-item-id"]
    t.datetime = int(tw.find("span", "_timestamp")["data-time"])
    t.datestamp = strftime("%Y-%m-%d", localtime(t.datetime))
    t.timestamp = strftime("%H:%M:%S", localtime(t.datetime))
    t.user_id = tw.find("a", "account-group js-account-group js-action-profile js-user-profile-link js-nav")["data-user-id"]
    t.username = tw.find("span", "username").text.replace("@", "")
    t.timezone = strftime("%Z", localtime())
    for img in tw.findAll("img", "Emoji Emoji--forText"):
        img.replaceWith("<{}>".format(img['aria-label']))
    t.mentions = getMentions(tw)
    t.tweet = textMentions(tw, t.mentions, getText(tw))
    t.location = location
    t.hashtags = getHashtags(t.tweet)
    t.replies = getStat(tw, "reply")
    t.retweets = getStat(tw, "retweet")
    t.likes = getStat(tw, "favorite")
    t.link = "https://twitter.com/{0.username}/status/{0.id}".format(t)
    
    if retweet(config, t):
        t.is_retweet = True
        t.user_rt = config.Username
    
    return t

async def getUser(user):
    u = User()
    u.name = user.find("a")["name"]
    return u

def getOutput(Tweet, config, conn):
    if config.Users_only:
        output = Tweet.username
    elif config.Tweets_only:
        output = Tweet.tweet
    elif config.Format:
        output = config.Format.replace("{id}", Tweet.id)
        output = output.replace("{date}", Tweet.datestamp)
        output = output.replace("{time}", Tweet.timestamp)
        output = output.replace("{user_id}", Tweet.user_id)
        output = output.replace("{username}", Tweet.username)
        output = output.replace("{timezone}", Tweet.timezone)
        output = output.replace("{tweet}", Tweet.tweet)
        output = output.replace("{location}", Tweet.location)
        output = output.replace("{hashtags}", str(Tweet.hashtags))
        output = output.replace("{replies}", Tweet.replies)
        output = output.replace("{retweets}", Tweet.retweets)
        output = output.replace("{likes}", Tweet.likes)
        output = output.replace("{link}", Tweet.link)
        output = output.replace("{is_retweet}", str(Tweet.is_retweet))
        output = output.replace("{user_rt}", Tweet.user_rt)
        output = output.replace("{mentions}", str(Tweet.mentions))
    else:
        output = "{} {} {} {} ".format(Tweet.id, Tweet.datestamp,
                Tweet.timestamp, Tweet.timezone)

        if retweet(config, Tweet):
            output += "RT "
        
        output += "<{}> {}".format(Tweet.username, Tweet.tweet)

        if config.Show_hashtags:
            output += " {}".format(",".join(Tweet.hashtags))
        if config.Stats:
            output += " | {} replies {} retweets {} likes".format(Tweet.replies,
                    Tweet.retweets, Tweet.likes)
        if config.Location:
            output += " | Location {}".format(Tweet.location)

    return output

def is_tweet(tw):
    try:
        tw.find("div")["data-item-id"]
        return True
    except:
        return False

async def Tweets(tw, location, config, conn):
    copyright = tw.find("div", "StreamItemContent--withheld")
    if copyright is None and is_tweet(tw):
        Tweet = getTweet(tw, location, config)
        if datecheck(Tweet.datestamp, config):
            output = getOutput(Tweet, config, conn)
            
            if config.Database:
                db.tweets(conn, Tweet)
            if config.Elasticsearch:
                elasticsearch.Tweet(Tweet, config.Elasticsearch, config.Essid)

            if config.Output != None:
                if config.Store_csv:
                    writeCSV(Tweet, config)
                elif config.Store_json:
                    writeJSON(Tweet, config.Output)
                else:
                    write(output, config.Output)

            if config.Elasticsearch:
                print(output, end=".", flush=True)
            else:
                print(output)
