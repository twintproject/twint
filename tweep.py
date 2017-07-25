#!/usr/bin/env python
from bs4 import BeautifulSoup
from time import gmtime, strftime
from PIL import Image
from io import BytesIO
import argparse
import datetime
import json
import os
import Queue
import re
import requests
import sys
import threading

q = Queue.Queue()

class tweep:
    def __init__(self):
        self.min = -1
        self.author = arg.u
        self.search = arg.s
        self.year = arg.year
        self.feed = [-1]
        self.tweets = 0
        self.tweet_urls = []
        self.pic_count = 0

    def get_url(self):
        url_1 = "https://twitter.com/search?f=tweets&vertical=default&lang=en&q="
        url_2 = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
        url_2 +="&lang=en&include_available_features=1&include_entities=1&reset_error_state=false&src=typd"
        url = url_1 if self.min == -1 else "{0}&max_position={1.min}&q=".format(url_2, self)
        if self.author != None:
            url+= "from%3A{0.author}".format(self)
        if self.search != None:
            search = self.search.replace(' ','%20').replace('#','%23')
            url+= "%20{}".format(search)
        if self.year != None:
            url+= "%20until%3A{0.year}-1-1".format(self)
        if arg.pics:
            url+= "%20filter%3Aimages"
        if arg.fruit:
            url+= "%20myspace.com%20OR%20last.fm%20OR"
            url+= "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
            url+= "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
        if arg.verified:
            url+= "%20filter%3Averified"
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
            if arg.pics:
                tweet_url = "https://twitter.com/{0}/status/{1}/photo/1".format(username,tweetid)
                self.tweet_urls.append(tweet_url)
            else:
                if arg.users:
                    print(username)
                elif arg.tweets:
                    print(text)
                else:
                    print("{} {} {} {} <{}> {}".format(tweetid, date, time, timezone, username, text))

    def save_pic(self,picture):
        if not os.path.exists('tweep_img'):
            os.makedirs('tweep_img')
        if not os.path.exists('tweep_img/{0.author}'.format(self)):
            os.makedirs('tweep_img/{0.author}'.format(self))
        filename = picture[len('https://pbs.twimg.com/media/'):]
        save_dir = 'tweep_img/{0.author}'.format(self)
        if not os.path.isfile('{}/{}'.format(save_dir,filename)):
            r = requests.get(picture,headers=agent)
            i = Image.open(BytesIO(r.content))
            i.save(os.path.join(save_dir, filename))
            print("  Downloading: {}".format(filename))
            self.pic_count += 1

    def get_pics(self,tweet_url):
        r = requests.get(tweet_url,headers=agent)
        soup = BeautifulSoup(r.text,"lxml")
        picture = soup.find('div','AdaptiveMedia-photoContainer js-adaptive-photo ')
        if picture is not None:
            picture = picture['data-image-url'].replace(' ','')
            self.save_pic(picture)

    def fetch_pics(self):
        while True:
            tweet_url = q.get()
            self.get_pics(tweet_url)
            q.task_done()

    def main(self):
        if arg.pics:
            print("[+] Searching Tweets For Photos.")
        while True if (self.tweets < float('inf')) and len(self.feed)>0 else False:
            self.get_tweets()
        if arg.pics:
            total = len(self.tweet_urls) - 1
            print("[+] {} pictures found. Collecting Pictures.".format(total))
            for i in range(10):
                t = threading.Thread(target=self.fetch_pics)
                t.daemon = True
                t.start()
            for tweet_url in self.tweet_urls:
                q.put(tweet_url)
            q.join()
            print("[+] Done. {t.pic_count} pictures saved from {t.author}.".format(t=self))

def check():
    if arg.u is not None:
        if arg.users:
            print("Please use --users in combination with -s.")
            sys.exit(0)
        if arg.verified:
            print("Please use --verified in combination with -s.")
            sys.exit(0)
    if arg.tweets and arg.users:
        print("--users and --tweets cannot be used together.")
        sys.exit(0)

if __name__ == '__main__':
    agent = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}
    ap = argparse.ArgumentParser(prog='tweep.py',usage='python %(prog)s [options]',description="tweep.py - An Advanced Twitter Scraping Tool")
    ap.add_argument('-u',help="User's tweets you want to scrape.")
    ap.add_argument('-s',help='Search for tweets containing this word or phrase.')
    ap.add_argument('--year',help='Filter tweets before specified year.')
    ap.add_argument('--pics',help='Save pictures.',action='store_true')
    ap.add_argument('--fruit',help='Display "low-hanging-fruit" tweets.',action='store_true')
    ap.add_argument('--tweets',help='Display tweets only.',action='store_true')
    ap.add_argument('--verified',help='Display Tweets only from verified users (Use with -s).',action='store_true')
    ap.add_argument('--users',help='Display users only (Use with -s).',action='store_true')
    arg = ap.parse_args()
    check()
    tweep().main()
