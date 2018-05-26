from . import output
from bs4 import BeautifulSoup
import aiohttp
import async_timeout
import asyncio

class Url:
    def __init__(self, config, init):
        self.config = config
        self.init = init

    async def favorites(self):
        url = "https://mobile.twitter.com/{0.Username}/favorites?lang=en".format(self.config)
        
        if self.init != -1:
            url+= "&max_id={0.init}".format(self)

        return url

    async def followers(self):
        url = "https://mobile.twitter.com/{0.Username}/followers?lang=en".format(self.config)

        if self.init != -1:
            url+= "&cursor={0.init}".format(self)

        return url

    async def following(self):
        url = "https://mobile.twitter.com/{0.Username}/following?lang=en".format(self.config)

        if self.init != -1:
            url+= "&cursor={0.init}".format(self)

        return url

    async def profile(self):
        url = "https://twitter.com/i/profiles/show/{0.Username}/timeline/tweets".format(self.config)
        url+= "?include_available_features=1&lang=en&include_entities=1&include"
        url+= "_new_items_bar=true"

        if self.init != -1:
            url+= "&max_position={0.init}".format(self)

        return url

    async def search(self):
        url = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
        url+= "&lang=en&include_available_features=1&include_entities=1&reset_"
        url+= "error_state=false&src=typd&max_position={0.init}&q=".format(self)

        if self.config.Lang != None:
            url = url.replace("lang=en", "l={0.Lang}&lang=en".format(self.config))
        if self.config.Username != None:
            url+= "from%3A{0.Username}".format(self.config)
        if self.config.Geo != None:
            self.config.Geo = self.config.Geo.replace(" ", "")
            url+= "geocode%3A{0.Geo}".format(self.config)
        if self.config.Search != None:
            self.config.Search = self.config.Search.replace(" ", "%20")
            self.config.Search = self.config.Search.replace("#", "%23")
            url+= "%20{0.Search}".format(self.config)
        if self.config.Year != None:
            url+= "%20until%3A{0.Year}-1-1".format(self.config)
        if self.config.Since != None:
            url+= "%20since%3A{0.Since}".format(self.config)
        if self.config.Until != None:
            url+= "%20until%3A{0.Until}".format(self.config)
        if self.config.Fruit:
            url+= "%20myspace.com%20OR%20last.fm%20OR"
            url+= "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
            url+= "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
            url+= "%20OR%20keybase"
        if self.config.Verified:
            url+= "%20filter%3Averified"
        if self.config.To:
            url+= "%20to%3A{0.To}".format(self.config)
        if self.config.All:
            url+= "%20to%3A{0.All}%20OR%20from%3A{0.All}%20OR%20@{0.All}".format(self.config)
        if self.config.Near:
            self.config.Near = self.config.Near.replace(" ", "%20")
            self.config.Near = self.config.Near.replace(",", "%2C")
            url+= "%20near%3A{0.Near}".format(self.config)

        return url

async def MobileRequest(config, url):
    ua = {'User-Agent': 'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/0.8.12'}
    connect = aiohttp.TCPConnector(verify_ssl=False)
    async with aiohttp.ClientSession(headers=ua, connector=connect) as session:
        return await Response(session, url)

async def Request(config, url):
    connect = aiohttp.TCPConnector(verify_ssl=False)
    async with aiohttp.ClientSession(connector=connect) as session:
        return await Response(session, url)

async def Response(session, url):
    with async_timeout.timeout(30):
        async with session.get(url) as response:
            return await response.text()

async def Username(config):
    url = "https://twitter.com/intent/user?user_id={}&lang=en".format(config.User_id)
    r = Request(config, url)
    soup = BeautifulSoup(r, "html.parser")

    return soup.find("a", "fn url alternate-context")["href"].replace("/", "")

async def Tweet(url, config, conn):
    try:
        response = await Request(config, url)
        soup = BeautifulSoup(response, "html.parser")
        tweet = soup.find("div", "permalink-inner permalink-tweet-container")
        location = soup.find("span", "ProfileHeaderCard-locationText u-dir").text
        location = location.replace("\n", "")
        location = location.replace(" ", "")
        location = location.replace(",", ", ")
        await output.Tweets(tweet, location, config, conn)
    except:
        pass
