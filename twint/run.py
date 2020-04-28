import sys, os, time
from asyncio import get_event_loop, TimeoutError, ensure_future, new_event_loop, set_event_loop

from . import datelock, feed, get, output, verbose, storage
from .storage import db

import logging as logme

class Twint:
    def __init__(self, config):
        logme.debug(__name__+':Twint:__init__')
        if config.Resume is not None and (config.TwitterSearch or config.Followers or config.Following):
            logme.debug(__name__+':Twint:__init__:Resume')
            self.init = self.get_resume(config.Resume)
        else:
            self.init = '-1'

        self.feed = [-1]
        self.count = 0
        self.user_agent = ""
        self.config = config
        self.conn = db.Conn(config.Database)
        self.d = datelock.Set(self.config.Until, self.config.Since)
        verbose.Elastic(config.Elasticsearch)

        if self.config.Store_object:
            logme.debug(__name__+':Twint:__init__:clean_follow_list')
            output._clean_follow_list()

        if self.config.Pandas_clean:
            logme.debug(__name__+':Twint:__init__:pandas_clean')
            storage.panda.clean()

    def get_resume(self, resumeFile):
        if not os.path.exists(resumeFile):
            return '-1'
        with open(resumeFile, 'r') as rFile:
            _init = rFile.readlines()[-1].strip('\n')
            return _init

    async def Feed(self):
        logme.debug(__name__+':Twint:Feed')
        consecutive_errors_count = 0
        while True:
            response = await get.RequestUrl(self.config, self.init, headers=[("User-Agent", self.user_agent)])
            if self.config.Debug:
                print(response, file=open("twint-last-request.log", "w", encoding="utf-8"))

            self.feed = []
            try:
                if self.config.Favorites:
                    self.feed, self.init = feed.Mobile(response)
                    if not self.count % 40:
                        time.sleep(5)
                elif self.config.Followers or self.config.Following:
                    self.feed, self.init = feed.Follow(response)
                    if not self.count % 40:
                        time.sleep(5)
                elif self.config.Profile:
                    if self.config.Profile_full:
                        self.feed, self.init = feed.Mobile(response)
                    else:
                        self.feed, self.init = feed.profile(response)
                elif self.config.TwitterSearch:
                    self.feed, self.init = feed.Json(response)
                break
            except TimeoutError as e:
                if self.config.Proxy_host.lower() == "tor":
                    print("[?] Timed out, changing Tor identity...")
                    if self.config.Tor_control_password is None:
                        logme.critical(__name__+':Twint:Feed:tor-password')
                        sys.stderr.write("Error: config.Tor_control_password must be set for proxy autorotation!\r\n")
                        sys.stderr.write("Info: What is it? See https://stem.torproject.org/faq.html#can-i-interact-with-tors-controller-interface-directly\r\n")
                        break
                    else:
                        get.ForceNewTorIdentity(self.config)
                        continue
                else:
                    logme.critical(__name__+':Twint:Feed:' + str(e))
                    print(str(e))
                    break
            except Exception as e:
                if self.config.Profile or self.config.Favorites:
                    print("[!] Twitter does not return more data, scrape stops here.")
                    break
                logme.critical(__name__+':Twint:Feed:noData' + str(e))
                # Sometimes Twitter says there is no data. But it's a lie.
                consecutive_errors_count += 1
                if consecutive_errors_count < self.config.Retries_count:
                    # skip to the next iteration if wait time does not satisfy limit constraints
                    delay = round(consecutive_errors_count ** self.config.Backoff_exponent, 1)

                    # if the delay is less than users set min wait time then replace delay
                    if self.config.Min_wait_time > delay:
                        delay = self.config.Min_wait_time

                    sys.stderr.write('sleeping for {} secs\n'.format(delay))
                    time.sleep(delay)
                    self.user_agent = await get.RandomUserAgent(wa=True)
                    continue
                logme.critical(__name__+':Twint:Feed:Tweets_known_error:' + str(e))
                sys.stderr.write(str(e) + " [x] run.Feed")
                sys.stderr.write("[!] if get this error but you know for sure that more tweets exist, please open an issue and we will investigate it!")
                break
        if self.config.Resume:
            print(self.init, file=open(self.config.Resume, "a", encoding="utf-8"))

    async def follow(self):
        await self.Feed()
        if self.config.User_full:
            logme.debug(__name__+':Twint:follow:userFull')
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            logme.debug(__name__+':Twint:follow:notUserFull')
            for user in self.feed:
                self.count += 1
                username = user.find("a")["name"]
                await output.Username(username, self.config, self.conn)

    async def favorite(self):
        logme.debug(__name__+':Twint:favorite')
        await self.Feed()
        self.count += await get.Multi(self.feed, self.config, self.conn)

    async def profile(self):
        await self.Feed()
        if self.config.Profile_full:
            logme.debug(__name__+':Twint:profileFull')
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            logme.debug(__name__+':Twint:notProfileFull')
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, self.config, self.conn)

    async def tweets(self):
        await self.Feed()
        if self.config.Location:
            logme.debug(__name__+':Twint:tweets:location')
            self.count += await get.Multi(self.feed, self.config, self.conn)
        else:
            logme.debug(__name__+':Twint:tweets:notLocation')
            for tweet in self.feed:
                self.count += 1
                await output.Tweets(tweet, self.config, self.conn)

    async def main(self, callback=None):

        task = ensure_future(self.run())  # Might be changed to create_task in 3.7+.

        if callback:
            task.add_done_callback(callback)

        await task

    async def run(self):
        if self.config.TwitterSearch:
            self.user_agent = await get.RandomUserAgent(wa=True)
        else:
            self.user_agent = await get.RandomUserAgent()

        if self.config.User_id is not None:
            logme.debug(__name__+':Twint:main:user_id')
            self.config.Username = await get.Username(self.config.User_id)

        if self.config.Username is not None:
            logme.debug(__name__+':Twint:main:username')
            url = f"https://twitter.com/{self.config.Username}?lang=en"
            self.config.User_id = await get.User(url, self.config, self.conn, True)

        if self.config.TwitterSearch and self.config.Since and self.config.Until:
            logme.debug(__name__+':Twint:main:search+since+until')
            while self.d._since < self.d._until:
                self.config.Since = str(self.d._since)
                self.config.Until = str(self.d._until)
                if len(self.feed) > 0:
                    await self.tweets()
                else:
                    logme.debug(__name__+':Twint:main:gettingNewTweets')
                    break

                if get.Limit(self.config.Limit, self.count):
                    break
        else:
            logme.debug(__name__+':Twint:main:not-search+since+until')
            while True:
                if len(self.feed) > 0:
                    if self.config.Followers or self.config.Following:
                        logme.debug(__name__+':Twint:main:follow')
                        await self.follow()
                    elif self.config.Favorites:
                        logme.debug(__name__+':Twint:main:favorites')
                        await self.favorite()
                    elif self.config.Profile:
                        logme.debug(__name__+':Twint:main:profile')
                        await self.profile()
                    elif self.config.TwitterSearch:
                        logme.debug(__name__+':Twint:main:twitter-search')
                        await self.tweets()
                else:
                    logme.debug(__name__+':Twint:main:no-more-tweets')
                    break

                #logging.info("[<] " + str(datetime.now()) + ':: run+Twint+main+CallingGetLimit2')
                if get.Limit(self.config.Limit, self.count):
                    logme.debug(__name__+':Twint:main:reachedLimit')
                    break

        if self.config.Count:
            verbose.Count(self.count, self.config)

