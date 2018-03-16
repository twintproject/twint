#!/usr/bin/python3
from bs4 import BeautifulSoup, UnicodeDammit
from time import gmtime, strftime
import datetime
import json
import re
import sys
import pandas as pd
from random import choice
from pyTweep.TorCrawler import TorCrawler
from pyTweep.loadAgents import get_agents

#set TorCrawler defaults, this can be changed as the user wishes, see https://github.com/alex-miller-0/Tor_Crawler for details
N_REQUESTS = 24

#import torcrawler
crawler = TorCrawler(n_requests=N_REQUESTS)

#import random headers
USER_AGENT_LIST = get_agents()

#define random choice of agents function
def random_headers(user_agent_list):
    return {'User-Agent': user_agent_list[choice(list(user_agent_list.keys()))]}



def getUrl(init,user_name,search_term,geo,year,since,fruit,verified):
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

    if user_name != None:
        url+= "from%3A{}".format(user_name)
    if geo != None:
        geo = geo.replace(" ", "")
        url+= "geocode%3A{}".format(geo)
    if search_term!= None:
        search_term = search_term.replace(" ", "%20").replace("#", "%23")
        url+= "%20{}".format(search_term)
    if year != None:
        url+= "%20until%3A{}-1-1".format(year)
    if since != None:
        url+= "%20since%3A{}".format(since)
    if fruit != None:
        url+= "%20myspace.com%20OR%20last.fm%20OR"
        url+= "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
        url+= "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
        url+= "%20OR%20keybase"
    if verified:
        url+= "%20filter%3Averified"

    return url

def fetch(url):
    '''
    Basic aiohttp request with a 30 second timeout.
    '''    
    response = crawler.get(url,headers=random_headers(USER_AGENT_LIST))
    return response
        
def initial(response):
    '''
    Initial response parsing and collecting the position ID
    '''
    feed = response.find_all("li", "js-stream-item")
    init = "TWEET-{}-{}".format(feed[-1]["data-item-id"], feed[0]["data-item-id"])

    return feed, init

def cont(response):
    '''
    Regular json response parsing and collecting Position ID
    '''
    json_response = json.loads(response)
    html = json_response["items_html"]
    feed = response.find_all("li", "js-stream-item")
    split = json_response["min_position"].split("-")
    split[1] = feed[-1]["data-item-id"]
    init = "-".join(split)
    return feed, init

def getFeed(init,user_name,search_term,geo,year,since,fruit,verified):
    '''
    Parsing Descision:
    Responses from requests with the position id's are JSON,
    so this section decides whether this is an initial request
    or not to use the approriate response reading for parsing
    with BeautifulSoup4.

    Returns html for Tweets and position id.
    '''

    response =  fetch(getUrl(init,user_name,search_term,geo,year,since,fruit,verified))
    feed = []
    try:
        if init == -1:
            feed, init = initial(response)
        else:
            feed, init = cont(response) 
    except:
        # Tweep will realize that it's done scraping.
        pass

    return feed, init

def outTweet(tweet,hashtags,stats):

    '''
    Parsing Section:
    This function will create the desired output list and write it
    to a pandas data frame.

    Returns output, dat 
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
    # The context of the Tweet compressed into a single line.
    text = tweet.find("p", "tweet-text").text.replace("\n", "").replace("http", " http").replace("pic.twitter", " pic.twitter")
    # Regex for gathering hashtags
    tweet_hashtags = ",".join(re.findall(r'(?i)\#\w+', text, flags=re.UNICODE))
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
    The standard output is how I like it, although
    this can be modified to your desire. Change the order in the output lists as you wish,
    but make sure you update the same list specifications in getTweets() and main() otherwise
    the dataframes won't match in dimensions and it will cause errors
    '''
    output = [tweetid, date, time, timezone, username, text]
    if hashtags == True:
        output += [tweet_hashtags]
    if stats == True:
        output += [replies, retweets, likes, tweet_hashtags]

    return output



def getTweets(init,user_name,search_term,geo,year,since,
                                                fruit,verified,hashtags,
                                                limit,count,stats):
    '''
    This function uses the html responses from getFeed()
    and sends that info to the Tweet parser outTweet() and
    outputs it.

    Returns response feed, if it's first-run, and Tweet count.
    '''
    tweets, init = getFeed(init,user_name,search_term,geo,year,since,fruit,verified)
    count = 0
    columns = ['tweetid', 'date', 'time', 'timezone', 'username', 'text']
    if hashtags == True:
        columns+= ['hashtags']
    if stats == True:
        columns += ['replies', 'retweets', 'likes','hashtags']
    x = 0
    if x == 0:
        df = pd.DataFrame(columns=columns)
        x = 1
    for tweet in tweets:
        '''
        Certain Tweets get taken down for copyright but are still
        visible in the search. We want to avoid those.
        '''
        copyright = tweet.find("div","StreamItemContent--withheld")
        if copyright is None:
            dat = outTweet(tweet,hashtags,stats)
            df.loc[count] = dat
            count +=1

    return tweets, init, count, df




