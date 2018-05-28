from time import strftime, localtime
import re

class tweet:
    pass

def getMentions(tw):
    try:
        mentions = tw.find("div", "js-original-tweet")["data-mentions"].split(" ")
    except:
        mentions = ""

    return mentions

def getText(tw):
    text = tw.find("p", "tweet-text").text
    text = text.replace("\n", "")
    text = text.replace("http", " http")
    text = text.replace("pic.twitter", " pic.twitter")

    return text

def getTweet(tw, mentions):
    try:
        text = getText(tw)
        for i in range(len(mentions)):
            mention = "@{}".format(mentions[i])
            if mention not in text:
                text = "{} {}".format(mention, text)
    except:
        text = getText(tw)

    return text

def getHashtags(text):
    return re.findall(r'(?i)\#\w+', text, flags=re.UNICODE)

def getStat(tw, _type):
    st = "ProfileTweet-action--{} u-hiddenVisually".format(_type)
    return tw.find("span", st).find("span")["data-tweet-stat-count"]

def getRetweet(profile, username, user):
    if profile and username.lower() != user:
        return True

def getUser_rt(profile, username, user):
    if getRetweet(profile, username, user):
        user_rt = user
    else:
        user_rt = "None"
    
    return user_rt

def Tweet(tw, location, config):
    t = tweet()
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
    t.tweet = getTweet(tw, t.mentions)
    t.location = location
    t.hashtags = getHashtags(t.tweet)
    t.replies = getStat(tw, "reply")
    t.retweets = getStat(tw, "retweet")
    t.likes = getStat(tw, "favorite")
    t.link = "https://twitter.com/{0.username}/status/{0.id}".format(t)
    t.retweet = getRetweet(config.Profile, t.username, config.Username)
    t.user_rt = getUser_rt(config.Profile, t.username, config.Username)
    return t
