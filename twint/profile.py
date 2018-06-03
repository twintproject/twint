from . import db, get, feed, output, verbose, dbmysql

class Profile:
    def __init__(self, config):
        self.init = -1
        self.feed = [-1]
        self.count = 0
        self.config = config

        if config.hostname:
            self.conn = dbmysql.Conn(config.hostname, config.Database, config.DB_user, config.DB_pwd)
        else:
            self.conn = db.Conn(config.Database)

        self.config.Profile = True

        verbose.Elastic(config)
        
    async def Feed(self):
        response = await get.RequestUrl(self.config, self.init)
        self.feed = []
        try:
            if self.config.Profile_full:
                self.feed, self.init = feed.Mobile(response)
            else:
                self.feed, self.init = feed.profile(response)
        except:
            pass

    async def tweets(self):
        await self.Feed()
        if self.config.Profile_full:
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, "", self.config, self.conn)

    async def main(self):
        if self.config.User_id is not None:
            self.config.Username = await get.Username(self.config.User_id)

        while True:
            if len(self.feed) > 0:
                await self.tweets()
            else:
                break
                
            if get.Limit(self.config.Limit, self.count):
                break

        verbose.Count(self.config, self.count)
