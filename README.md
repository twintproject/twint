# tweep
[![Build Status](https://travis-ci.org/haccer/tweep.svg?branch=master)](https://travis-ci.org/haccer/tweep/) [![Python 3.5|3.6](https://img.shields.io/badge/Python-3.5%2F3.6-blue.svg)](https://www.python.org/download/releases/3.0/) [![GitHub license](https://img.shields.io/github/license/haccer/tweep.svg)](https://github.com/haccer/tweep/blob/master/LICENSE)

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

## Usage
- `-u` The user's Tweets you want to scrape.
- `-s` Search for Tweets containing this word or phrase.
- `-o` Save output to a file.
- `--year` Filter Tweets before the specified year. 
- `--fruit` Display Tweets with "low-hanging-fruit".
- `--tweets` Display Tweets only.
- `--verified` Display Tweets only from verified users (Use with `-s`).
- `--users` Display users only (Use with `-s`).
- `--csv` Write as a .csv file.
- `--hashtags` Extract hashtags.

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

## Example String
`955511208597184512 2018-01-22 18:43:19 GMT <now> pineapples are the best fruit`

## Screenshot
<img src="https://i.imgur.com/RKdBrHr.png" />

## Changelog
### 1/21/18
- Added:
    - `Python3` update and rewriten using asyncio. Fetching Tweets should be a lot more faster naturally. 
    - `Output` can be saved.
    - `Replies` are now visible in the scrapes.
 - Removed:
    - `Pics` feature, I'll re-add this on a later date.

## Contact
Shout me out on Twitter: [@now](https://twitter.com/now)
