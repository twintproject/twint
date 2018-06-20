class user:
    pass

def inf(ur, _type):
    try:
        group = ur.find("div", "user-actions btn-group not-following ")
    except:
        group = ur.find("div", "user-actions btn-group not-following protected")
    
    if _type == "id":
        ret = group["data-user-id"]
    elif _type == "name":
        ret = group["data-name"]
    elif _type == "username":
        ret = group["data-screen-name"]
    elif _type == "private":
        ret = group["data-protected"]
    
    return ret

def card(ur, _type):
    if _type == "bio":
        try:
            ret = ur.find("p", "ProfileHeaderCard-bio u-dir").text.replace("\n", " ")
        except:
            ret = "None"
    elif _type == "location":
        try:
            ret = ur.find("span", "ProfileHeaderCard-locationText u-dir").text
            ret = ret[15:].replace("\n", " ")[:-10]
        except:
            ret = "None"
    elif _type == "url":
        try:
            ret = ur.find("span", "ProfileHeaderCard-urlText u-dir").find("a")["title"]
        except:
            ret = "None"
    
    return ret

def join(ur):
    jd = ur.find("span", "ProfileHeaderCard-joinDateText js-tooltip u-dir")["title"]
    return jd.split(" - ")

def stat(ur, _type):
    _class = f"ProfileNav-item ProfileNav-item--{_type}"
    stat = ur.find("li", _class)
    return stat.find("span", "ProfileNav-value")["data-count"]

def media(ur):
    try:
        media_count = ur.find("a", "PhotoRail-headingWithCount js-nav").text
        media_count = media_count.replace("\n", "")[32:].split(" ")[0]
    except:
        media_count = "0"

    return media_count

def verified(ur):
    try:
        is_verified = ur.find("span", "ProfileHeaderCard-badges").text
        if "Verified account" in is_verified:
            is_verified = "true"
        else:
            is_verified = "false"
    except:
        is_verified = "false"

    return is_verified

def User(ur):
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
    return u
