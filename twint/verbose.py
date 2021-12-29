def Count(count, config):
    msg = "[+] Finished: Successfully collected "
    if config.Followers:
        msg += f"all {count} users who follow @{config.Username}"
    elif config.Following:
        msg += f"all {count} users who @{config.Username} follows"
    elif config.Favorites:
        msg += f"{count} Tweets that @{config.Username} liked"
    else:
        msg += f"{count} Tweets"
        if config.Username:
            msg += f" from @{config.Username}"
    msg += "."
    print(msg)

def Elastic(elasticsearch):
    if elasticsearch:
        print("[+] Indexing to Elasticsearch @ " + str(elasticsearch))
