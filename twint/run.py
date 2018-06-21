from . import datelock, feed, get, output, verbose
from asyncio import get_event_loop
from datetime import timedelta
from .storage import db

class Twint:
    def __init__(self, config):
        if config.Resume is not None and config.TwitterSearch:
            self.init = f"TWEET-{config.Resume}-0"
        else:
            self.init = -1
        self.feed = [-1]
        self.count = 0
        self.config = config
        self.conn = db.Conn(config.Database)
        self.d = datelock.Set(self.config.Until, self.config.Since)
        verbose.Elastic(config.Elasticsearch)

        if not self.config.Timedelta:
            if (self.d._until - self.d._since).days > 30:
                self.config.Timedelta = 30
            else:
                self.config.Timedelta = (self.d._until - self.d._since).days

    async def Feed(self):
        response = await get.RequestUrl(self.config, self.init)
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
        except:
            pass

    async def follow(self):
        await self.Feed()
        if self.config.User_full:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for user in self.feed:
                self.count += 1
                username = user.find("a")["name"]
                await output.Username(username, self.config, self.conn)

    async def favorite(self):
        await self.Feed()
        self.count += await get.Multi(self.feed, self.config, self.conn)

    async def profile(self):
        await self.Feed()
        if self.config.Profile_full:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, "", self.config, self.conn)

    async def tweets(self):
        await self.Feed()
        if self.config.Location:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, "", self.config, self.conn)

    async def main(self):
        if self.config.User_id is not None:
            self.config.Username = await get.Username(self.config.User_id)
        
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
            
                if get.Limit(self.config.Limit, self.count):
                    break
        
        if self.config.Count:
            verbose.Count(self.count, self.config.Username)

def run(config):
    get_event_loop().run_until_complete(Twint(config).main())

def Favorites(config):
    config.Favorites = True
    run(config)

def Followers(config):
    config.Followers = True
    run(config)

def Following(config):
    config.Following = True
    run(config)

def Profile(config):
    config.Profile = True
    run(config)

def Search(config):
    config.TwitterSearch = True
    run(config)
