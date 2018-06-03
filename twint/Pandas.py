import pandas as pd
from time import strftime, localtime

from .elasticsearch import *

_blocks = []


def update(Tweet, session):
    day = weekday(strftime("%A", localtime(Tweet.datetime)))
    dt = "{} {}".format(Tweet.datestamp, Tweet.timestamp)

    _data = {
                "id": Tweet.id,
                "date": dt,
                "timezone": Tweet.timezone,
                "location": Tweet.location,
                "tweet": Tweet.tweet,
                "hashtags": Tweet.hashtags,
                "user_id": Tweet.user_id,
                "username": Tweet.username,
                "day": day,
                "hour": hour(Tweet.datetime),
                "link": Tweet.link,
                "retweet": Tweet.retweet,
                "user_rt": Tweet.user_rt,
                "essid": str(session)
                }
    _blocks.append(_data)

def get():
    df = pd.DataFrame(_blocks)
    return df

def save(_dataframe, _dataname, _filename, _type):
    if not _dataname:
        _dataname = "twint"

    if not _type or _type == "HDF5":
        _store = pd.HDFStore(_filename)
        _store[_dataname] = _dataframe
    elif _type == "Pickle":
        _dataframe.to_pickle(_filename)
    else:
        print("Please specify: DataFrame, DataFrame name, filename and type (HDF5, default, or Pickle")

def read(_dataframe, _dataname, _filename, _type):
    if not _dataname:
        _dataname = "Twint"

    if not _type or _type == "HDF5":
        _store = pd.HDFStore(_filename)
        df = _store[_dataname]
        return df
    elif _type == "Pickle":
        df = pd.read_pickle(_filename)
        return df
    else:
        print("Please specify: DataFrame, DataFrame name (twint as default), filename and type (HDF5, default, or Pickle")
