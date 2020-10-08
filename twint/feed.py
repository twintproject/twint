from bs4 import BeautifulSoup
from re import findall
from json import loads

import logging as logme


class NoMoreTweetsException(Exception):
    def __init__(self, msg):
        super().__init__(msg)


def Follow(response):
    logme.debug(__name__ + ':Follow')
    soup = BeautifulSoup(response, "html.parser")
    follow = soup.find_all("td", "info fifty screenname")
    cursor = soup.find_all("div", "w-button-more")
    try:
        cursor = findall(r'cursor=(.*?)">', str(cursor))[0]
    except IndexError:
        logme.critical(__name__ + ':Follow:IndexError')

    return follow, cursor


def Mobile(response):
    logme.debug(__name__ + ':Mobile')
    soup = BeautifulSoup(response, "html.parser")
    tweets = soup.find_all("span", "metadata")
    max_id = soup.find_all("div", "w-button-more")
    try:
        max_id = findall(r'max_id=(.*?)">', str(max_id))[0]
    except Exception as e:
        logme.critical(__name__ + ':Mobile:' + str(e))

    return tweets, max_id


def MobileFav(response):
    soup = BeautifulSoup(response, "html.parser")
    tweets = soup.find_all("table", "tweet")
    max_id = soup.find_all("div", "w-button-more")
    try:
        max_id = findall(r'max_id=(.*?)">', str(max_id))[0]
    except Exception as e:
        print(str(e) + " [x] feed.MobileFav")

    return tweets, max_id


def profile(response):
    logme.debug(__name__ + ':profile')
    json_response = loads(response)
    html = json_response["items_html"]
    soup = BeautifulSoup(html, "html.parser")
    feed = soup.find_all("div", "tweet")

    return feed, feed[-1]["data-item-id"]


def Json(response):
    logme.debug(__name__ + ':Json')
    json_response = loads(response)
    html = json_response["items_html"]
    soup = BeautifulSoup(html, "html.parser")
    feed = soup.find_all("div", "tweet")
    return feed, json_response["min_position"]


def search_v2(response):
    # TODO need to implement this
    response = loads(response)
    if len(response['globalObjects']['tweets']) == 0:
        msg = 'No more data. finished scraping!!'
        raise NoMoreTweetsException(msg)

    # need to modify things at the function call end
    # timeline = response['timeline']['instructions'][0]['addEntries']['entries']
    feed = []
    feed_set = set()
    # here we need to remove the quoted and `to-reply` tweets from the list as they may or may not contain the
    # for _id in response['globalObjects']['tweets']:
    #     if 'quoted_status_id_str' in response['globalObjects']['tweets'][_id] or \
    #             response['globalObjects']['tweets'][_id]['in_reply_to_status_id_str']:
    #         try:
    #             feed_set.add(response['globalObjects']['tweets'][_id]['quoted_status_id_str'])
    #         except KeyError:
    #             feed_set.add(response['globalObjects']['tweets'][_id]['in_reply_to_status_id_str'])
    # i = 1
    # for _id in response['globalObjects']['tweets']:
    #     if _id not in feed_set:
    #         temp_obj = response['globalObjects']['tweets'][_id]
    #         temp_obj['user_data'] = response['globalObjects']['users'][temp_obj['user_id_str']]
    #         feed.append(temp_obj)
    for timeline_entry in response['timeline']['instructions'][0]['addEntries']['entries']:
        # this will handle the cases when the timeline entry is a tweet
        if timeline_entry['entryId'].find('sq-I-t-') == 0:
            _id = timeline_entry['content']['item']['content']['tweet']['id']
            temp_obj = response['globalObjects']['tweets'][_id]
            temp_obj['user_data'] = response['globalObjects']['users'][temp_obj['user_id_str']]
            feed.append(temp_obj)

    try:
        next_cursor = response['timeline']['instructions'][0]['addEntries']['entries'][-1]['content'][
            'operation']['cursor']['value']
    except KeyError:
        # this is needed because after the first request location of cursor is changed
        next_cursor = response['timeline']['instructions'][-1]['replaceEntry']['entry']['content']['operation'][
            'cursor']['value']
    return feed, next_cursor