def getUsername(userid):
    '''
    This function uses a Twitter ID search to resolve a Twitter User
    ID and return it's corresponding username.
    '''
    r = fetch("https://twitter.com/intent/user?user_id={0.userid}".format(userid))
    return r.find("a", "fn url alternate-context")["href"].replace("/", "")


def main(user_name,search_term,geo,year,since,fruit,verified,hashtags,userid,limit,count,stats):
    '''
    Putting it all together.
    '''
    if userid is not None:
        user_name = getUsername(userid)

    feed = [-1]
    init = -1
    num = 0
    if user_name and search_term:
        if len(feed) > 0:
            feed, init, count, df = getTweets(init,user_name,search_term,geo,year,since,fruit,verified,hashtags,limit,count,stats)
    else:
        while True:
            '''
            If our response from getFeed() has an exception,
            it signifies there are no position IDs to continue
            with, telling Tweep it's finished scraping.
            '''
            if len(feed) > 0:
                feed, init, count, df = getTweets(init,user_name,search_term,geo,year,since,fruit,verified,hashtags,limit,count,stats)
                num += count
            else:
                break
            # Control when we want to stop scraping.
            if limit is not None and num == int(limit):
                break
        if count:
            print("Finished: Successfully collected {} Tweets.".format(num))
            
    return df 

def Error(error, message):
    # Error formatting
    print("[-] {}: {}".format(error, message))
    sys.exit(0)

def check(user_names,verified,userid):
    # Performs main argument checks so nothing unintended happens. 
    if user_names is not None:
        if verified:
            Error("Contradicting Args", "Please use verified in combination with search_terms.")
        if userid:
            Error("Contradicting Args", "userid and username cannot be used together.")


def pyTweepTor(user_names = None,search_terms = None,geo = None,year = None,since = None,fruit = None,verified = None,hashtags = False,userid = None,limit = None,count = None,stats = False):                       
    '''
    This is a wrapper function for tweep.py which will allow it to be implemented in pure python, without interfacing with with bash,
    and with updated output functionality integrated with pandas, and with pure python interation capabilities,
    i.e. iteration through search terms and usernames 
    :param user_names: users whose feeds you want to search, list of stringsof Twitter user names, usage: user_names = ['user_foo','user_bar'], default = None
    :param search_terms: search terms you which to query, list of strings of search terms, usage: search_terms = ['foo','bar'], default = None
    :param geo: search for geocoded tweets, usage: geo ="48.880048,2.385939,1km" to search for tweets within a 1km radius of paris, default = None
    :param year: filter Tweets before specified year, usage: year = 2014, default = None
    :param since: filter Tweets sent since date, usage: since = '2017-12-27', default = None
    :param fruit: use to display 'low-hanging-fruit' Tweets, i.e. tweets containing: profiles from leaked databases (Myspace or LastFM),
    email addresses, phone numbers, or keybase.io profiles. usage: fruit = True, default = None
    :param verified: use to display Tweets only from verified users, usage: verified=True, default = None
    :param hashtags: use to output hashtags in a seperate column, usage: hashtags=True, default = None
    :param userid: string. twitter userid if you want to use (can't be used with "user_name"), default = None
    :param limit: int value for Number of Tweets to pull (Increments of 20), default = None
    :param count: boolian, display number Tweets scraped at the end of session, default = None
    :param stats: use to show number of replies, retweets, and likes in output, usage: stats=True, default=None
    :param N_Requests: int, sets number of requests 
    :return: a pandas dataframe corresponding to the specified parameters
    '''
    check(user_names,verified,userid)
    columns = ['tweetid', 'date', 'time', 'timezone', 'username', 'text']
    if hashtags == True:
        columns+= ['hashtags']
    if stats == True:
        columns += ['replies', 'retweets', 'likes','hashtags']
    df = pd.DataFrame(columns=columns)
    if search_terms and user_names:
        for user_name in user_names:
            for search_term in search_terms:
                dx = main(user_name,search_term,geo,year,since,fruit,verified,hashtags,userid,limit,count,stats)
                df = pd.concat([df,dx])
    elif user_names:
        for user_name in user_names:
            dx = main(user_name,search_terms,geo,year,since,fruit,verified,hashtags,userid,limit,count,stats)
            df = pd.concat([df,dx])
    elif search_terms:
        for search_term in search_terms:
            dx = main(user_names,search_term,geo,year,since,fruit,verified,hashtags,userid,limit,count,stats)
            df = pd.concat([df,dx])
    else:
        print('You must enter either a user name or a search term for Tweep to work')
    return df        
                
                      

