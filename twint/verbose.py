def Count(config, count):
    if config.Count:
        msg = "[+] Finished: Successfully collected "
        if config.Followers:
            msg += "all {0} users who follow @{1.Username}".format(count, config)
        elif config.Following:
            msg += "all {0} users who @{1.Username} follows".format(count, config)
        elif config.Favorites:
            msg += "{0} Tweets that @{1.Username} liked".format(count, config)
        else:
            msg += "{0} Tweets".format(count)
            if config.Username:
                msg += " from @{0.Username}".format(config)
        msg += "."
        print(msg)

def Elastic(config):
    if config.Elasticsearch:
        print("[+] Indexing to Elasticsearch @ " + str(config.Elasticsearch))
