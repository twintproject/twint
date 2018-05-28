from . import feed, get, db, output, verbose

class Follow:
    def __init__(self, config):
        self.init = -1
        self.feed = [-1]
        self.count = 0
        self.config = config
        self.conn = db.Conn(config.Database)
        verbose.Elastic(config)

    async def Feed(self):
        response = await get.RequestUrl(self.config, self.init)
        self.feed = []
        try:
            self.feed, self.init = feed.Follow(response)
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

    async def main(self):
        if self.config.User_id is not None:
            self.config.Username = await get.Username(self.config.User_id)

        while True:
            if len(self.feed) > 0:
                await self.follow()
            elif get.Limit(self.config.Limit, self.count):
                break
            else:
                break
        
        verbose.Count(self.config, self.count)
