mobile = "https://mobile.twitter.com"
base = "https://twitter.com/i"

async def Favorites(username, init):
    url = f"{mobile}/{username}/favorites?lang=en"

    if init != -1:
        url += f"&max_id={init}"

    return url

async def Followers(username, init):
    url = f"{mobile}/{username}/followers?lang=en"

    if init != -1:
        url += f"&cursor={init}"

    return url

async def Following(username, init):
    url = f"{mobile}/{username}/following?lang=en"

    if init != -1:
        url += f"&cursor={init}"

    return url

async def MobileProfile(username, init):
    url = f"{mobile}/{username}?lang=en"

    if init != -1:
        url += f"&max_id={init}"

    return url

async def Profile(username, init):
    url = f"{base}/profiles/show/{username}/timeline/tweets?include_"
    url += "available_features=1&lang=en&include_entities=1"
    url += "&include_new_items_bar=true"

    if init != -1:
        url += f"&max_position={init}"

    return url

async def Search(config, init):
    url = f"{base}/search/timeline?f=tweets&vertical=default&lang=en"
    url += "&include_available_features=1&include_entities=1&"
    url += f"reset_error_state=false&src=typd&qf=off&max_position={init}&q="

    if config.Lang:
        url = url.replace("lang=en", f"l={config.Lang}&lang=en")
    if config.Username:
        url += f"from%3A{config.Username}"
    if config.Geo:
        config.Geo = config.Geo.replace(" ", "")
        url += f"geocode%3A{config.Geo}"
    if config.Search:
        config.Search = config.Search.replace(" ", "%20")
        config.Search = config.Search.replace("#", "%23")
        url += f"%20{config.Search}"
    if config.Year:
        url += f"%20until%3A{config.Year}-1-1"
    if config.Since:
        url += f"%20since%3A{config.Since}"
    if config.Until:
        url += f"%20until%3A{config.Until}"
    if config.Fruit:
        url += "%20myspace.com%20OR%20last.fm%20OR"
        url += "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
        url += "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
        url += "%20OR%20keybase"
    if config.Verified:
        url += "%20filter%3Averified"
    if config.To:
        url += f"%20to%3A{config.To}"
    if config.All:
        url += f"%20to%3A{config.All}%20OR%20from%3A{config.All}%20OR%20@{config.All}"
    if config.Near:
        config.Near = config.Near.replace(" ", "%20")
        config.Near = config.Near.replace(",", "%2C")
        url += f"%20near%3A%22{config.Near}%22"
    if config.Images:
        url += "%20filter%3Aimages"
    if config.Videos:
        url += "%20filter%3Avideos"
    if config.Media:
        url += "%20filter%3Amedia"
    if config.Replies:
        url += "%20filter%3Areplies"

    return url
