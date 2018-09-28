from bs4 import BeautifulSoup
from re import findall
from json import loads
#import logging
#from datetime import datetime

def Follow(response):
    #logging.info("[<] " + str(datetime.now()) + ':: feed+Follow')
    soup = BeautifulSoup(response, "html.parser")
    follow = soup.find_all("td", "info fifty screenname")
    cursor = soup.find_all("div", "w-button-more")
    try:
        cursor = findall(r'cursor=(.*?)">', str(cursor))[0]
    except Exception as e:
        print(e)

    return follow, cursor

def Mobile(response):
    #logging.info("[<] " + str(datetime.now()) + ':: feed+Mobile')
    soup = BeautifulSoup(response, "html.parser")
    tweets = soup.find_all("span", "metadata")
    max_id = soup.find_all("div", "w-button-more")
    try:
        max_id = findall(r'max_id=(.*?)">', str(max_id))[0]
    except Exception as e:
        print(e)

    return tweets, max_id

def profile(response):
    #logging.info("[<] " + str(datetime.now()) + ':: feed+profile')
    json_response = loads(response)
    html = json_response["items_html"]
    soup = BeautifulSoup(html, "html.parser")
    feed = soup.find_all("li", "js-stream-item")
    
    return feed, feed[-1]["data-item-id"]

def Json(response):
    #logging.info("[<] " + str(datetime.now()) + ':: feed+Json')
    json_response = loads(response)
    html = json_response["items_html"]
    soup = BeautifulSoup(html, "html.parser")
    feed = soup.find_all("li", "js-stream-item")
    split = json_response["min_position"].split("-")
    split[1] = feed[-1]["data-item-id"]
    
    return feed, "-".join(split)
