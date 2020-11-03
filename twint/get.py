from async_timeout import timeout
from datetime import datetime
from bs4 import BeautifulSoup
import sys
import socket
import aiohttp
from fake_useragent import UserAgent
import asyncio
import concurrent.futures
import random
from json import loads, dumps
from aiohttp_socks import ProxyConnector, ProxyType
from urllib.parse import quote

from . import url
from .output import Tweets, Users
from .token import TokenExpiryException

import logging as logme

httpproxy = None

user_agent_list = [
    # 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/60.0.3112.113 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/60.0.3112.90 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 5.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/60.0.3112.90 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/60.0.3112.90 Safari/537.36',
    # 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/44.0.2403.157 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/60.0.3112.113 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/57.0.2987.133 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/57.0.2987.133 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/55.0.2883.87 Safari/537.36',
    # 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    # ' Chrome/55.0.2883.87 Safari/537.36',

    'Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1)',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
    'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (Windows NT 6.2; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/5.0)',
    'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
    'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
    'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; .NET CLR 2.0.50727; .NET CLR 3.0.4506.2152; .NET '
    'CLR 3.5.30729)',
]


# function to convert python `dict` to json and then encode it to be passed in the url as a parameter
# some urls require this format
def dict_to_url(dct):
    return quote(dumps(dct))


def get_connector(config):
    logme.debug(__name__ + ':get_connector')
    _connector = None
    if config.Proxy_host:
        if config.Proxy_host.lower() == "tor":
            _connector = ProxyConnector(
                host='127.0.0.1',
                port=9050,
                rdns=True)
        elif config.Proxy_port and config.Proxy_type:
            if config.Proxy_type.lower() == "socks5":
                _type = ProxyType.SOCKS5
            elif config.Proxy_type.lower() == "socks4":
                _type = ProxyType.SOCKS4
            elif config.Proxy_type.lower() == "http":
                global httpproxy
                httpproxy = "http://" + config.Proxy_host + ":" + str(config.Proxy_port)
                return _connector
            else:
                logme.critical("get_connector:proxy-type-error")
                print("Error: Proxy types allowed are: http, socks5 and socks4. No https.")
                sys.exit(1)
            _connector = ProxyConnector(
                proxy_type=_type,
                host=config.Proxy_host,
                port=config.Proxy_port,
                rdns=True)
        else:
            logme.critical(__name__ + ':get_connector:proxy-port-type-error')
            print("Error: Please specify --proxy-host, --proxy-port, and --proxy-type")
            sys.exit(1)
    else:
        if config.Proxy_port or config.Proxy_type:
            logme.critical(__name__ + ':get_connector:proxy-host-arg-error')
            print("Error: Please specify --proxy-host, --proxy-port, and --proxy-type")
            sys.exit(1)

    return _connector


async def RequestUrl(config, init):
    logme.debug(__name__ + ':RequestUrl')
    _connector = get_connector(config)
    _serialQuery = ""
    params = []
    _url = ""
    _headers = [("authorization", config.Bearer_token), ("x-guest-token", config.Guest_token)]

    # TODO : do this later
    if config.Profile:
        logme.debug(__name__ + ':RequestUrl:Profile')
        _url, params, _serialQuery = url.SearchProfile(config, init)
    elif config.TwitterSearch:
        logme.debug(__name__ + ':RequestUrl:TwitterSearch')
        _url, params, _serialQuery = await url.Search(config, init)
    else:
        if config.Following:
            logme.debug(__name__ + ':RequestUrl:Following')
            _url = await url.Following(config.Username, init)
        elif config.Followers:
            logme.debug(__name__ + ':RequestUrl:Followers')
            _url = await url.Followers(config.Username, init)
        else:
            logme.debug(__name__ + ':RequestUrl:Favorites')
            _url = await url.Favorites(config.Username, init)
        _serialQuery = _url

    response = await Request(_url, params=params, connector=_connector, headers=_headers)

    if config.Debug:
        print(_serialQuery, file=open("twint-request_urls.log", "a", encoding="utf-8"))

    return response


def ForceNewTorIdentity(config):
    logme.debug(__name__ + ':ForceNewTorIdentity')
    try:
        tor_c = socket.create_connection(('127.0.0.1', config.Tor_control_port))
        tor_c.send('AUTHENTICATE "{}"\r\nSIGNAL NEWNYM\r\n'.format(config.Tor_control_password).encode())
        response = tor_c.recv(1024)
        if response != b'250 OK\r\n250 OK\r\n':
            sys.stderr.write('Unexpected response from Tor control port: {}\n'.format(response))
            logme.critical(__name__ + ':ForceNewTorIdentity:unexpectedResponse')
    except Exception as e:
        logme.debug(__name__ + ':ForceNewTorIdentity:errorConnectingTor')
        sys.stderr.write('Error connecting to Tor control port: {}\n'.format(repr(e)))
        sys.stderr.write('If you want to rotate Tor ports automatically - enable Tor control port\n')


