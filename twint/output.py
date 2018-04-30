from .tweet import Tweet
from .profile import User
from . import db, elasticsearch
from time import gmtime, strftime
from bs4 import BeautifulSoup
import asyncio
import csv
import datetime
import json
import re
import sys
import time

def write(entry, f):
	print(entry, file=open(f, "a", encoding="utf-8"))

def writeCSV(Tweet, file):
	data = [
			Tweet.id,
			Tweet.datestamp,
			Tweet.timestamp,
			Tweet.timezone,
			Tweet.user_id,
			Tweet.username,
			Tweet.tweet,
			Tweet.replies,
			Tweet.retweets,
			Tweet.likes,
			Tweet.location,
			",".join(Tweet.hashtags),
			Tweet.link]
	with open(file, "a", newline='', encoding="utf-8") as csv_file:
		writer = csv.writer(csv_file, quoting=csv.QUOTE_ALL, delimiter=",")
		writer.writerow(data)

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
			"link": Tweet.link}
	with open(file, "a", newline='', encoding="utf-8") as json_file:
		json.dump(data, json_file)
		json_file.write("\n")

def getDate(tweet):
	datestamp = tweet.find("a", "tweet-timestamp")["title"]
	datestamp = datestamp.rpartition(" - ")[-1]
	return datetime.datetime.strptime(datestamp, "%d %b %Y")

def getTime(tweet):
	tm = int(tweet.find("span", "_timestamp")["data-time"])
	timestamp = str(datetime.timedelta(seconds=tm))
	timestamp = timestamp.rpartition(", ")[-1]
	return datetime.datetime.strptime(timestamp, "%H:%M:%S")

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

def getMentions(tweet, text):
	try:
		mentions = tweet.find("div", "js-original-tweet")["data-mentions"].split(" ")
		for i in range(len(mentions)):
			mention = "@{}".format(mentions[i])
			if mention not in text:
				text = "{} {}".format(mention, text)
	except:
		pass
	return text

# Sort HTML
def getTweet(tw, location, config):
	t = Tweet()
	t.id = tw.find("div")["data-item-id"]
	t.date = getDate(tw)
	if config.Since and config.Until:
		if (t.date.date() - datetime.datetime.strptime(config.Since, "%Y-%m-%d").date()).days == -1:
			# mitigation here, maybe find something better
			sys.exit(0)
	t.datestamp = t.date.strftime("%Y-%m-%d")
	t.time = getTime(tw)
	t.timestamp = t.time.strftime("%H:%M:%S")
	t.user_id = tw.find("a", "account-group js-account-group js-action-profile js-user-profile-link js-nav")["data-user-id"]
	t.username = tw.find("span", "username").text.replace("@", "")
	t.timezone = strftime("%Z", gmtime())
	for img in tw.findAll("img", "Emoji Emoji--forText"):
		img.replaceWith("<{}>".format(img['aria-label']))
	t.tweet = getMentions(tw, getText(tw))
	t.location = location
	t.hashtags = getHashtags(t.tweet)
	t.replies = getStat(tw, "reply")
	t.retweets = getStat(tw, "retweet")
	t.likes = getStat(tw, "favorite")
	t.link = "https://twitter.com/{0.username}/status/{0.id}/".format(t)
	return t

async def getUser(user):
	u = User()
	u.name = user.find("a")["name"]
	return u

async def Tweets(tw, location, config, conn):
	copyright = tw.find("div", "StreamItemContent--withheld")
	if copyright is None:
		Tweet = getTweet(tw, location, config)

		if config.Database:
			db.tweets(conn, Tweet)
		if config.Elasticsearch:
			elasticsearch.Elastic(Tweet, config)
		
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
		else:
			output = "{} {} {} {} <{}> {}".format(Tweet.id, Tweet.datestamp, Tweet.timestamp, Tweet.timezone, Tweet.username, Tweet.tweet)
			if config.Show_hashtags:
				output+= " {}".format(",".join(Tweet.hashtags))
			if config.Stats:
				output+= " | {} replies {} retweets {} likes".format(Tweet.replies, Tweet.retweets, Tweet.likes)
			if config.Location:
				output+= " | Location {}".format(Tweet.location)

		if config.Output != None:
			if config.Store_csv:
				writeCSV(Tweet, config.Output)
			elif config.Store_json:
				writeJSON(Tweet, config.Output)
			else:
				write(output, config.Output)
		
		# Print output
		if config.Elasticsearch:
			print(output, end=".", flush=True)
		else:
			print(output)
