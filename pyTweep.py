#!/usr/bin/python3
from bs4 import BeautifulSoup, UnicodeDammit
from time import gmtime, strftime
import aiohttp
import asyncio
import async_timeout
import csv
import datetime
import json
import re
import sys
import pandas as pd


SEARCH_TERMS = ['Marines']
USER_NAMES = ['realDonaldTrump']
SINCE = '2018-03-13'

async def getUrl(init,user_name,search_term,geo,year,since,fruit,verified):
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

async def fetch(session, url):
    '''
    Basic aiohttp request with a 30 second timeout.
    '''
    with async_timeout.timeout(30):
        async with session.get(url) as response:
            _bytes = await response.read()
            return UnicodeDammit(_bytes).unicode_markup
        
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

async def getFeed(init,user_name,search_term,geo,year,since,fruit,verified):
    '''
    Parsing Descision:
    Responses from requests with the position id's are JSON,
    so this section decides whether this is an initial request
    or not to use the approriate response reading for parsing
    with BeautifulSoup4.

    Returns html for Tweets and position id.
    '''
    async with aiohttp.ClientSession() as session:
        response = await fetch(session, await getUrl(init,user_name,search_term,geo,year,since,fruit,verified))
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

async def outTweet(tweet,df_output,users,hashtags,stats):
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
    if users:
        output = username
    elif users:
        output = tweet
    else:
        '''
        The standard output is how I like it, although
        this can be modified to your desire. Uncomment
        the bottom line and add in the variables in the
        order you want them or how you want it to look.
        '''
        # output = ""
        output = "{} {} {} {} <{}> {}".format(tweetid, date, time, timezone, username, text)
        if hashtags:
            output+= " {}".format(hashtags)
        if stats:
            output+= " | {} replies {} retweets {} likes".format(replies, retweets, likes)

    # Output section

    if df_output != False:
        dat = [tweetid, date, time, timezone, username, text]
        if hashtags:
            dat = [tweetid, date, time, timezone, username, text, hashtags]
        # Write all variables to a list to be passed to a dataframe
        if stats:
            dat = [tweetid, date, time, timezone, username, text, replies, retweets, likes,hashtags]

    return output


async def getTweets(init,user_name,search_term,geo,year,since,fruit,
                    verified,users,df_output,hashtags,limit,count,stats):
    '''
    This function uses the html responses from getFeed()
    and sends that info to the Tweet parser outTweet() and
    outputs it.

    Returns response feed, if it's first-run, and Tweet count.
    '''
    tweets, init = await getFeed(init,user_name,search_term,geo,year,since,fruit,verified)
    count = 0
    if df_output:
        df = pd.DataFrame(columns=['tweetid','date','time','timezone','username','text'])
        if hashtags:
            df = pd.DataFrame(columns=['tweetid','date','time','timezone','username','text','hashtags'])
        if stats:
            df = pd.DataFrame(columns=['tweetid','date','time','timezone','username','text','replies','retweets','likes','hashtags'])
    for tweet in tweets:
        '''
        Certain Tweets get taken down for copyright but are still
        visible in the search. We want to avoid those.
        '''
        copyright = tweet.find("div","StreamItemContent--withheld")
        if copyright is None:
            print(await outTweet(tweet,df_output,users,hashtags,stats))
            #df.loc[count] = dat
            count += 1
            
    return tweets, init, count


async def getUsername(userid):
    '''
    This function uses a Twitter ID search to resolve a Twitter User
    ID and return it's corresponding username.
    '''
    async with aiohttp.ClientSession() as session:
        r = await fetch(session, "https://twitter.com/intent/user?user_id={0.userid}".format(userid))
    soup = BeautifulSoup(r, "html.parser")
    return soup.find("a", "fn url alternate-context")["href"].replace("/", "")


