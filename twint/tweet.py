from time import strftime, localtime
import re
#from datetime import datetime
#import logging

class tweet:
    """Define Tweet class
    """
    type = "tweet"

    def __init__(self):
        pass

def getMentions(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getMentions')
    """Extract ment from tweet
    """
    try:
        mentions = tw.find("div", "js-original-tweet")["data-mentions"].split(" ")
    except:
        mentions = ""

    return mentions

def getText(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getText')
    """Replace some text
    """
    text = tw.find("p", "tweet-text").text
    text = text.replace("\n", " ")
    text = text.replace("http", " http")
    text = text.replace("pic.twitter", " pic.twitter")

    return text

def getTweet(tw, mentions):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getTweet')
    try:
        text = getText(tw)
        for i in range(len(mentions)):
            mention = f"@{mentions[i]}"
            if mention not in text:
                text = f"{mention} {text}"
    except:
        text = getText(tw)

    return text

def getHashtags(text):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getHashtags')
    """Get hashtags of tweet
    """
    return re.findall(r'(?i)\#\w+', text, flags=re.UNICODE)

def getStat(tw, _type):
    """Get stats about Tweet
    """
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getStat')
    st = f"ProfileTweet-action--{_type} u-hiddenVisually"
    return tw.find("span", st).find("span")["data-tweet-stat-count"]

def getRetweet(profile, username, user):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getRetweet')
    if profile and username.lower() != user:
        return True

def getUser_rt(profile, username, user):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getUser_rt')
    """Get username that retweeted
    """
    if getRetweet(profile, username, user):
        user_rt = user
    else:
        user_rt = "None"

    return user_rt

def Tweet(tw, location, config):
    """Create Tweet object
    """
    ##logging.info("[<] " + str(datetime.now()) + ':: tweet+Tweet')
    t = tweet()
    t.id = tw.find("div")["data-item-id"]
    t.datetime = int(tw.find("span", "_timestamp")["data-time"])
    t.datestamp = strftime("%Y-%m-%d", localtime(t.datetime))
    t.timestamp = strftime("%H:%M:%S", localtime(t.datetime))
    t.user_id = tw.find("a", "account-group js-account-group js-action-profile js-user-profile-link js-nav")["data-user-id"]
    t.username = tw.find("span", "username").text.replace("@", "")
    t.timezone = strftime("%Z", localtime())
    for img in tw.findAll("img", "Emoji Emoji--forText"):
        img.replaceWith(img["alt"])
    t.mentions = getMentions(tw)
    t.tweet = getTweet(tw, t.mentions)
    t.location = location
    t.hashtags = getHashtags(t.tweet)
    t.replies = getStat(tw, "reply")
    t.retweets = getStat(tw, "retweet")
    t.likes = getStat(tw, "favorite")
    t.link = f"https://twitter.com/{t.username}/status/{t.id}"
    t.retweet = getRetweet(config.Profile, t.username, config.Username)
    t.user_rt = getUser_rt(config.Profile, t.username, config.Username)
    return t