async def Request(_url, connector=None, params=None, headers=None):
    logme.debug(__name__ + ':Request:Connector')
    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        return await Response(session, _url, params)


async def Response(session, _url, params=None):
    logme.debug(__name__ + ':Response')
    with timeout(120):
        async with session.get(_url, ssl=True, params=params, proxy=httpproxy) as response:
            resp = await response.text()
            if response.status == 429:  # 429 implies Too many requests i.e. Rate Limit Exceeded
                raise TokenExpiryException(loads(resp)['errors'][0]['message'])
            return resp


async def RandomUserAgent(wa=None):
    logme.debug(__name__ + ':RandomUserAgent')
    try:
        if wa:
            return "Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36"
        return UserAgent(verify_ssl=False, use_cache_server=False).random
    except:
        return random.choice(user_agent_list)


async def Username(_id, bearer_token, guest_token):
    logme.debug(__name__ + ':Username')
    _dct = {'userId': _id, 'withHighlightedLabel': False}
    _url = "https://api.twitter.com/graphql/B9FuNQVmyx32rdbIPEZKag/UserByRestId?variables={}".format(dict_to_url(_dct))
    _headers = {
        'authorization': bearer_token,
        'x-guest-token': guest_token,
    }
    r = await Request(_url, headers=_headers)
    j_r = loads(r)
    username = j_r['data']['user']['legacy']['screen_name']
    return username


async def Tweet(url, config, conn):
    logme.debug(__name__ + ':Tweet')
    try:
        response = await Request(url)
        soup = BeautifulSoup(response, "html.parser")
        tweets = soup.find_all("div", "tweet")
        await Tweets(tweets, config, conn, url)
    except Exception as e:
        logme.critical(__name__ + ':Tweet:' + str(e))


async def User(username, config, conn, user_id=False):
    logme.debug(__name__ + ':User')
    _dct = {'screen_name': username, 'withHighlightedLabel': False}
    _url = 'https://api.twitter.com/graphql/jMaTS-_Ea8vh9rpKggJbCQ/UserByScreenName?variables={}'\
        .format(dict_to_url(_dct))
    _headers = {
        'authorization': config.Bearer_token,
        'x-guest-token': config.Guest_token,
    }
    try:
        response = await Request(_url, headers=_headers)
        j_r = loads(response)
        if user_id:
            try:
                _id = j_r['data']['user']['rest_id']
                return _id
            except KeyError as e:
                logme.critical(__name__ + ':User:' + str(e))
                return
        await Users(j_r, config, conn)
    except Exception as e:
        logme.critical(__name__ + ':User:' + str(e))
        raise


def Limit(Limit, count):
    logme.debug(__name__ + ':Limit')
    if Limit is not None and count >= int(Limit):
        return True


async def Multi(feed, config, conn):
    logme.debug(__name__ + ':Multi')
    count = 0
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            loop = asyncio.get_event_loop()
            futures = []
            for tweet in feed:
                count += 1
                if config.Favorites or config.Profile_full:
                    logme.debug(__name__ + ':Multi:Favorites-profileFull')
                    link = tweet.find("a")["href"]
                    url = f"https://twitter.com{link}&lang=en"
                elif config.User_full:
                    logme.debug(__name__ + ':Multi:userFull')
                    username = tweet.find("a")["name"]
                    url = f"http://twitter.com/{username}?lang=en"
                else:
                    logme.debug(__name__ + ':Multi:else-url')
                    link = tweet.find("a", "tweet-timestamp js-permalink js-nav js-tooltip")["href"]
                    url = f"https://twitter.com{link}?lang=en"

                if config.User_full:
                    logme.debug(__name__ + ':Multi:user-full-Run')
                    futures.append(loop.run_in_executor(executor, await User(url,
                                                                             config, conn)))
                else:
                    logme.debug(__name__ + ':Multi:notUser-full-Run')
                    futures.append(loop.run_in_executor(executor, await Tweet(url,
                                                                              config, conn)))
            logme.debug(__name__ + ':Multi:asyncioGather')
            await asyncio.gather(*futures)
    except Exception as e:
        # TODO: fix error not error
        # print(str(e) + " [x] get.Multi")
        # will return "'NoneType' object is not callable"
        # but still works
        # logme.critical(__name__+':Multi:' + str(e))
        pass

    return count
