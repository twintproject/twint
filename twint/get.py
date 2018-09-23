from async_timeout import timeout
from bs4 import BeautifulSoup
import sys
import aiohttp
import asyncio
import concurrent.futures

from aiohttp_socks import SocksConnector, SocksVer

from . import url
from .output import Tweets, Users

async def RequestUrl(config, init):
    if config.Proxy_host is not None:
        if config.Proxy_host.lower() == "tor":
            connector = SocksConnector(
                socks_ver=SocksVer.SOCKS5,
                host='127.0.0.1',
                port=9050,
                rdns=True)
        elif config.Proxy_port and config.Proxy_type:
            if config.Proxy_type.lower() == "socks5":
                _type = SocksVer.SOCKS5
            elif config.Proxy_type.lower() == "socks4":
                _type = SocksVer.SOCKS4
            else:
                print("Error: Proxy types allowed are: socks5 and socks4.")
                sys.exit(1)
            _connector = SocksConnector(
                socks_ver=_type,
                host=config.Proxy_host,
                port=config.Proxy_port,
                rdns=True)
        else:
            print("Error: Please specify --proxy-host, --proxy-port, and --proxy-type")
            sys.exit(1)
    else:
        if config.Proxy_port or config.Proxy_type:
            print("Error: Please specify --proxy-host, --proxy-port, and --proxy-type")
            sys.exit(1)


    if config.Profile:
        if config.Profile_full:
            _url = await url.MobileProfile(config.Username, init)
            response = await MobileRequest(_url, _connector)
        else:
            _url = await url.Profile(config.Username, init)
            response = await Request(_url, _connector)
    elif config.TwitterSearch:
        _url = await url.Search(config, init)
        response = await Request(_url, _connector)
    else:
        if config.Following:
            _url = await url.Following(config.Username, init)
        elif config.Followers:
            _url = await url.Followers(config.Username, init)
        else:
            _url = await url.Favorites(config.Username, init)
        response = await MobileRequest(_url, _connector)

    if config.Debug:
        print(_url, file=open("twint-request_urls.log", "a", encoding="utf-8"))

    return response

async def MobileRequest(url, connector):
    ua = {'User-Agent': 'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/0.8.12'}
    async with aiohttp.ClientSession(headers=ua, connector=connector) as session:
        return await Response(session, url)

async def Request(url, connector):
    async with aiohttp.ClientSession(connector=connector) as session:
        return await Response(session, url)

async def Response(session, url):
    with timeout(30):
        async with session.get(url, ssl=False) as response:
            return await response.text()

async def Username(_id):
    url = f"https://twitter.com/intent/user?user_id={_id}&lang=en"
    r = await Request(url)
    soup = BeautifulSoup(r, "html.parser")

    return soup.find("a", "fn url alternate-context")["href"].replace("/", "")

async def Tweet(url, config, conn):
    try:
        response = await Request(url)
        soup = BeautifulSoup(response, "html.parser")
        tweet = soup.find("div", "permalink-inner permalink-tweet-container")
        location = soup.find("span", "ProfileHeaderCard-locationText u-dir").text
        location = location[15:].replace("\n", " ")[:-10]
        await Tweets(tweet, location, config, conn)
    except:
        pass

async def User(url, config, conn):
    try:
        response = await Request(url)
        soup = BeautifulSoup(response, "html.parser")
        await Users(soup, config, conn)
    except:
        pass

def Limit(Limit, count):
    if Limit is not None and count >= int(Limit):
        return True

async def Multi(feed, config, conn):
    count = 0
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            loop = asyncio.get_event_loop()
            futures = []
            for tweet in feed:
                count += 1
                if config.Favorites or config.Profile_full:
                    link = tweet.find("a")["href"]
                    url = f"https://twitter.com{link}&lang=en"
                elif config.User_full:
                    username = tweet.find("a")["name"]
                    url = f"http://twitter.com/{username}?lang=en"
                else:
                    link = tweet.find("a", "tweet-timestamp js-permalink js-nav js-tooltip")["href"]
                    url = f"https://twitter.com{link}?lang=en"
                
                if config.User_full:
                    futures.append(loop.run_in_executor(executor, await User(url,
                        config, conn)))
                else:
                    futures.append(loop.run_in_executor(executor, await Tweet(url,
                        config, conn)))

            await asyncio.gather(*futures)
    except:
        pass

    return count
