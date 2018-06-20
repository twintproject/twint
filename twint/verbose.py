def Count(count, username):
    msg = "[+] Finished: Successfully collected "
    if config.Followers:
        msg += f"all {count} users who follow @{username}"
    elif config.Following:
        msg += f"all {count} users who @{username} follows"
    elif config.Favorites:
        msg += f"{count} Tweets that @{username} liked"
    else:
        msg += f"{count} Tweets"
        if config.Username:
            msg += f" from @{username}"
    msg += "."
    print(msg)

def Elastic(elasticsearch):
    if elasticsearch:
        print("[+] Indexing to Elasticsearch @ " + str(elasticsearch))
