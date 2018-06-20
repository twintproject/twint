from .elasticsearch import *
from time import strftime, localtime
import pandas as pd
import warnings

_blocks = []

def update(Tweet, session):
    day = weekday(strftime("%A", localtime(Tweet.datetime)))
    dt = f"{Tweet.datestamp} {Tweet.timestamp}"

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
                "essid": str(session),
                'mentions': Tweet.mentions
                }
    _blocks.append(_data)

def get():
    df = pd.DataFrame(_blocks)
    return df

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
        _dataname = "Twint"

    if not options.get("type"):
        _store = pd.HDFStore(_filename)
        df = _store[_dataname]
        return df
    elif options.get("type") == "Pickle":
        df = pd.read_pickle(_filename)
        return df
    else:
        print("Please specify: DataFrame, DataFrame name (twint as default), filename and type (HDF5, default, or Pickle")
