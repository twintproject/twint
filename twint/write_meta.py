def tweetData(t):
    data = {
            "id": int(t.id),
            "date": t.datestamp,
            "time": t.timestamp,
            "timezone": t.timezone,
            "user_id": int(t.user_id),
            "username": t.username,
            "tweet": t.tweet,
            "replies": int(t.replies),
            "retweets": int(t.retweets),
            "likes": int(t.likes),
            "location": t.location,
            "hashtags": ",".join(t.hashtags),
            "link": t.link,
            "retweet": t.retweet,
            "user_rt": t.user_rt,
            "mentions": ",".join(t.mentions)
            }
    return data

def tweetFieldnames():
    fieldnames = [
            "id",
            "date",
            "time",
            "timezone",
            "user_id",
            "username",
            "tweet",
            "replies",
            "retweets",
            "likes",
            "location",
            "hashtags",
            "link",
            "retweet",
            "user_rt",
            "mentions"
            ]
    return fieldnames

def userData(u):
    data = {
            "id": int(u.id),
            "name": u.name,
            "username": u.username,
            "bio": u.bio,
            "location": u.location,
            "url": u.url,
            "join_date": u.join_date,
            "join_time": u.join_time,
            "tweets": int(u.tweets),
            "following": int(u.following),
            "followers": int(u.followers),
            "likes": int(u.likes),
            "media": int(u.media_count),
            "private": u.is_private,
            "verified": u.is_verified,
            "avatar": u.avatar
            }
    return data

def userFieldnames():
    fieldnames = [
            "id",
            "name",
            "username",
            "bio",
            "location",
            "url",
            "join_date",
            "join_time",
            "tweets",
            "following",
            "followers",
            "likes",
            "media",
            "private",
            "verified",
            "avatar"
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
