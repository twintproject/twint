from . import db, get, feed, output
import asyncio
import re
import sys

class Profile:
    def __init__(self, config):
        self.init = -1
        self.feed = [-1]
        self.count = 0
        self.config = config

        self.config.Profile = True

        if self.config.Elasticsearch:
            print("[+] Indexing to Elasticsearch @ " + str(self.config.Elasticsearch))

        if self.config.Database:
            print("[+] Inserting into Database: " + str(self.config.Database))
            self.conn = db.init(self.config.Database)
            if isinstance(self.conn, str):
                print(str)
        else:
            self.conn = ""

        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.main())

    async def Feed(self):
        url = await get.Url(self.config, self.init).profile()
        response = await get.Request(self.config, url)
        self.feed = []
        try:
            self.feed, self.init = feed.profile(response)
        except:
            pass

    async def tweets(self):
        await self.Feed()
        for tweet in self.feed:
            self.count += 1
            await output.Tweets(tweet, "", self.config, self.conn)

    async def main(self):
        if self.config.User_id is not None:
            self.config.Username = await get.Username(self.config)

        while True:
            if len(self.feed) > 0:
                await self.tweets()
            else:
                break
            
            if self.config.Limit is not None and self.count >= int(self.config.Limit):
                break

        if self.config.Count:
            print("[+] Finished: Successfully collected {0.count} Tweets from @{0.config.Username}.".format(self))
