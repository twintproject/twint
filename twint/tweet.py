from time import strftime, localtime
import json
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
        mentions = tw["data-mentions"].split(" ")
    except:
        mentions = ""

    return mentions

def getQuoteURL(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getQuoteInfo')
    """Extract quote from tweet
    """
    base_twitter = "https://twitter.com"
    quote_url = ""
    try:
        quote = tw.find("div","QuoteTweet-innerContainer")
        quote_url = base_twitter + quote.get("href")
    except:
        quote_url = ""

    return quote_url

def getText(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getText')
    """Replace some text
    """
    text = tw.find("p", "tweet-text").text
    text = text.replace("\n", " ")
    text = text.replace("http", " http")
    text = text.replace("pic.twitter", " pic.twitter")

    return text

def getStat(tw, _type):
    """Get stats about Tweet
    """
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getStat')
    st = f"ProfileTweet-action--{_type} u-hiddenVisually"
    return tw.find("span", st).find("span")["data-tweet-stat-count"]

def getRetweet(profile, username, user):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getRetweet')
    if profile and username.lower() != user.lower():
        return 1

def Tweet(tw, location, config):
    """Create Tweet object
    """
    ##logging.info("[<] " + str(datetime.now()) + ':: tweet+Tweet')
    t = tweet()
    t.id = int(tw["data-item-id"])
    t.id_str = tw["data-item-id"]
    t.conversation_id = tw["data-conversation-id"]
    t.datetime = int(tw.find("span", "_timestamp")["data-time-ms"])
    t.datestamp = strftime("%Y-%m-%d", localtime(t.datetime/1000.0))
    t.timestamp = strftime("%H:%M:%S", localtime(t.datetime/1000.0))
    t.user_id = int(tw["data-user-id"])
    t.user_id_str = tw["data-user-id"]
    t.username = tw["data-screen-name"]
    t.name = tw["data-name"]
    t.profile_image_url = tw.find("img", "js-action-profile-avatar").get('src').replace("_bigger","")
    t.place = tw.find("a","js-geo-pivot-link").text.strip() if tw.find("a","js-geo-pivot-link") else None
    t.timezone = strftime("%Z", localtime())
    for img in tw.findAll("img", "Emoji Emoji--forText"):
        img.replaceWith(img["alt"])
    t.mentions = getMentions(tw)
    t.urls = [link.attrs["data-expanded-url"] for link in tw.find_all('a',{'class':'twitter-timeline-link'}) if link.has_attr("data-expanded-url")]
    t.photos = [photo_node.attrs['data-image-url'] for photo_node in tw.find_all("div", "AdaptiveMedia-photoContainer")]
    t.video = 1 if tw.find_all("div", "AdaptiveMedia-video") != [] else 0
    t.tweet = getText(tw)
    t.location = location
    t.hashtags = [hashtag.text for hashtag in tw.find_all("a","twitter-hashtag")]
    t.replies_count = getStat(tw, "reply")
    t.retweets_count = getStat(tw, "retweet")
    t.likes_count = getStat(tw, "favorite")
    t.link = f"https://twitter.com/{t.username}/status/{t.id}"
    t.retweet = getRetweet(config.Profile, t.username, config.Username)
    t.quote_url = getQuoteURL(tw)
    return t
