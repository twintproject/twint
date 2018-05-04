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
import argparse
import twint
import sys

def error(error, message):
	print("[-] {}: {}".format(error, message))
	sys.exit(0)

def check(args):
	if args.username is not None:
		if args.users:
			error("Contradicting Args", "Please use --users in combination with -s.")
		if args.verified:
			error("Contradicting Args", "Please use --verified in combination with -s.")
		if args.userid:
			error("Contradicting Args", "--userid and -u cannot be used together.")
	if args.tweets and args.users:
		error("Contradicting Args", "--users and --tweets cannot be used together.")
	if args.csv and args.output is None:
		error("Error", "Please specify an output file (Example: -o file.csv).")
	if args.proxy_host is not None:
		if args.proxy_host.lower() == "tor":
			import socks, socket
			socks.set_default_proxy(socks.SOCKS5, "localhost", 9050)
			socket.socket = socks.socksocket
		elif args.proxy_port and args.proxy_type:
			if args.proxy_type.lower() == "socks5":
				_type = socks.SOCKS5
			elif args.proxy_type.lower() == "socks4":
				_type = socks.SOCKS4
			elif args.proxy_type.lower() == "http":
				_type = socks.HTTP
			else:
				error("Error", "Proxy type allower are: socks5, socks4 and http.")
			import socks, socket
			socks.set_default_proxy(_type, args.proxy_host, int(args.proxy_port))
			socket.socket = socks.socksocket
		else:
			error("Error", "Please specify --proxy-host, --proxy-port and --proxy-type")
	else:
		if args.proxy_port or args.proxy_type:
			error("Error", "Please specify --proxy-host, --proxy-port and --proxy-type")




def initialize(args):
	c = twint.Config()
	c.Username = args.username
	c.User_id = args.userid
	c.Search = args.search
	c.Geo = args.geo
	c.Location = args.location
	c.Near = args.near
	c.Lang = args.lang
	c.Output = args.output
	c.Elasticsearch = args.elasticsearch
	c.Timedelta = args.timedelta
	c.Year = args.year
	c.Since = args.since
	c.Until = args.until
	c.Fruit = args.fruit
	c.Verified = args.verified
	c.Store_csv = args.csv
	c.Store_json = args.json
	c.Show_hashtags = args.hashtags
	c.Tweets_only = args.tweets
	c.Users_only = args.users
	c.Limit = args.limit
	c.Count = args.count
	c.Stats = args.stats
	c.Database = args.database
	c.To = args.to
	c.All = args.all
	c.Debug = args.debug
	c.Proxy_type = args.proxy_type
	c.Proxy_host = args.proxy_host
	c.Proxy_port = args.proxy_port
	return c

def options():
	ap = argparse.ArgumentParser(prog="twint.py", usage="python3 %(prog)s [options]", description="TWINT - An Advanced Twitter Scraping Tool")
	ap.add_argument("-u", "--username", help="User's Tweets you want to scrape.")
	ap.add_argument("-s", "--search", help="Search for Tweets containing this word or phrase.")
	ap.add_argument("-g", "--geo", help="Search for geocoded tweets.")
	ap.add_argument("--near", help="Near a specified city.")
	ap.add_argument("--location", help="Show user's location (Experimental).", action="store_true")
	ap.add_argument("-l", "--lang", help="Serch for Tweets in a specific language")
	ap.add_argument("-o", "--output", help="Save output to a file.")
	ap.add_argument("-es", "--elasticsearch", help="Index to Elasticsearch")
	ap.add_argument("-t", "--timedelta", help="Time interval for every request")
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
	ap.add_argument("--debug", help="Debug mode", action="store_true")
	ap.add_argument("--proxy-type", help="Socks5, HTTP, etc.")
	ap.add_argument("--proxy-host", help="Proxy hostname or IP")
	ap.add_argument("--proxy-port", help="The port of the proxy server")
	args = ap.parse_args()
	return args

def main():
	args = options()
	check(args)
	c = initialize(args)

	if args.favorites:
		twint.Favorites(c)
	elif args.following:
		twint.Following(c)
	elif args.followers:
		twint.Followers(c)
	else:
		twint.Search(c)

if __name__ == "__main__":
	main()
