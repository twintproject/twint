import logging as logme

class user:
    type = "user"

    def __init__(self):
        pass

def inf(ur, _type):
    logme.debug(__name__+':inf')
    try:
        group = ur.find("div", "user-actions btn-group not-following ")
        if group == None:
            group = ur.find("div", "user-actions btn-group not-following")
        if group == None:
            group = ur.find("div", "user-actions btn-group not-following protected")
    except Exception as e:
        print("Error: " + str(e))

    if _type == "id":
        ret = group["data-user-id"]
    elif _type == "name":
        ret = group["data-name"]
    elif _type == "username":
        ret = group["data-screen-name"]
    elif _type == "private":
        ret = group["data-protected"]
        if ret == 'true':
            ret = 1
        else:
            ret = 0

    return ret

def card(ur, _type):
    logme.debug(__name__+':card')
    if _type == "bio":
        try:
            ret = ur.find("p", "ProfileHeaderCard-bio u-dir").text.replace("\n", " ")
        except:
            ret = ""
    elif _type == "location":
        try:
            ret = ur.find("span", "ProfileHeaderCard-locationText u-dir").text
            ret = ret[15:].replace("\n", " ")[:-10]
        except:
            ret = ""
    elif _type == "url":
        try:
            ret = ur.find("span", "ProfileHeaderCard-urlText u-dir").find("a")["title"]
        except:
            ret = ""

    return ret

def join(ur):
    logme.debug(__name__+':join')
    jd = ur.find("span", "ProfileHeaderCard-joinDateText js-tooltip u-dir")["title"]
    return jd.split(" - ")

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
    _class = f"ProfileNav-item ProfileNav-item--{_type}"
    stat = ur.find("li", _class)
    try :
        return int(stat.find("span", "ProfileNav-value")["data-count"])
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
        is_verified = ur.find("span", "ProfileHeaderCard-badges").text
        if "Verified account" in is_verified:
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
    u.tweets = stat(ur, "tweets is-active")
    u.following = stat(ur, "following")
    u.followers = stat(ur, "followers")
    u.likes = stat(ur, "favorites")
    u.media_count = media(ur)
    u.is_private = inf(ur, "private")
    u.is_verified = verified(ur)
    u.avatar = ur.find("img", "ProfileAvatar-image")["src"]
    u.background_image = ur.find('div',{'class':'ProfileCanopy-headerBg'}).find('img').get('src')
    return u
