from . import datelock, feed, get, output, verbose, storage
from asyncio import get_event_loop
from datetime import timedelta, datetime
from .storage import db

#import logging

class Twint:
    def __init__(self, config):
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+__init__')
        if config.Resume is not None and config.TwitterSearch:
            self.init = f"TWEET-{config.Resume}-0"
        else:
            self.init = -1

        self.feed = [-1]
        self.count = 0
        self.user_agent = ""
        self.config = config
        self.conn = db.Conn(config.Database)
        self.d = datelock.Set(self.config.Until, self.config.Since)
        verbose.Elastic(config.Elasticsearch)

        if self.config.Store_object:
            output.clean_follow_list()

        if self.config.Pandas_clean:
            storage.panda.clean()

        if not self.config.Timedelta:
            if (self.d._until - self.d._since).days > 30:
                self.config.Timedelta = 30
            else:
                self.config.Timedelta = (self.d._until - self.d._since).days

    async def Feed(self):
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+Feed')
        consecutive_errors_count = 0
        while True:
            response = await get.RequestUrl(self.config, self.init, headers=[("User-Agent", self.user_agent)])
            if self.config.Debug:
                print(response, file=open("twint-last-request.log", "w", encoding="utf-8"))

            self.feed = []
            try:
                if self.config.Favorites:
                    self.feed, self.init = feed.Mobile(response)
                elif self.config.Followers or self.config.Following:
                    self.feed, self.init = feed.Follow(response)
                elif self.config.Profile:
                    if self.config.Profile_full:
                        self.feed, self.init = feed.Mobile(response)
                    else:
                        self.feed, self.init = feed.profile(response)
                elif self.config.TwitterSearch:
                    self.feed, self.init = feed.Json(response)
                break
            except Exception as e:
                # Sometimes Twitter says there is no data. But it's a lie.
                consecutive_errors_count += 1
                if consecutive_errors_count < self.config.Retries_count:
                    # Change disguise
                    self.user_agent = await get.RandomUserAgent()
                    continue
                print(str(e) + " [x] run.Feed")
                print("[!] if get this error but you know for sure that more tweets exist, please open an issue and we will investigate it!")
                break

    async def follow(self):
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+follow')
        await self.Feed()
        if self.config.User_full:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for user in self.feed:
                self.count += 1
                username = user.find("a")["name"]
                await output.Username(username, self.config, self.conn)

    async def favorite(self):
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+favorite')
        await self.Feed()
        self.count += await get.Multi(self.feed, self.config, self.conn)

    async def profile(self):
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+profile')
        await self.Feed()
        if self.config.Profile_full:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, "", self.config, self.conn)

    async def tweets(self):
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+tweets')
        await self.Feed()
        if self.config.Location:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, "", self.config, self.conn)

    async def main(self):
        self.user_agent = await get.RandomUserAgent()
        #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+main')
        if self.config.User_id is not None:
            self.config.Username = await get.Username(self.config.User_id)

        if self.config.Username is not None:
            url = f"http://twitter.com/{self.config.Username}?lang=en"
            self.config.User_id = await get.User(url, self.config, self.conn, True)

        if self.config.TwitterSearch and self.config.Since and self.config.Until:
            _days = timedelta(days=int(self.config.Timedelta))
            while self.d._since < self.d._until:
                self.config.Since = str(self.d._until - _days)
                self.config.Until = str(self.d._until)
                if len(self.feed) > 0:
                    await self.tweets()
                else:
                    self.d._until = self.d._until - _days
                    self.feed = [-1]

                #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+main+CallingGetLimit1')
                if get.Limit(self.config.Limit, self.count):
                    self.d._until = self.d._until - _days
                    self.feed = [-1]
        else:
            while True:
                if len(self.feed) > 0:
                    if self.config.Followers or self.config.Following:
                        await self.follow()
                    elif self.config.Favorites:
                        await self.favorite()
                    elif self.config.Profile:
                        await self.profile()
                    elif self.config.TwitterSearch:
                        await self.tweets()
                else:
                    break

                #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+main+CallingGetLimit2')
                if get.Limit(self.config.Limit, self.count):
                    break

        if self.config.Count:
            verbose.Count(self.count, self.config)

def run(config):
    #logging.info("[<] " + str(datetime.now()) + ':: run+run')
    get_event_loop().run_until_complete(Twint(config).main())

def Favorites(config):
    #logging.info("[<] " + str(datetime.now()) + ':: run+Favorites')
    config.Favorites = True
    run(config)

def Followers(config):
    #logging.info("[<] " + str(datetime.now()) + ':: run+Followers')
    output.clean_follow_list()
    config.Followers = True
    config.Following = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("followers")
        if config.User_full:
            storage.panda._autoget("user")
    if config.Pandas:
        storage.panda.clean()

def Following(config):
    #logging.info("[<] " + str(datetime.now()) + ':: run+Following')
    output.clean_follow_list()
    config.Following = True
    config.Followers = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("following")
        if config.User_full:
            storage.panda._autoget("user")
    if config.Pandas:
        storage.panda.clean()

def Lookup(config):
    #logging.info("[<] " + str(datetime.now()) + ':: run+Lookup')
    url = f"http://twitter.com/{config.Username}?lang=en"
    get_event_loop().run_until_complete(get.User(url, config, db.Conn(config.Database)))

def Profile(config):
    config.Profile = True
    #logging.info("[<] " + str(datetime.now()) + ':: run+Profile')
    run(config)

def Search(config):
    #logging.info("[<] " + str(datetime.now()) + ':: run+Search')
    config.TwitterSearch = True
    config.Following = False
    config.Followers = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("tweet")
