#!/usr/bin/python3
from bs4 import BeautifulSoup
from time import gmtime, strftime
import argparse
import aiohttp
import asyncio
import async_timeout
import datetime
import json
import sys

async def getUrl(Min):
	if Min == -1:
		url = "https://twitter.com/search?f=tweets&vertical=default&lang=en&q="
	else:
		url = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
		url+= "&lang=en&include_available_features=1&include_entities=1&reset_"
		url+= "error_state=false&src=typd&max_position={}&q=".format(Min)

	if arg.u != None:
		url+= "from%3A{0.u}".format(arg)
	if arg.s != None:
		arg.s = arg.s.replace(" ", "%20").replace("#", "%23")
		url+= "%20{0.s}".format(arg)
	if arg.year != None:
		url+= "%20until%3A{0.year}-1-1".format(arg)
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

async def getFeed(Min):
	async with aiohttp.ClientSession() as session:
		r = await fetch(session, await getUrl(Min))
	feed = []
	try:
		if Min == -1:
			html = r
		else:
			json_response = json.loads(r)
			html = json_response["items_html"]
		soup = BeautifulSoup(html, "html.parser")
		feed = soup.find_all("li", "js-stream-item")
		if Min == -1:
			Min = "TWEET-{}-{}".format(feed[-1]["data-item-id"], feed[0]["data-item-id"])
		else:
			minsplit = json_response["min_position"].split("-")
			minsplit[1] = feed[-1]["data-item-id"]
			Min = "-".join(minsplit)
	except:
		pass

	return feed, Min

async def getTweets(Min):
	feed, Min = await getFeed(Min)
	for tweet in feed:
		tweetid = tweet["data-item-id"]
		datestamp = tweet.find("a", "tweet-timestamp")["title"].rpartition(" - ")[-1]
		d = datetime.datetime.strptime(datestamp, "%d %b %Y")
		date = d.strftime("%Y-%m-%d")
		timestamp = str(datetime.timedelta(seconds=int(tweet.find("span", "_timestamp")["data-time"]))).rpartition(", ")[-1]
		t = datetime.datetime.strptime(timestamp, "%H:%M:%S")
		time = t.strftime("%H:%M:%S")
		username = tweet.find("span", "username").text.replace("@", "")
		timezone = strftime("%Z", gmtime())
		text = tweet.find("p", "tweet-text").text.replace("\n", " ")
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

		if arg.o != None:
			print(output, file=open(arg.o, "a"))

		print(output)

	return feed, Min

async def main():
	feed = [-1]
	Min = -1
	while True:
		if len(feed) > 0:
			feed, Min = await getTweets(Min)
		else:
			break

if __name__ == "__main__":
	ap = argparse.ArgumentParser(prog="tweep.py", usage="python3 %(prog)s [options]", description="tweep.py - An Advanced Twitter Scraping Tool")
	ap.add_argument("-u", help="User's tweets you want to scrape.")
	ap.add_argument("-s", help="Search for tweets containing this word or phrase.")
	ap.add_argument("-o", help="Save output to a file.")
	ap.add_argument("--year", help="Filter tweets before specified year.")
	ap.add_argument("--fruit", help="Display 'low-hanging-fruit' tweets.", action="store_true")
	ap.add_argument("--tweets", help="Display tweets only.", action="store_true")
	ap.add_argument("--verified", help="Display Tweets only from verified users (Use with -s).", action="store_true")
	ap.add_argument("--users", help="Display users only (Use with -s).", action="store_true")
	arg = ap.parse_args()

	if arg.u is not None:
		if arg.users:
			print("[-] Contradicting Args: Please use --users in combination with -s.")
			sys.exit(0)
		if arg.verified:
			print("[-] Contradicting Args: Please use --verified in combination with -s.")
	if arg.tweets and arg.users:
		print("[-] Contradicting Args: --users and --tweets cannot be used together.")
		sys.exit(0)

	loop = asyncio.get_event_loop()
	loop.run_until_complete(main())
