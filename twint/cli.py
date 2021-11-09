#!/usr/bin/env python3
'''
Twint.py - Twitter Intelligence Tool (formerly known as Tweep).

See wiki on Github for in-depth details.
https://github.com/twintproject/twint/wiki

Licensed under MIT License
Copyright (c) 2018 The Twint Project  
'''
import sys
import os
import argparse

from . import run
from . import config
from . import storage


def error(_error, message):
    """ Print errors to stdout
    """
    print("[-] {}: {}".format(_error, message))
    sys.exit(0)


def check(args):
    """ Error checking
    """
    if args.username is not None or args.userlist or args.members_list:
        if args.verified:
            error("Contradicting Args",
                  "Please use --verified in combination with -s.")
        if args.userid:
            error("Contradicting Args",
                  "--userid and -u cannot be used together.")
        if args.all:
            error("Contradicting Args",
                  "--all and -u cannot be used together.")
    elif args.search and args.timeline:
        error("Contradicting Args",
              "--s and --tl cannot be used together.")
    elif args.timeline and not args.username:
        error("Error", "-tl cannot be used without -u.")
    elif args.search is None:
        if args.custom_query is not None:
            pass
        elif (args.geo or args.near) is None and not (args.all or args.userid):
            error("Error", "Please use at least -u, -s, -g or --near.")
    elif args.all and args.userid:
        error("Contradicting Args",
              "--all and --userid cannot be used together")
    if args.output is None:
        if args.csv:
            error("Error", "Please specify an output file (Example: -o file.csv).")
        elif args.json:
            error("Error", "Please specify an output file (Example: -o file.json).")
    if args.backoff_exponent <= 0:
        error("Error", "Please specifiy a positive value for backoff_exponent")
    if args.min_wait_time < 0:
        error("Error", "Please specifiy a non negative value for min_wait_time")


def loadUserList(ul, _type):
    """ Concatenate users
    """
    if os.path.exists(os.path.abspath(ul)):
        userlist = open(os.path.abspath(ul), "r").read().splitlines()
    else:
        userlist = ul.split(",")
    if _type == "search":
        un = ""
        for user in userlist:
            un += "%20OR%20from%3A" + user
        return un[15:]
    return userlist


def initialize(args):
    """ Set default values for config from args
    """
    c = config.Config()
    c.Username = args.username
    c.User_id = args.userid
    c.Search = args.search
    c.Geo = args.geo
    c.Location = args.location
    c.Near = args.near
    c.Lang = args.lang
    c.Output = args.output
    c.Elasticsearch = args.elasticsearch
    c.Year = args.year
    c.Since = args.since
    c.Until = args.until
    c.Email = args.email
    c.Phone = args.phone
    c.Verified = args.verified
    c.Store_csv = args.csv
    c.Tabs = args.tabs
    c.Store_json = args.json
    c.Show_hashtags = args.hashtags
    c.Show_cashtags = args.cashtags
    c.Limit = args.limit
    c.Count = args.count
    c.Stats = args.stats
    c.Database = args.database
    c.To = args.to
    c.All = args.all
    c.Essid = args.essid
    c.Format = args.format
    c.User_full = args.user_full
    # c.Profile_full = args.profile_full
    c.Pandas_type = args.pandas_type
    c.Index_tweets = args.index_tweets
    c.Index_follow = args.index_follow
    c.Index_users = args.index_users
    c.Debug = args.debug
    c.Resume = args.resume
    c.Images = args.images
    c.Videos = args.videos
    c.Media = args.media
    c.Replies = args.replies
    c.Pandas_clean = args.pandas_clean
    c.Proxy_host = args.proxy_host
    c.Proxy_port = args.proxy_port
    c.Proxy_type = args.proxy_type
    c.Tor_control_port = args.tor_control_port
    c.Tor_control_password = args.tor_control_password
    c.Retweets = args.retweets
    c.Custom_query = args.custom_query
    c.Popular_tweets = args.popular_tweets
    c.Skip_certs = args.skip_certs
    c.Hide_output = args.hide_output
    c.Native_retweets = args.native_retweets
    c.Min_likes = args.min_likes
    c.Min_retweets = args.min_retweets
    c.Min_replies = args.min_replies
    c.Links = args.links
    c.Source = args.source
    c.Members_list = args.members_list
    c.Filter_retweets = args.filter_retweets
    c.Translate = args.translate
    c.TranslateDest = args.translate_dest
    c.Backoff_exponent = args.backoff_exponent
    c.Min_wait_time = args.min_wait_time
    return c


