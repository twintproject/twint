mobile = "https://mobile.twitter.com"
base = "https://twitter.com/i"

async def Favorites(username, init):
    url = "{}/{}/favorites?lang=en".format(mobile, username)

    if init != -1:
        url += "&max_id={}".format(init)

    return url

async def Followers(username, init):
    url = "{}/{}/followers?lang=en".format(mobile, username)

    if init != -1:
        url += "&cursor={}".format(init)

    return url

async def Following(username, init):
    url = "{}/{}/following?lang=en".format(mobile, username)

    if init != -1:
        url += "&cursor={}".format(init)

    return url

async def MobileProfile(username, init):
    url = "{}/{}?lang=en".format(mobile, username)

    if init != -1:
        url += "&max_id={}".format(init)

    return url

async def Profile(username, init):
    url = "{}/profiles/show/{}/timeline/tweets?include_".format(base, username)
    url += "available_features=1&lang=en&include_entities=1"
    url += "&include_new_items_bar=true"

    if init != -1:
        url += "&max_position={}".format(init)

    return url

async def Search(config, init):
    url = "{}/search/timeline?f=tweets&vertical=default&lang=en".format(base)
    url += "&include_available_features=1&include_entities=1&"
    url += "reset_error_state=false&src=typd&max_position={}&q=".format(init)

    if config.Lang:
        url = url.replace("lang=en", "l={0.Lang}&lang=en".format(config))
    if config.Username:
        url += "from%3A{0.Username}".format(config)
    if config.Geo:
        config.Geo = config.Geo.replace(" ", "")
        url += "geocode%3A{0.Geo}".format(config)
    if config.Search:
        config.Search = config.Search.replace(" ", "%20")
        config.Search = config.Search.replace("#", "%23")
        url += "%20{0.Search}".format(config)
    if config.Year:
        url += "%20until%3A{0.Year}-1-1".format(config)
    if config.Since:
        url += "%20since%3A{0.Since}".format(config)
    if config.Until:
        url += "%20until%3A{0.Until}".format(config)
    if config.Fruit:
        url += "%20myspace.com%20OR%20last.fm%20OR"
        url += "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
        url += "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
        url += "%20OR%20keybase"
    if config.Verified:
        url += "%20filter%3Averified"
    if config.To:
        url += "%20to%3A{0.To}".format(config)
    if config.All:
        url += "%20to%3A{0.All}%20OR%20from%3A{0.All}%20OR%20@{0.All}".format(config)
    if config.Near:
        config.Near = config.Near.replace(" ", "%20")
        config.Near = config.Near.replace(",", "%2C")
        url += "%20near%3A{0.Near}".format(config)

    return url
