# tweep
[![Python 2.6|2.7](https://img.shields.io/badge/python-2.6|2.7-yellow.svg)](https://www.python.org/)

Tweep is an advanced Twitter scraping tool written in python that allows for scraping Tweets and pictures from Twitter profiles **without** using Twitter's API.

## Benefits
Some of the benefits of using Tweep vs Twitter API:
- Fast initial setup
- Can be used anonymously
- No rate limitations
- Can fetch __all__ Tweets (Twitter API limits to last 3200 Tweets)

## Requirements
- BeautifulSoup4 `pip install beautifulsoup4`
- Image `pip install image`
- Requests `pip install requests`
- Insall all `pip install -r requirements.txt`

## Usage
- `-u` The user's Tweets you want to scrape.
- `-s` Search for Tweets containing this word or phrase.
- `--year` Filter tweets before the specified year. 
- `--pics` Download all the pictures from Tweets.
- `--fruit` Display Tweets with "low-hanging-fruit".
- `--tweets` Display Tweets only.
- `--verified` Display Tweets only from verified users (Use with `-s`).
- `--users` Display users only (Use with `-s`).

## Low-Hanging Fruit
The `--fruit` feature will display Tweets that *might* contain sensitive info such as:
- Profiles from leaked databases (Myspace or LastFM)
- Email addresses
- Phone numbers

## Basic Examples and Combos.
A few simple examples to help you understand the basics:

- `python tweep.py -u username` - Scrape all the Tweets from *user*'s timeline.
- `python tweep.py -u username -s pineapple` - Scrape all Tweets from the *user*'s timeline containing _pineapple_.
- `python tweep.py -s pineapple` - Collect every Tweet containing *pineapple* from everyone's Tweets.
- `python tweep.py -u username --year 2014` - Collect Tweets that were tweeted **before** 2014.
- `python tweep.py -u username --pics` - Download all pictures from *user*'s timeline.
- `python tweep.py -u username --fruit` - Show Tweets with low-hanging fruit.
- `python tweep.py -s "Donald Trump" --verified --users` - List verified users that Tweet about Donald Trump.

## Example String
`881653591265746945 2017-07-02 23:19:31 UTC <dqt> i need to drink more water`
