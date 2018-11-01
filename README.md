# TWINT - Twitter Intelligence Tool
![2](https://i.imgur.com/iaH3s7z.png)
![3](https://i.imgur.com/hVeCrqL.png)

[![PyPI](https://img.shields.io/pypi/v/twint.svg)](https://pypi.org/project/twint/) [![Build Status](https://travis-ci.org/haccer/twint.svg?branch=master)](https://travis-ci.org/haccer/twint/) [![Python 3.5|3.6](https://img.shields.io/badge/Python-3.5%2F3.6-blue.svg)](https://www.python.org/download/releases/3.0/) [![GitHub license](https://img.shields.io/github/license/haccer/tweep.svg)](https://github.com/haccer/tweep/blob/master/LICENSE)

>No authentication. No API. No limits.

Formerly known as Tweep, Twint is an advanced Twitter scraping tool written in Python that allows for scraping Tweets from Twitter profiles **without** using Twitter's API.

Twint utilizes Twitter's search operators to let you scrape Tweets from specific users, scrape Tweets relating to certain topics, hashtags & trends, or sort out *sensitive* information from Tweets like e-mail and phone numbers. I find this very useful, and you can get really creative with it too.

Twint also makes special queries to Twitter allowing you to also scrape a Twitter user's followers, Tweets a user has liked, and who they follow **without** any authentication, API, Selenium, or browser emulation.

## tl;dr Benefits
Some of the benefits of using Twint vs Twitter API:
- Can fetch almost __all__ Tweets (Twitter API limits to last 3200 Tweets only)
- Fast initial setup
- Can be used anonymously and without Twitter sign up
- **No rate limitations**

## Requirements
- Python 3.6
- `pip3 install -r requirements.txt`

## Installing
- **Git**: `git clone https://github.com/twintproject/twint.git`
- **Pip**: `pip3 install --upgrade -e git+https://github.com/twintproject/twint.git@origin/master#egg=twint`

## CLI Basic Examples and Combos
A few simple examples to help you understand the basics:

- `python3 Twint.py -u username` - Scrape all the Tweets from *user*'s timeline.
- `python3 Twint.py -u username -s pineapple` - Scrape all Tweets from the *user*'s timeline containing _pineapple_.
- `python3 Twint.py -s pineapple` - Collect every Tweet containing *pineapple* from everyone's Tweets.
- `python3 Twint.py -u username --year 2014` - Collect Tweets that were tweeted **before** 2014.
- `python3 Twint.py -u username --since 2015-12-20` - Collect Tweets that were tweeted since 2015-12-20.
- `python3 Twint.py -u username -o file.txt` - Scrape Tweets and save to file.txt.
- `python3 Twint.py -u username -o file.csv --csv` - Scrape Tweets and save as a csv file.
- `python3 Twint.py -u username --fruit` - Show Tweets with low-hanging fruit.
- `python3 Twint.py -s "Donald Trump" --verified` - Display Tweets by verified users that Tweeted about Donald Trump.
- `python3 Twint.py -g="48.880048,2.385939,1km" -o file.csv --csv` - Scrape Tweets from a radius of 1km around a place in Paris and export them to a csv file.
- `python3 Twint.py -u username -es localhost:9200` - Output Tweets to Elasticsearch
- `python3 Twint.py -u username -o file.json --json` - Scrape Tweets and save as a json file.
- `python3 Twint.py -u username --database tweets.db` - Save Tweets to a SQLite database.
- `python3 Twint.py -u username --followers` - Scrape a Twitter user's followers.
- `python3 Twint.py -u username --following` - Scrape who a Twitter user follows.
- `python3 Twint.py -u username --favorites` - Collect all the Tweets a user has favorited.
- `python3 Twint.py -u username --following --user-full` - Collect full user information a person follows
- `python3 Twint.py -u username --profile-full` - Use a slow, but effective method to gather Tweets from a user's profile (Gathers ~3200 Tweets, Including Retweets).
- `python3 Twint.py -u username --retweets` - Use a quick method to gather the last 900 Tweets (that includes retweets) from a user's profile.
- `python3 Twint.py -u username --resume 10940389583058` - Resume a search starting from the specified Tweet ID.

More detail about the commands and options are located in the [wiki](https://github.com/twintproject/twint/wiki/Commands)

## Module Example

Twint can now be used as a module and supports custom formatting. **More details are located in the [wiki](https://github.com/twintproject/twint/wiki/Module)**

```python
import twint

# Configure
c = twint.Config()
c.Username = "now"
c.Search = "pineapple"
c.Format = "Tweet id: {id} | Tweet: {tweet}"

# Run
twint.run.Search(c)
```
> Output

`955511208597184512 2018-01-22 18:43:19 GMT <now> pineapples are the best fruit`

```python
import twint

c = twint.Config()

c.Username = "noneprivacy"
c.Custom["tweet"] = ["id"]
c.Custom["user"] = ["bio"]
c.Limit = 10
c.Store_csv = True
c.Output = "none"

twint.run.Search(c)
```

## Storing Options
- Write to file
- CSV
- JSON
- SQLite
- Elasticsearch

## Elasticsearch Setup

Details on setting up Elasticsearch with Twint is located in the [wiki](https://github.com/twintproject/twint/wiki/Elasticsearch).

## Graph Visualization
![graph](https://i.imgur.com/EEJqB8n.png)

[Graph](https://github.com/twintproject/twint/tree/master/graph) details are also located in the [wiki](https://github.com/twintproject/twint/wiki/Graph).

We are developing a Twint Desktop App.

![4](https://i.imgur.com/DzcfIgL.png)

## FAQ
> While scraping tweets and saving them to a database, I want also save users infos

Pass `--user-info` to CLI, or specify `c.User_info = True` if you are using Twint as module.

> I tried scraping tweets from a user, I know that they exist but I'm not getting them

Twitter can shadow-ban accounts, which means that their tweets will not be available via search. To solve this, pass `--profile-full` if you are using Twint via CLI or, if are using Twint as module, add `config.Profile_full = True`. Please note that this process will be quite slow.
## More Examples

#### Followers/Following

> To get only follower usernames/following usernames

`python Twint.py -u username --followers`

`python Twint.py -u username --following`

> To get user info of followers/following users

`python Twint.py -u username --followers --user-full`

`python Twint.py -u username --following --user-full`

#### userlist

> To get only user info of user

`python Twint.py -u username --user-full`

> To get user info of users from a userlist

`python Twint.py --userlist inputlist --user-full`

#### Only tweets without user info

> To get only tweets without user info

`python Twint.py -u username --profile-full`  or `set c.User_info = False`

`python Twint.py -u username`  or `set c.User_info = False`

#### Tweets with user info works ONLY with a Database (currently)

> To get tweets along with user info of users mentioned in tweet/replied to

`python Twint.py -u username --user-info -db database.db`

`python Twint.py -u username --profile-full --user-info -db database.db`

## Contact

If you have any questions, want to join in on discussions, or need extra help, you are welcome to join our OSINT focused [Slack server](https://join.slack.com/t/os-int/shared_invite/enQtNDI1MDA2OTg4MDg0LWUxYWNmMjI2MGFlMTZjZjhmOWY1ZTVhNmFiMDU2NzY1MzhiMDI2ZTZmYmEwY2MxY2YzMGFkZTY2MTcxZWI2ODM).
