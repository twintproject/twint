#!/usr/bin/env python
from bs4 import BeautifulSoup
from time import gmtime, strftime
import argparse
import datetime
import json
import re
import requests

class tweep:
    def __init__(self):
        self.min    = -1
        self.author = arg.u
        self.search = arg.s
        self.year   = arg.year
        self.feed   = [-1]
        self.tweets = 0

    def get_url(self):
        url_1 = "https://twitter.com/search?f=tweets&vertical=default&lang=en&q="
        url_2 = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
        url_2 +="&lang=en&include_available_features=1&include_entities=1&reset_error_state=false&src=typd"
        url = url_1 if self.min == -1 else "{0}&max_position={1.min}&q=".format(url_2, self)
        if self.author != None:
            url+= "from%3A{0.author}".format(self)
        if self.search != None:
            url+= "%20{0.search}".format(self)
        if self.year != None:
            url+= "%20until%3A{0.year}-1-1".format(self)
        if arg.fruit:
            url+="%20myspace.com%20OR%20last.fm%20OR%20mail%20OR%20email%20OR%20gmail"
        return url

    def get_feed(self):
        r = requests.get(self.get_url(),headers=agent)
        self.feed = []
        try:
            if self.min == -1:
                html = r.text
            else:
                json_response = json.loads(r.text)
                html = json_response['items_html']
            soup = BeautifulSoup(html,"lxml")
            self.feed = soup.find_all('li','js-stream-item')
            lastid = self.feed[-1]['data-item-id']
            firstid = self.feed[0]['data-item-id']
            if self.min == -1:
                self.min = "TWEET-{}-{}".format(lastid,firstid)
            else:
                minsplit = json_response['min_position'].split('-')
                minsplit[1] = lastid
                self.min = "-".join(minsplit)
        except: pass
        return self.feed

    def get_tweets(self):
        for tweet in self.get_feed():
            self.tweets += 1
            tweetid = tweet['data-item-id']
            datestamp = tweet.find('a','tweet-timestamp')['title'].rpartition(' - ')[-1]
            d = datetime.datetime.strptime(datestamp, '%d %b %Y')
            date = d.strftime('%Y-%m-%d')
            timestamp = str(datetime.timedelta(seconds=int(tweet.find('span','_timestamp')['data-time']))).rpartition(', ')[-1]
            t = datetime.datetime.strptime(timestamp,'%H:%M:%S')
            time = t.strftime('%H:%M:%S')
            username = tweet.find('span','username').text.encode('utf8').replace('@','')
            timezone = strftime("%Z", gmtime())
            text = tweet.find('p','tweet-text').text.encode('utf8').replace('\n',' ')
            print("{} {} {} {} <{}> {}".format(tweetid, date, time, timezone, username, text))

    def main(self):
        while True if (self.tweets < float('inf')) and len(self.feed)>0 else False:
            self.get_tweets()

if __name__ == '__main__':
    ap = argparse.ArgumentParser(prog='tweep.py',usage='python %(prog)s [options]',description="tweep.py - An Advanced Twitter Scraping Tool")
    ap.add_argument('-u',help="User's tweets you want to scrape.")
    ap.add_argument('-s',help='Search for tweets containing this word or phrase.')
    ap.add_argument('--year',help='Filter tweets before specified year.')
    ap.add_argument('--fruit',help='Display "low-hanging-fruit" tweets.',action='store_true')
    arg = ap.parse_args()
    agent = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}
    tweep().main()