async def main(user_name,search_term,geo,year,since,fruit,tweets,verified,users,df_output,hashtags,userid,limit,count,stats):
    '''
    Putting it all together.
    '''
    if userid is not None:
        user_name = await getUsername(userid)

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
            feed, init, count = await getTweets(init,user_name,search_term,geo,year,since,
                                                fruit,verified,users,df_output,hashtags,
                                                limit,count,stats)
            num += count
        else:
            break
        # Control when we want to stop scraping.
        if limit is not None and num <= int(limit):
            break
    if count:
        print("Finished: Successfully collected {} Tweets.".format(num))
    #return df

def Error(error, message):
    # Error formatting
    print("[-] {}: {}".format(error, message))
    sys.exit(0)

def check(user_names,users,verified,userid,tweets,df_output):
    # Performs main argument checks so nothing unintended happens. 
    if user_names is not None:
        if users:
            Error("Contradicting Args", "Please use users in combination with search_terms.")
        if verified:
            Error("Contradicting Args", "Please use verified in combination with search_terms.")
        if userid:
            Error("Contradicting Args", "userid and username cannot be used together.")
    if tweets and users:
        Error("Contradicting Args", "users and tweets cannot be used together.")


def Tweep(user_names = None,        
          search_terms = None,            
          geo = None,               
          year = None,              
          since = None,             
          fruit = False,             
          tweets = False,            
          verified = False,          
          users = None,             
          df_output = True,         
          hashtags = False,          
          userid = None,             
          limit = None,             
          count = False,             
          stats = False):            
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
    email addresses, phone numbers, or keybase.io profiles. usage: fruit = True, default = False
    :param tweets: use to display tweets only, usage: tweets=True, default = False
    :param verified: use to display Tweets only from verified users, usage: verified=True, default = False
    :param users: use to display users only, usage: users=True, default = None
    :param df_output: use to output to pandas dataframe boolian, default = True
    :param hashtags: use to output hashtags in a seperate column, usage: hashtags=True, default = False
    :param userid: string. twitter userid if you want to use (can't be used with "user_name"), default = None
    :param limit: int value for Number of Tweets to pull (Increments of 20), default = None
    :param count: boolian, display number Tweets scraped at the end of session, default = False
    :param stats: use to show number of replies, retweets, and likes in output, usage: stats=True, default=False
    :return: a pandas dataframe corresponding to the specified parameters
    '''
    check(user_names,users,verified,userid,tweets,df_output)
    if df_output:
        df = pd.DataFrame(columns=['tweetid','date','time','timezone','username','text'])
        if hashtags:
            df = pd.DataFrame(columns=['tweetid','date','time','timezone','username','text','hashtags'])
        if stats:
            df = pd.DataFrame(columns=['tweetid','date','time','timezone','username','text','replies','retweets','likes','hashtags'])
    if search_terms and user_names:
        for user_name in user_names:
            for search_term in search_terms:
                loop = asyncio.get_event_loop()
                test = loop.run_until_complete(main(user_name,search_term,geo,year,since,fruit,tweets,verified,users,df_output,hashtags,userid,limit,count,stats))
                two = pd.concat([df,test])
    elif user_names:
        for user_name in user_names:
            loop = asyncio.get_event_loop()
            test = loop.run_until_complete(main(user_name,search_term,geo,year,since,fruit,tweets,verified,users,df_output,hashtags,userid,limit,count,stats))
            two = pd.concat([df,test])
    elif search_terms:
        for search_term in search_terms:
            loop = asyncio.get_event_loop()
            test = loop.run_until_complete(main(user_name,search_term,geo,year,since,fruit,tweets,verified,users,df_output,hashtags,userid,limit,count,stats))
            two = pd.concat([df,test])
    else:
        print('You must enter either a user name or a search term for Tweep to work')
    return two
    


if __name__ == '__main__':
    bron = Tweep(user_names = ['realDonaldTrump'],search_terms=['Kudlow'],stats=True)

        
                
                      
