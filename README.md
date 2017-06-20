# tweep
[![Python 2.6|2.7](https://img.shields.io/badge/python-2.6|2.7-yellow.svg)](https://www.python.org/)

Tweep is an advanced Twitter scraping tool written in python that allows for scraping Tweets and pictures from Twitter profiles **without** using Twitter's API.
## Requirements
- BeautifulSoup4 `pip install beautifulsoup4`

## Usage
- `-u` The user's Tweets you want to scrape.
- `-s` Search for Tweets containing this word or phrase.
- `--year` Filter tweets before the specified year. 
- `--pics` Download all the pictures from Tweets.
- `--fruit` Display Tweets with "low-hanging-fruit"

## Examples and Combos.
These are just a few examples to help you understand how everything works. You can mix and match each feature to your liking.


    python tweep.py -u username
This will scrape all the Tweets from that user's timeline.

	python tweep.py -u username -s pineapple
This will scrape all Tweets that contain the word pineapple from the user's timeline.

	python tweep.py -s pineapple
This will collect every Tweet that contains the word pineapple from everyone's Tweets.

	python tweep.py -u username --year 2014
This will collect Tweets that were tweeted **before** 2014.

	python tweep.py -u username --pics
This collects all the Tweets that have pictures in the user's timeline and downloads them.

	python tweep.py -u username --fruit
This searches for Tweets that *might* contain MySpace/LastFM profiles, emails, and/or phone numbers.

