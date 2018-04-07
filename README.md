# tweep
![Version](https://img.shields.io/badge/Version-1.0-blue.svg) [![Build Status](https://travis-ci.org/haccer/tweep.svg?branch=master)](https://travis-ci.org/haccer/tweep/) [![Python 3.5|3.6](https://img.shields.io/badge/Python-3.5%2F3.6-blue.svg)](https://www.python.org/download/releases/3.0/) [![GitHub license](https://img.shields.io/github/license/haccer/tweep.svg)](https://github.com/haccer/tweep/blob/master/LICENSE)

Tweep is an advanced Twitter scraping tool written in Python that allows for scraping Tweets from Twitter profiles **without** using Twitter's API.

Tweep utilizes Twitter's search operators to let you scrape Tweets from specific users, scrape Tweets relating to certain topics, hashtags & trends, or sort out *sensitive* information from Tweets like e-mail and phone numbers. I find this very useful, and you can get really creative with it too.

## tl;dr Benefits
Some of the benefits of using Tweep vs Twitter API:
- Can fetch almost __all__ Tweets (Twitter API limits to last 3200 Tweets only)
- Fast initial setup
- Can be used anonymously and without sign up
- No rate limitations

## Requirements
- Python 3.5/3.6
- `pip3 install -r requirements.txt`

## Options
Command|Usage
-------|-----------
`-u`|The user's Tweets you want to scrape.
`-s`|Search for Tweets containing this word or phrase.
`-g`|Retrieve tweets by geolocation. Format of the argument is lat,lon,range(km or mi).
`-o`|Save output to a file.
`-es`|Output to Elasticsearch
`--year`|Filter Tweets before the specified year. 
`--fruit`|Display Tweets with "low-hanging-fruit".
`--tweets`|Display Tweets only.
`--verified`|Display Tweets only from verified users (Use with `-s`).
`--users`|Display users only (Use with `-s`).
`--csv`|Write as a .csv file.
`--json`|Write as a .json file.
`--hashtags`|Extract hashtags.
`--userid`|Search from Twitter user's ID.
`--limit`|Number of Tweets to pull (Increments of 20).
`--count`|Display number Tweets scraped at the end of session.
`--stats`|Show number of replies, retweets, and likes.
`--database`|Store Tweets in a SQLite database
`-l`|Serch for Tweets in a specific language

## Low-Hanging Fruit
The `--fruit` feature will display Tweets that *might* contain sensitive info such as:
- Profiles from leaked databases (Myspace or LastFM)
- Email addresses
- Phone numbers
- Keybase.io profiles

## Basic Examples and Combos.
A few simple examples to help you understand the basics:

- `python3 tweep.py -u username` - Scrape all the Tweets from *user*'s timeline.
- `python3 tweep.py -u username -s pineapple` - Scrape all Tweets from the *user*'s timeline containing _pineapple_.
- `python3 tweep.py -s pineapple` - Collect every Tweet containing *pineapple* from everyone's Tweets.
- `python3 tweep.py -u username --year 2014` - Collect Tweets that were tweeted **before** 2014.
- `python3 tweep.py -u username --since 2015-12-20` - Collect Tweets that were tweeted since 2015-12-20.
- `python3 tweep.py -u username -o file.txt` - Scrape Tweets and save to file.txt.
- `python3 tweep.py -u username -o file.csv --csv` - Scrape Tweets and save as a csv file.
- `python3 tweep.py -u username --fruit` - Show Tweets with low-hanging fruit.
- `python3 tweep.py -s "Donald Trump" --verified --users` - List verified users that Tweet about Donald Trump.
- `python3 tweep.py -g="48.880048,2.385939,1km" -o file.csv --csv` - Scrape Tweets from a radius of 1km around a place in Paris and export them to a csv file.
- `python3 tweep.py -u username -es localhost:9200` - Output Tweets to Elasticsearch
- `python3 tweep.py -u username -o file.json --json` - Scrape Tweets and save as a json file.
- `python3 tweep.py -u username --database tweets.db` - Save Tweets to a SQLite database.

## Example String
`955511208597184512 2018-01-22 18:43:19 GMT <now> pineapples are the best fruit`

## Screenshot
<img src="https://i.imgur.com/RKdBrHr.png" />

## Elasticsearch Setup
![dashboard](https://i.imgur.com/BEbtdo5.png)

Moved to the wiki.

If you have problems don't hesitate to write us or open an issue.
Feel free to edit the dashboard and don't hesitate to share it if you want.

## Thanks
Thanks to [@hpiedcoq](https://github.com/hpiedcoq) & [@pielco11](https://github.com/pielco11) for contributing several features!

## Contact
Shout me out on Twitter: [@now](https://twitter.com/now)
