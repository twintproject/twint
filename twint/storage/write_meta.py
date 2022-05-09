import string
import re
from nltk.corpus import stopwords
import re             
import string 
import nltk
import twint
import nest_asyncio
nest_asyncio.apply()
# __import__('IPython').embed()

from nltk.stem.snowball import SnowballStemmer
from nltk.tokenize import TweetTokenizer, RegexpTokenizer

nltk.download('stopwords')

stemmer = SnowballStemmer("english", ignore_stopwords=True)
token = RegexpTokenizer(r'[a-zA-Z0-9]+')


# Preprocessing

RE_EMOJI = re.compile('[\U00010000-\U0010ffff]', flags=re.UNICODE)


def strip_emoji(text):
    return RE_EMOJI.sub(r'', text)

def remove_URL(text):
    url = re.compile(r"https?://\S+|www\.\S+")
    return url.sub(r"", text)


def remove_punct(text):
    translator = str.maketrans("", "", string.punctuation)
    return text.translate(translator)


def remove_mention(text):
    return re.sub("@[A-Za-z0-9]+", "", text)


def stem_tweets(tweet):
    tokens = tweet.split()
    stemmed_tokens = [stemmer.stem(token) for token in tokens]
    return ' '.join(stemmed_tokens)


def lemmatize_tweets(tweet):
    tokens = tweet.split()
    lemmatized_tokens = [lemmatizer.lemmatize(token) for token in tokens]
    return ' '.join(lemmatized_tokens)

# remove stopwords


stop = set(stopwords.words("english"))


def remove_stopwords(text):
    stop = set(stopwords.words("english"))

    filtered_words = [word.lower()
                      for word in text.split() if word.lower() not in stop]
    return " ".join(filtered_words)


def preprocess_tweets(tweet):
    tweet = strip_emoji(tweet)
    tweet = remove_mention(tweet)
    tweet = remove_URL(tweet)
    tweet = remove_punct(tweet)
    tweet = stem_tweets(tweet)
    # tweet = lemmatize_tweets(tweet)
    tweet = remove_stopwords(tweet)
    return tweet

def tweetData(t):
    t.tweet = t.tweet.lower()
    
    # pre-processing
    tweet_processed = preprocess_tweets(t.tweet)
    
    will_be_removed = len(tweet_processed.split(' ')) < 3
    
    c = twint.Config()
    c.User_id = t.user_id
    c.Store_object = True
    c.User_full = True

    twint.run.Lookup(c)
    user = next((user for user in twint.output.users_list if str(user.id) == str(t.user_id)), None)
    user_location = user.location if user is not None else "-"
    
    data = {
            # "id": int(t.id),
            # "conversation_id": t.conversation_id,
            # "created_at": t.datetime,
            # "date": t.datestamp,
            # "time": t.timestamp,
            # "timezone": t.timezone,
            # "user_id": t.user_id,
            "username": t.username,
            # "name": t.name,
            # "place": t.place,
            "tweet": tweet_processed if not will_be_removed else "",
            "OriginalTweet": t.tweet,
            "sentiment": 2,
            "language": t.lang,
            "userid": t.user_id,
            "location": user_location,
            # "mentions": t.mentions,
            # "urls": t.urls,
            # "photos": t.photos,
            # "replies_count": int(t.replies_count),
            # "retweets_count": int(t.retweets_count),
            # "likes_count": int(t.likes_count),
            # "hashtags": t.hashtags,
            # "cashtags": t.cashtags,
            # "link": t.link,
            # "retweet": t.retweet,
            # "quote_url": t.quote_url,
            # "video": t.video,
            # "thumbnail": t.thumbnail,
            # "near": t.near,
            # "geo": t.geo,
            # "source": t.source,
            # "user_rt_id": t.user_rt_id,
            # "user_rt": t.user_rt,
            # "retweet_id": t.retweet_id,
            # "reply_to": t.reply_to,
            # "retweet_date": t.retweet_date,
            "translate": t.translate,
            "trans_src": t.trans_src,
            "trans_dest": t.trans_dest,
            }
    return data

def tweetFieldnames():
    fieldnames = [
            # "id",
            # "conversation_id",
            # "created_at",
            # "date",
            # "time",
            # "timezone",
            # "user_id",
            "username",
            # "name",
            # "place",
            "tweet",
            "OriginalTweet",
            "sentiment",
            "language",
            "userid",
            "location",
            # "mentions",
            # "urls",
            # "photos",
            # "replies_count",
            # "retweets_count",
            # "likes_count",
            # "hashtags",
            # "cashtags",
            # "link",
            # "retweet",
            # "quote_url",
            # "video",
            # "thumbnail",
            # "near",
            # "geo",
            # "source",
            # "user_rt_id",
            # "user_rt",
            # "retweet_id",
            # "reply_to",
            # "retweet_date",
            "translate",
            "trans_src",
            "trans_dest"
            ]
    return fieldnames

def userData(u):
    data = {
            "id": int(u.id),
            # "name": u.name,
            "username": u.username,
            # "bio": u.bio,
            "location": u.location,
            # "url": u.url,
            # "join_date": u.join_date,
            # "join_time": u.join_time,
            # "tweets": int(u.tweets),
            # "following": int(u.following),
            # "followers": int(u.followers),
            # "likes": int(u.likes),
            # "media": int(u.media_count),
            # "private": u.is_private,
            # "verified": u.is_verified,
            # "profile_image_url": u.avatar,
            # "background_image": u.background_image
            }
    return data

def userFieldnames():
    fieldnames = [
            "id",
            # "name",
            "username",
            # "bio",
            "location",
            # "url",
            # "join_date",
            # "join_time",
            # "tweets",
            # "following",
            # "followers",
            # "likes",
            # "media",
            # "private",
            # "verified",
            # "profile_image_url",
            # "background_image"
            ]
    return fieldnames

def usernameData(u):
    return {"username": u}

def usernameFieldnames():
    return ["username"]

def Data(obj, _type):
    if _type == "user":
        ret = userData(obj)
    elif _type == "username":
        ret = usernameData(obj)
    else:
        ret = tweetData(obj)

    return ret

def Fieldnames(_type):
    if _type == "user":
        ret = userFieldnames()
    elif _type == "username":
        ret = usernameFieldnames()
    else:
        ret = tweetFieldnames()

    return ret
