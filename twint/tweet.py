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


def getRawURLS(tw, link, config):
    player = tw.find_all("div","PlayableMedia-player")
    gif_url, gif_thumb, video_url, video_thumb = "", "", "", ""
    for node in player:
        styles = node.attrs['style'].split()
        for style in styles:
            if style.startswith('background'):
                tmp = "background-image:url('"
                style = style.replace(tmp, "")
                if "tweet_video_thumb" in style:
                    gif_url = style.replace("')",'')
                    gif_url = gif_url.replace('.jpg','.mp4')
                    gif_url = gif_url.replace('https://pbs','https://video')
                    gif_url = gif_url.replace("_thumb", "")
                    gif_thumb = style.replace("')", "")
                else:
                    video_url, video_thumb = "video","video_thumb"

    return gif_url, gif_thumb, video_url, video_thumb

def getMentions(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getMentions')
    """Extract ment from tweet
    """
    mentions = [{"id":int(mention["data-mentioned-user-id"]),"id_str": mention["data-mentioned-user-id"],"screen_name":mention.get('href').split("/")[-1]} for mention in tw.find_all('a',{'class':'twitter-atreply'})]

    return mentions

def getReplies(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getReplies')
    """Extract replies from tweet
    """
    replyToUsersJSON = json.loads(tw["data-reply-to-users-json"])

    replies = [{"id":int(reply["id_str"]),"id_str": reply["id_str"],"screen_name":reply["screen_name"]} for reply in replyToUsersJSON]

    return replies

def getTags(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getTags')
    """Extract tags from tweet
    """
    tags = []
    try:
        tag_links = tw.find("div","media-tagging-block").find_all("a","js-user-profile-link")
        for tag in tag_links:
            if tag.has_attr("data-user-id"):
                tmpData = {
                    "id":int(tag["data-user-id"]),
                    "id_str": tag["data-user-id"],
                    "screen_name":tag.get('href').split("/")[-1]
                }
                tags.append(tmpData)
    except:
        tags = []

    return tags

def getQuoteInfo(tw):
    #logging.info("[<] " + str(datetime.now()) + ':: tweet+getQuoteInfo')
    """Extract quote from tweet
    """
    base_twitter = "https://twitter.com"
    quote_status = 0
    quote_id = 0
    quote_id_str = ""
    quote_url = ""
    try:
        quote = tw.find("div","QuoteTweet-innerContainer")
        quote_status = 1
        quote_id = int(quote["data-item-id"])
        quote_id_str = quote["data-item-id"]
        quote_url = base_twitter + quote.get("href")
    except:
        quote_status = 0

    return quote_status, quote_id, quote_id_str, quote_url

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
    t.tags = getTags(tw)
    t.replies = getReplies(tw)
    t.urls = [link.attrs["data-expanded-url"] for link in tw.find_all('a',{'class':'twitter-timeline-link'}) if link.has_attr("data-expanded-url")]
    t.photos = [photo_node.attrs['data-image-url'] for photo_node in tw.find_all("div", "AdaptiveMedia-photoContainer")]
    t.tweet = getText(tw)
    t.location = location
    t.hashtags = [hashtag.text for hashtag in tw.find_all("a","twitter-hashtag")]
    t.replies_count = getStat(tw, "reply")
    t.retweets_count = getStat(tw, "retweet")
    t.likes_count = getStat(tw, "favorite")
    t.link = f"https://twitter.com/{t.username}/status/{t.id}"
    t.retweet = getRetweet(config.Profile, t.username, config.Username)
    t.gif_url, t.gif_thumb, t.video_url, t.video_thumb = getRawURLS(tw, t.link, config)
    t.is_quote_status, t.quote_id, t.quote_id_str, t.quote_url = getQuoteInfo(tw)
    t.is_reply_to = int(bool(tw["data-is-reply-to"])) if tw.has_attr("data-is-reply-to") else 0
    t.has_parent_tweet = int(bool(tw["data-has-parent-tweet"])) if tw.has_attr("data-has-parent-tweet") else 0
    t.in_reply_to_screen_name = ""
    t.in_reply_to_status_id = 0
    t.in_reply_to_status_id_str = ""
    t.in_reply_to_user_id = 0
    t.in_reply_to_user_id_str = ""
    return t