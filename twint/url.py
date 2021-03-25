import datetime
from sys import platform
import logging as logme
from urllib.parse import urlencode
from urllib.parse import quote

mobile = "https://mobile.twitter.com"
base = "https://api.twitter.com/2/search/adaptive.json"


def _sanitizeQuery(_url, params):
    _serialQuery = ""
    _serialQuery = urlencode(params, quote_via=quote)
    _serialQuery = _url + "?" + _serialQuery
    return _serialQuery


def _formatDate(date):
    if "win" in platform:
        return f'\"{date.split()[0]}\"'
    try:
        return int(datetime.datetime.strptime(date, "%Y-%m-%d %H:%M:%S").timestamp())
    except ValueError:
        return int(datetime.datetime.strptime(date, "%Y-%m-%d").timestamp())


async def Favorites(username, init):
    logme.debug(__name__ + ':Favorites')
    url = f"{mobile}/{username}/favorites?lang=en"

    if init != '-1':
        url += f"&max_id={init}"

    return url


async def Followers(username, init):
    logme.debug(__name__ + ':Followers')
    url = f"{mobile}/{username}/followers?lang=en"

    if init != '-1':
        url += f"&cursor={init}"

    return url


async def Following(username, init):
    logme.debug(__name__ + ':Following')
    url = f"{mobile}/{username}/following?lang=en"

    if init != '-1':
        url += f"&cursor={init}"

    return url


async def MobileProfile(username, init):
    logme.debug(__name__ + ':MobileProfile')
    url = f"{mobile}/{username}?lang=en"

    if init != '-1':
        url += f"&max_id={init}"

    return url


async def Search(config, init):
    logme.debug(__name__ + ':Search')
    url = base
    tweet_count = 100 if not config.Limit else config.Limit
    q = ""
    params = [
        # ('include_blocking', '1'),
        # ('include_blocked_by', '1'),
        # ('include_followed_by', '1'),
        # ('include_want_retweets', '1'),
        # ('include_mute_edge', '1'),
        # ('include_can_dm', '1'),
        ('include_can_media_tag', '1'),
        # ('skip_status', '1'),
        # ('include_cards', '1'),
        ('include_ext_alt_text', 'true'),
        ('include_quote_count', 'true'),
        ('include_reply_count', '1'),
        ('tweet_mode', 'extended'),
        ('include_entities', 'true'),
        ('include_user_entities', 'true'),
        ('include_ext_media_availability', 'true'),
        ('send_error_codes', 'true'),
        ('simple_quoted_tweet', 'true'),
        ('count', tweet_count),
        # ('query_source', 'typed_query'),
        # ('pc', '1'),
        ('cursor', str(init)),
        ('spelling_corrections', '1'),
        ('ext', 'mediaStats%2ChighlightedLabel'),
        ('tweet_search_mode', 'live'),  # this can be handled better, maybe take an argument and set it then
    ]
    if not config.Popular_tweets:
        params.append(('f', 'tweets'))
    if config.Lang:
        params.append(("l", config.Lang))
        params.append(("lang", "en"))
    if config.Query:
        q += f" from:{config.Query}"
    if config.Username:
        q += f" from:{config.Username}"
    if config.Geo:
        config.Geo = config.Geo.replace(" ", "")
        q += f" geocode:{config.Geo}"
    if config.Search:

        q += f" {config.Search}"
    if config.Year:
        q += f" until:{config.Year}-1-1"
    if config.Since:
        q += f" since:{_formatDate(config.Since)}"
    if config.Until:
        q += f" until:{_formatDate(config.Until)}"
    if config.Email:
        q += ' "mail" OR "email" OR'
        q += ' "gmail" OR "e-mail"'
    if config.Phone:
        q += ' "phone" OR "call me" OR "text me"'
    if config.Verified:
        q += " filter:verified"
    if config.To:
        q += f" to:{config.To}"
    if config.All:
        q += f" to:{config.All} OR from:{config.All} OR @{config.All}"
    if config.Near:
        q += f' near:"{config.Near}"'
    if config.Images:
        q += " filter:images"
    if config.Videos:
        q += " filter:videos"
    if config.Media:
        q += " filter:media"
    if config.Replies:
        q += " filter:replies"
    # although this filter can still be used, but I found it broken in my preliminary testing, needs more testing
    if config.Native_retweets:
        q += " filter:nativeretweets"
    if config.Min_likes:
        q += f" min_faves:{config.Min_likes}"
    if config.Min_retweets:
        q += f" min_retweets:{config.Min_retweets}"
    if config.Min_replies:
        q += f" min_replies:{config.Min_replies}"
    if config.Links == "include":
        q += " filter:links"
    elif config.Links == "exclude":
        q += " exclude:links"
    if config.Source:
        q += f" source:\"{config.Source}\""
    if config.Members_list:
        q += f" list:{config.Members_list}"
    if config.Filter_retweets:
        q += f" exclude:nativeretweets exclude:retweets"
    if config.Custom_query:
        q = config.Custom_query

    q = q.strip()
    params.append(("q", q))
    _serialQuery = _sanitizeQuery(url, params)
    return url, params, _serialQuery


def SearchProfile(config, init=None):
    logme.debug(__name__ + ':SearchProfile')
    _url = 'https://api.twitter.com/2/timeline/profile/{user_id}.json'.format(user_id=config.User_id)
    tweet_count = 100
    params = [
        # some of the fields are not required, need to test which ones aren't required
        ('include_profile_interstitial_type', '1'),
        ('include_blocking', '1'),
        ('include_blocked_by', '1'),
        ('include_followed_by', '1'),
        ('include_want_retweets', '1'),
        ('include_mute_edge', '1'),
        ('include_can_dm', '1'),
        ('include_can_media_tag', '1'),
        ('skip_status', '1'),
        ('cards_platform', 'Web - 12'),
        ('include_cards', '1'),
        ('include_ext_alt_text', 'true'),
        ('include_quote_count', 'true'),
        ('include_reply_count', '1'),
        ('tweet_mode', 'extended'),
        ('include_entities', 'true'),
        ('include_user_entities', 'true'),
        ('include_ext_media_color', 'true'),
        ('include_ext_media_availability', 'true'),
        ('send_error_codes', 'true'),
        ('simple_quoted_tweet', 'true'),
        ('include_tweet_replies', 'true'),
        ('count', tweet_count),
        ('ext', 'mediaStats%2ChighlightedLabel'),
    ]

    if type(init) == str:
        params.append(('cursor', str(init)))
    _serialQuery = _sanitizeQuery(_url, params)
    return _url, params, _serialQuery