def options():
    """ Parse arguments
    """
    ap = argparse.ArgumentParser(prog="twint",
                                 usage="python3 %(prog)s [options]",
                                 description="TWINT - An Advanced Twitter Scraping Tool.")
    ap.add_argument("-u", "--username", help="User's Tweets you want to scrape.")
    ap.add_argument("-s", "--search", help="Search for Tweets containing this word or phrase.")
    ap.add_argument("-g", "--geo", help="Search for geocoded Tweets.")
    ap.add_argument("--near", help="Near a specified city.")
    ap.add_argument("--location", help="Show user's location (Experimental).", action="store_true")
    ap.add_argument("-l", "--lang", help="Search for Tweets in a specific language.")
    ap.add_argument("-o", "--output", help="Save output to a file.")
    ap.add_argument("-es", "--elasticsearch", help="Index to Elasticsearch.")
    ap.add_argument("--year", help="Filter Tweets before specified year.")
    ap.add_argument("--since", help="Filter Tweets sent since date (Example: \"2017-12-27 20:30:15\" or 2017-12-27).",
                    metavar="DATE")
    ap.add_argument("--until", help="Filter Tweets sent until date (Example: \"2017-12-27 20:30:15\" or 2017-12-27).",
                    metavar="DATE")
    ap.add_argument("--email", help="Filter Tweets that might have email addresses", action="store_true")
    ap.add_argument("--phone", help="Filter Tweets that might have phone numbers", action="store_true")
    ap.add_argument("--verified", help="Display Tweets only from verified users (Use with -s).",
                    action="store_true")
    ap.add_argument("--csv", help="Write as .csv file.", action="store_true")
    ap.add_argument("--tabs", help="Separate CSV fields with tab characters, not commas.", action="store_true")
    ap.add_argument("--json", help="Write as .json file", action="store_true")
    ap.add_argument("--hashtags", help="Output hashtags in seperate column.", action="store_true")
    ap.add_argument("--cashtags", help="Output cashtags in seperate column.", action="store_true")
    ap.add_argument("--userid", help="Twitter user id.")
    ap.add_argument("--limit", help="Number of Tweets to pull (Increments of 20).")
    ap.add_argument("--count", help="Display number of Tweets scraped at the end of session.",
                    action="store_true")
    ap.add_argument("--stats", help="Show number of replies, retweets, and likes.",
                    action="store_true")
    ap.add_argument("-db", "--database", help="Store Tweets in a sqlite3 database.")
    ap.add_argument("--to", help="Search Tweets to a user.", metavar="USERNAME")
    ap.add_argument("--all", help="Search all Tweets associated with a user.", metavar="USERNAME")
    ap.add_argument("--followers", help="Scrape a person's followers.", action="store_true")
    ap.add_argument("--following", help="Scrape a person's follows", action="store_true")
    ap.add_argument("--favorites", help="Scrape Tweets a user has liked.", action="store_true")
    ap.add_argument("--proxy-type", help="Socks5, HTTP, etc.")
    ap.add_argument("--proxy-host", help="Proxy hostname or IP.")
    ap.add_argument("--proxy-port", help="The port of the proxy server.")
    ap.add_argument("--tor-control-port", help="If proxy-host is set to tor, this is the control port", default=9051)
    ap.add_argument("--tor-control-password",
                    help="If proxy-host is set to tor, this is the password for the control port",
                    default="my_password")
    ap.add_argument("--essid",
                    help="Elasticsearch Session ID, use this to differentiate scraping sessions.",
                    nargs="?", default="")
    ap.add_argument("--userlist", help="Userlist from list or file.")
    ap.add_argument("--retweets",
                    help="Include user's Retweets (Warning: limited).",
                    action="store_true")
    ap.add_argument("--format", help="Custom output format (See wiki for details).")
    ap.add_argument("--user-full",
                    help="Collect all user information (Use with followers or following only).",
                    action="store_true")
    # I am removing this this feature for the time being, because it is no longer required, default method will do this
    # ap.add_argument("--profile-full",
    #                 help="Slow, but effective method of collecting a user's Tweets and RT.",
    #                 action="store_true")
    ap.add_argument(
        "-tl",
        "--timeline",
        help="Collects every tweet from a User's Timeline. (Tweets, RTs & Replies)",
        action="store_true",
    )
    ap.add_argument("--translate",
                    help="Get tweets translated by Google Translate.",
                    action="store_true")
    ap.add_argument("--translate-dest", help="Translate tweet to language (ISO2).",
                    default="en")
    ap.add_argument("--store-pandas", help="Save Tweets in a DataFrame (Pandas) file.")
    ap.add_argument("--pandas-type",
                    help="Specify HDF5 or Pickle (HDF5 as default)", nargs="?", default="HDF5")
    ap.add_argument("-it", "--index-tweets",
                    help="Custom Elasticsearch Index name for Tweets.", nargs="?", default="twinttweets")
    ap.add_argument("-if", "--index-follow",
                    help="Custom Elasticsearch Index name for Follows.",
                    nargs="?", default="twintgraph")
    ap.add_argument("-iu", "--index-users", help="Custom Elasticsearch Index name for Users.",
                    nargs="?", default="twintuser")
    ap.add_argument("--debug",
                    help="Store information in debug logs", action="store_true")
    ap.add_argument("--resume", help="Resume from Tweet ID.", metavar="TWEET_ID")
    ap.add_argument("--videos", help="Display only Tweets with videos.", action="store_true")
    ap.add_argument("--images", help="Display only Tweets with images.", action="store_true")
    ap.add_argument("--media",
                    help="Display Tweets with only images or videos.", action="store_true")
    ap.add_argument("--replies", help="Display replies to a subject.", action="store_true")
    ap.add_argument("-pc", "--pandas-clean",
                    help="Automatically clean Pandas dataframe at every scrape.")
    ap.add_argument("-cq", "--custom-query", help="Custom search query.")
    ap.add_argument("-pt", "--popular-tweets", help="Scrape popular tweets instead of recent ones.",
                    action="store_true")
    ap.add_argument("-sc", "--skip-certs", help="Skip certs verification, useful for SSC.", action="store_false")
    ap.add_argument("-ho", "--hide-output", help="Hide output, no tweets will be displayed.", action="store_true")
    ap.add_argument("-nr", "--native-retweets", help="Filter the results for retweets only.", action="store_true")
    ap.add_argument("--min-likes", help="Filter the tweets by minimum number of likes.")
    ap.add_argument("--min-retweets", help="Filter the tweets by minimum number of retweets.")
    ap.add_argument("--min-replies", help="Filter the tweets by minimum number of replies.")
    ap.add_argument("--links", help="Include or exclude tweets containing one o more links. If not specified" +
                                    " you will get both tweets that might contain links or not.")
    ap.add_argument("--source", help="Filter the tweets for specific source client.")
    ap.add_argument("--members-list", help="Filter the tweets sent by users in a given list.")
    ap.add_argument("-fr", "--filter-retweets", help="Exclude retweets from the results.", action="store_true")
    ap.add_argument("--backoff-exponent", help="Specify a exponent for the polynomial backoff in case of errors.",
                    type=float, default=3.0)
    ap.add_argument("--min-wait-time", type=float, default=15,
                    help="specifiy a minimum wait time in case of scraping limit error. This value will be adjusted by twint if the value provided does not satisfy the limits constraints")
    args = ap.parse_args()

    return args


