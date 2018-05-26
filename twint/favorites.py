from . import feed, get, db, output
import asyncio
import concurrent.futures
import re
import sys

class Favorites:
    def __init__(self, config):
        self.init = -1
        self.feed = [-1]
        self.count = 0
        self.config = config

        if self.config.Elasticsearch:
            print("[+] Indexing to Elasticsearch @ " + str(self.config.Elasticsearch))

        if self.config.Database:
            print("[+] Inserting into Database: " + str(self.config.Database))
            self.conn = db.init(self.config.Database)
            if isinstance(self.conn, str):
                print(str)
                sys.exit(1)
        else:
            self.conn = ""

        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.main())

    async def Feed(self):
        url = await get.Url(self.config, self.init).favorites()
        response = await get.MobileRequest(self.config, url)
        self.feed = []
        try:
            self.feed, self.init = feed.Favorite(response)
        except:
            pass

        return self.feed

    async def favorites(self):
        await self.Feed()
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                loop = asyncio.get_event_loop()
                futures = []
                for tweet in self.feed:
                    self.count += 1
                    link = tweet.find("a")["href"]
                    url = "https://twitter.com{}&lang=en".format(link)
                    futures.append(loop.run_in_executor(executor, await get.Tweet(url,
                        self.config, self.conn)))

                await asyncio.gather(*futures)
        except:
            pass

    async def main(self):
        if self.config.User_id is not None:
            self.config.Username = await get.Username(self.config)
        
        while True:
            if len(self.feed) > 0:
                await self.favorites()
            else:
                break

            if self.config.Limit is not None and self.count >= int(self.config.Limit):
                break

        if self.config.Count:
            print("[+] Finished: Successfully collected {0.count} Tweets that @{0.config.Username} liked.".format(self))
