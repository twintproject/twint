# TWINT - Twitter Intelligence Tool
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
- Python 3.5/3.6
- `pip3 install -r requirements.txt`

## Installing
- **Git**: `git clone https://github.com/twintproject/twint.git`
- **Pip**: `pip3 install twint`

## Basic Examples and Combos.
A few simple examples to help you understand the basics:

- `python3 twint.py -u username` - Scrape all the Tweets from *user*'s timeline.
- `python3 twint.py -u username -s pineapple` - Scrape all Tweets from the *user*'s timeline containing _pineapple_.
- `python3 twint.py -s pineapple` - Collect every Tweet containing *pineapple* from everyone's Tweets.
- `python3 twint.py -u username --year 2014` - Collect Tweets that were tweeted **before** 2014.
- `python3 twint.py -u username --since 2015-12-20` - Collect Tweets that were tweeted since 2015-12-20.
- `python3 twint.py -u username -o file.txt` - Scrape Tweets and save to file.txt.
- `python3 twint.py -u username -o file.csv --csv` - Scrape Tweets and save as a csv file.
- `python3 twint.py -u username --fruit` - Show Tweets with low-hanging fruit.
- `python3 twint.py -s "Donald Trump" --verified` - Display Tweets by verified users that Tweeted about Donald Trump.
- `python3 twint.py -g="48.880048,2.385939,1km" -o file.csv --csv` - Scrape Tweets from a radius of 1km around a place in Paris and export them to a csv file.
- `python3 twint.py -u username -es localhost:9200` - Output Tweets to Elasticsearch
- `python3 twint.py -u username -o file.json --json` - Scrape Tweets and save as a json file.
- `python3 twint.py -u username --database tweets.db` - Save Tweets to a SQLite database.
- `python3 twint.py -u username --followers` - Scrape a Twitter user's followers.
- `python3 twint.py -u username --following` - Scrape who a Twitter user follows.
- `python3 twint.py -u username --favorites` - Collect all the Tweets a user has favorited.
- `python3 twint.py -u username --following --user-full` - Collect full user information a person follows
- `python3 twint.py -u username --profile-full` - Use a slow, but effective method to gather all the Tweets from a user's profile (Including Retweets).
- `python3 twint.py -u username --retweets` - Use a quick method to gather the last 900 Tweets (that includes retweets) from a user's profile.
- `python3 twint.py -u username --resume 10940389583058` - Resume a search starting from the specified Tweet ID.

More detail about the commands and options are located in the [wiki](https://github.com/twintproject/twint/wiki/Commands)

## Using Twint as a Module (Recommended)
Twint can now be used as a module and supports custom formatting. **More details are located in the [wiki](https://github.com/twintproject/twint/wiki/Module)**

#### Example
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
## Example String
`955511208597184512 2018-01-22 18:43:19 GMT <now> pineapples are the best fruit`

## Storing Options
- Write to file.
- CSV
- JSON
- SQLite
- Mysql (DB collation utf8mb4)
- Elasticsearch

### Elasticsearch Setup

Details on setting up Elasticsearch with Twint is located in the [wiki](https://github.com/twintproject/twint/wiki/Elasticsearch). 

### Graph Visualization
![graph](https://i.imgur.com/EEJqB8n.png)

[Graph](https://github.com/twintproject/twint/tree/master/graph) details are also located in the [wiki](https://github.com/twintproject/twint/wiki/Graph). 

We are testing a (free) graph plugin for Kibana, details located in the Wiki!

## Contact

If you have any questions, want to join in on discussions, or need extra help, you are welcome to join our OSINT focused [Slack server](https://os-int.slack.com/join/shared_invite/enQtMzc4NzY5ODI3NDI3LWRlOGNhN2U3OTUwY2Q1OTk5MDI2YjliOWQ1OTI5NzAyZjc0MDhiYTQ3NTY4MjMxY2E0MTRhOTVlN2M0ZmJhMjI).
