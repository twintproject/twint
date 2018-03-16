# pyTweep


pyTweep is an advanced Twitter scraping tool written in Python that allows for scraping Tweets from Twitter profiles **without** using Twitter's API. It is based on tweep (see: https://github.com/haccer/tweep)

pyTweep utilizes Twitter's search operators to let you scrape Tweets from specific users, scrape Tweets relating to certain topics, hashtags & trends, or sort out *sensitive* information from Tweets like e-mail and phone numbers. I find this very useful, and you can get really creative with it too. What is different about it and tweep is it is built for import in python, and doesn't need to interface with bash. Rather than outputting to a .csv it outputs a pandas data frame and can iterate through python iterables, i.e. lists of user names and search terms. pyTweepTor utilises Tor_Crawler to anonymise request by routing them through tor, as well as randomly changing user agent headers, for incresed anti-detection capabilities.

## tl;dr Benefits
Some of the benefits of using pyTweep vs Twitter API:
- Can fetch almost __all__ Tweets (Twitter API limits to last 3200 Tweets only)
- Fast initial setup
- Can be used anonymously and without sign up
- No rate limitations
-compared to tweep.py pyTweep runs entirely in python and supports installation as a python package. It can also accept iterables (lists) as inputs for 'user_names' and 'search_terms' meaning any iteration that is desired can be handled within python
-pyTweepTor supports ip anonymization relying on Tor_Crawler, as well as user agent randomization, though it does not use asynchronous requests so may be slower than tweep or pyTweep

## Requirements
- Python 3.5/3.6
- `pip3 install -r requirements.txt`
PyTweepTor requries  tor be installed and running in the background, see: https://github.com/alex-miller-0/Tor_Crawler

## Installation
- git clone https://github.com/cbjrobertson/pytweep
- cd pytweep
- python setup.py install


## Low-Hanging Fruit
The `fruit = True` feature will display Tweets that *might* contain sensitive info such as:
- Profiles from leaked databases (Myspace or LastFM)
- Email addresses
- Phone numbers
- Keybase.io profiles

## Usage
from pyTweep.pyTweep import pyTweep
-for first 20 tweets on the feed of twitter user 'christianbok' containing the term 'palindrome'
`Tweep(user_names = ['christianbok'],search_terms=['palindrome'],limit=20)`
-for full functionality, see: https://github.com/haccer/tweep. Argument names are slightly different but the correspondence should be self-explanatory.


## Thanks
Thanks to [@haccer] https://github.com/haccer, for basically building the whole thing!

