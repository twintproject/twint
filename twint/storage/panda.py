from time import strftime, localtime
import pandas as pd
import warnings

from .elasticsearch import *

df = None

_object_blocks = {
    "tweets": [],
    "users": [],
    "follow": []
}
_type = ""

def update(object, session):
    global _type

    try:
        _type = isinstance(object, dict)*"follow"
    except NameError:
        _type = ((object.type == "tweets")*"tweets" +
                (object.type == "users")*"users")

    if _type == "tweets":
        dt = f"{object.datestamp} {object.timestamp}"
        _data = {
            "id": object.id,
            "date": dt,
            "timezone": object.timezone,
            "location": object.location,
            "tweet": object.tweet,
            "hashtags": object.hashtags,
            "user_id": object.user_id,
            "username": object.username,
            "link": object.link,
            "retweet": object.retweet,
            "user_rt": object.user_rt,
            "essid": str(session),
            'mentions': object.mentions
            }
        _object_blocks[_type].append(_data)
    elif _type == "users":
        _data = {
            "id": object.id,
            "name": object.name,
            "username": object.username,
            "bio": object.bio,
            "location": object.location,
            "url": object.url,
            "join_datetime": object.join_date + " " + object.join_time,
            "join_date": object.join_date,
            "join_time": object.join_time,
            "tweets": object.tweets,
            "following": object.following,
            "followers": object.followers,
            "likes": object.likes,
            "media": object.media_count,
            "private": object.is_private,
            "verified": object.is_verified,
            "avatar": object.avatar,
            "session": str(session)
            }
        _object_blocks[_type].append(_data)
    elif isinstance(object, dict):
        _object_blocks[_type] = object
    else:
        print("Wrong type of object passed!")

def get():
    global df
    if df is None:
        df = pd.DataFrame(_object_blocks[_type])
    else:
        _df = pd.DataFrame(_object_blocks[_type])
        print(df)
        print(_df)
        df = pd.concat([df, _df])
    return df

def clean():
    _object_blocks["tweets"].clear()
    _object_blocks["follow"].clear()
    _object_blocks["users"].clear()


def save(_filename, _dataframe, **options):
    if options.get("dataname"):
        _dataname = options.get("dataname")
    else:
        _dataname = "twint"

    if not options.get("type"):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _store = pd.HDFStore(_filename)
            _store[_dataname] = _dataframe
            _store.close()
    elif options.get("type") == "Pickle":
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _dataframe.to_pickle(_filename)
    else:
        print("Please specify: filename, DataFrame, DataFrame name and type (HDF5, default, or Pickle")

def read(_filename, **options):
    if not options.get("dataname"):
        _dataname = "twint"
    else:
        _dataname = options.get("dataname")

    if not options.get("type"):
        _store = pd.HDFStore(_filename)
        df = _store[_dataname]
        return df
    elif options.get("type") == "Pickle":
        df = pd.read_pickle(_filename)
        return df
    else:
        print("Please specify: DataFrame, DataFrame name (twint as default), filename and type (HDF5, default, or Pickle")