def main():
    """ Main
    """
    args = options()
    check(args)

    if args.pandas_clean:
        storage.panda.clean()

    c = initialize(args)

    if args.userlist:
        c.Query = loadUserList(args.userlist, "search")

    if args.pandas_clean:
        storage.panda.clean()

    if args.favorites:
        if args.userlist:
            _userlist = loadUserList(args.userlist, "favorites")
            for _user in _userlist:
                args.username = _user
                c = initialize(args)
                run.Favorites(c)
        else:
            run.Favorites(c)
    elif args.following:
        if args.userlist:
            _userlist = loadUserList(args.userlist, "following")
            for _user in _userlist:
                args.username = _user
                c = initialize(args)
                run.Following(c)
        else:
            run.Following(c)
    elif args.followers:
        if args.userlist:
            _userlist = loadUserList(args.userlist, "followers")
            for _user in _userlist:
                args.username = _user
                c = initialize(args)
                run.Followers(c)
        else:
            run.Followers(c)
    elif args.retweets:  # or args.profile_full:
        if args.userlist:
            _userlist = loadUserList(args.userlist, "profile")
            for _user in _userlist:
                args.username = _user
                c = initialize(args)
                run.Profile(c)
        else:
            run.Profile(c)
    elif args.user_full:
        if args.userlist:
            _userlist = loadUserList(args.userlist, "userlist")
            for _user in _userlist:
                args.username = _user
                c = initialize(args)
                run.Lookup(c)
        else:
            run.Lookup(c)
    elif args.timeline:
        run.Profile(c)
    else:
        run.Search(c)


def run_as_command():
    version = ".".join(str(v) for v in sys.version_info[:2])
    if float(version) < 3.6:
        print("[-] TWINT requires Python version 3.6+.")
        sys.exit(0)

    main()


if __name__ == '__main__':
    main()
