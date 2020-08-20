import logging as logme

class user:
    type = "user"

    def __init__(self):
        pass

def inf(ur, _type):
    logme.debug(__name__+':inf')
    try:
        group = ur.find("div", "profile")
        if group == None:
            group = ur.find("div", "user-actions btn-group not-following")
        if group == None:
            group = ur.find("div", "user-actions btn-group not-following protected")
    except Exception as e:
        print("Error: " + str(e))

    if _type == "id":
        screen_name = group.find("span", "screen-name").text
        ret = ur.find("a", {"data-screenname": screen_name})
        ret = ret.get('data-mentioned-user-id') if ret is not None else None
        ret = "" if ret is None else ret
    elif _type == "name":
        ret = group.find("div", "fullname").text.split('\n')[0]
    elif _type == "username":
        ret = group.find("span", "screen-name").text
    elif _type == "private":
        ret = group.find("div","protected")
        if ret:
            ret = 1
        else:
            ret = 0

    return ret

def card(ur, _type):
    logme.debug(__name__+':card')
    if _type == "bio":
        try:
            ret = ur.find("div", "bio").text.replace("\n", " ").strip()
        except:
            ret = ""
    elif _type == "location":
        try:
            ret = ur.find("div", "location").text
        except:
            ret = ""
    elif _type == "url":
        try:
            ret = ur.find("link")["href"]
        except:
            ret = ""

    return ret

def join(ur):
    try:
        logme.debug(__name__+':join')
        jd = ur.find("span", "ProfileHeaderCard-joinDateText js-tooltip u-dir")["title"]
        return jd.split(" - ")
    except:
        return ["", ""]

def convertToInt(x):
    logme.debug(__name__+':contertToInt')
    multDict = {
        "k" : 1000,
        "m" : 1000000,
        "b" : 1000000000,
    }
    try:
        if ',' in x:
            x = x.replace(',', '')
        y = int(x)
        return y
    except:
        pass

    try:
        y = float(str(x)[:-1])
        y = y * multDict[str(x)[-1:].lower()]
        return int(y)
    except:
        pass

    return 0

def stat(ur, _type):
    logme.debug(__name__+':stat')
    stats = ur.find('table', 'profile-stats')
    stat_dict = {}
    for stat in stats.find_all('td', 'stat'):
        statnum, statlabel = stat.text.replace('\n', '').replace(',', '').split(' ')[:2]
        stat_dict[statlabel.lower()] = int(statnum.replace(',', ''))
    try :
        return stat_dict[_type]
    except AttributeError:
        return 0

def media(ur):
    logme.debug(__name__+':media')
    try:
        media_count = ur.find("a", "PhotoRail-headingWithCount js-nav").text.strip().split(" ")[0]
        return convertToInt(media_count)
    except:
        return 0

def verified(ur):
    logme.debug(__name__+':verified')
    try:
        is_verified = ur.find("img", {"alt": "Verified Account"})['alt']
        if "Verified Account" in is_verified:
            is_verified = 1
        else:
            is_verified = 0
    except:
        is_verified = 0

    return is_verified

def User(ur):
    logme.debug(__name__+':User')
    u = user()
    for img in ur.findAll("img", "Emoji Emoji--forText"):
        img.replaceWith(img["alt"])
    u.id = inf(ur, "id")
    u.name = inf(ur, "name")
    u.username = inf(ur, "username")
    u.bio = card(ur, "bio")
    u.location = card(ur, "location")
    u.url = card(ur, "url")
    u.join_date = join(ur)[1]
    u.join_time = join(ur)[0]
    u.tweets = stat(ur, "tweets")
    u.following = stat(ur, "following")
    u.followers = stat(ur, "followers")
    u.likes = ""  # stat(ur, "favorites")
    u.media_count = ""  # media(ur)
    u.is_private = inf(ur, "private")
    u.is_verified = verified(ur)
    u.avatar = ur.find("img", {"alt": u.name})["src"]
    #u.background_image = ur.find('div',{'class':'ProfileCanopy-headerBg'}).find('img').get('src')
    return u
