#from datetime import datetime
#import logging

mobile = "https://mobile.twitter.com"
base = "https://twitter.com/i"

async def Favorites(username, init):
    #logging.info("[<] " + str(datetime.now()) + ':: url+Favorites')
    url = f"{mobile}/{username}/favorites?lang=en"

    if init != -1:
        url += f"&max_id={init}"

    return url

async def Followers(username, init):
    #logging.info("[<] " + str(datetime.now()) + ':: url+Followers')
    url = f"{mobile}/{username}/followers?lang=en"

    if init != -1:
        url += f"&cursor={init}"

    return url

async def Following(username, init):
    #logging.info("[<] " + str(datetime.now()) + ':: url+Following')
    url = f"{mobile}/{username}/following?lang=en"

    if init != -1:
        url += f"&cursor={init}"

    return url

async def MobileProfile(username, init):
    #logging.info("[<] " + str(datetime.now()) + ':: url+MobileProfile')
    url = f"{mobile}/{username}?lang=en"

    if init != -1:
        url += f"&max_id={init}"

    return url

async def Profile(username, init):
    #logging.info("[<] " + str(datetime.now()) + ':: url+Profile')
    url = f"{base}/profiles/show/{username}/timeline/tweets?include_"
    url += "available_features=1&lang=en&include_entities=1"
    url += "&include_new_items_bar=true"

    if init != -1:
        url += f"&max_position={init}"

    return url

async def Search(config, init):
    #logging.info("[<] " + str(datetime.now()) + ':: url+Search')
    url = f"{base}/search/timeline"
    params = [
        ('f', 'tweets'),
        ('vertical', 'default'),
        ('src', 'unkn'),
        ('include_available_features', '1'),
        ('include_entities', '1'),
        ('max_position', str(init)),
        ('reset_error_state', 'false'),
    ]
    q = ""
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
        q += f" since:{config.Since}"
    if config.Until:
        q += f" until:{config.Until}"
    if config.Fruit:
        url += ' "myspace.com" OR "last.fm" OR'
        url += ' "mail" OR "email" OR "gmail" OR "e-mail"'
        # url += "%20OR%20%22phone%22%20OR%20%22call%20me%22%20OR%20%22text%20me%22"
        # url += "%20OR%20%22keybase%22"
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

    params.append(("q", q))
    return url, params