def run(config, callback=None):
    logme.debug(__name__+':run')
    try:
        get_event_loop()
    except RuntimeError as e:
        if "no current event loop" in str(e):
            set_event_loop(new_event_loop())
        else:
            logme.exception(__name__+':Lookup:Unexpected exception while handling an expected RuntimeError.')
            raise
    except Exception as e:
        logme.exception(__name__+':Lookup:Unexpected exception occured while attempting to get or create a new event loop.')
        raise

    get_event_loop().run_until_complete(Twint(config).main(callback))

def Favorites(config):
    logme.debug(__name__+':Favorites')
    config.Favorites = True
    config.Following = False
    config.Followers = False
    config.Profile = False
    config.Profile_full = False
    config.TwitterSearch = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("tweet")

def Followers(config):
    logme.debug(__name__+':Followers')
    config.Followers = True
    config.Following = False
    config.Profile = False
    config.Profile_full = False
    config.Favorites = False
    config.TwitterSearch = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("followers")
        if config.User_full:
            storage.panda._autoget("user")
    if config.Pandas_clean and not config.Store_object:
        #storage.panda.clean()
        output._clean_follow_list()

def Following(config):
    logme.debug(__name__+':Following')
    config.Following = True
    config.Followers = False
    config.Profile = False
    config.Profile_full = False
    config.Favorites = False
    config.TwitterSearch = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("following")
        if config.User_full:
            storage.panda._autoget("user")
    if config.Pandas_clean and not config.Store_object:
        #storage.panda.clean()
        output._clean_follow_list()

def Lookup(config):
    logme.debug(__name__+':Lookup')

    try:
        get_event_loop()
    except RuntimeError as e:
        if "no current event loop" in str(e):
            set_event_loop(new_event_loop())
        else:
            logme.exception(__name__+':Lookup:Unexpected exception while handling an expected RuntimeError.')
            raise
    except Exception as e:
        logme.exception(__name__+':Lookup:Unexpected exception occured while attempting to get or create a new event loop.')
        raise

    try:
        if config.User_id is not None:
            logme.debug(__name__+':Twint:Lookup:user_id')
            config.Username = get_event_loop().run_until_complete(get.Username(config.User_id))

        url = f"https://twitter.com/{config.Username}?lang=en"
        get_event_loop().run_until_complete(get.User(url, config, db.Conn(config.Database)))

        if config.Pandas_au:
            storage.panda._autoget("user")
    except RuntimeError as e:
        if "no current event loop" in str(e):
            logme.exception(__name__+':Lookup:Previous attempt to to create an event loop failed.')

        raise
    except Exception as e:
        logme.exception(__name__+':Lookup:Unexpected exception occured.')
        raise

def Profile(config):
    logme.debug(__name__+':Profile')
    config.Profile = True
    config.Favorites = False
    config.Following = False
    config.Followers = False
    config.TwitterSearch = False
    run(config)
    if config.Pandas_au:
        storage.panda._autoget("tweet")

def Search(config, callback=None):
    logme.debug(__name__+':Search')
    config.TwitterSearch = True
    config.Favorites = False
    config.Following = False
    config.Followers = False
    config.Profile = False
    config.Profile_full = False
    run(config, callback)
    if config.Pandas_au:
        storage.panda._autoget("tweet")
