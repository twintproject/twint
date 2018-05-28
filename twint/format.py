def Tweet(config, t):
    if config.Format:
        output = config.Format.replace("{id}", t.id)
        output = output.replace("{date}", t.datestamp)
        output = output.replace("{time}", t.timestamp)
        output = output.replace("{user_id}", t.user_id)
        output = output.replace("{username}", t.username)
        output = output.replace("{timezone}", t.timezone)
        output = output.replace("{tweet}", t.tweet)
        output = output.replace("{location}", t.location)
        output = output.replace("{hashtags}", str(t.hashtags))
        output = output.replace("{replies}", t.replies)
        output = output.replace("{retweets}", t.retweets)
        output = output.replace("{likes}", t.likes)
        output = output.replace("{link}", t.link)
        output = output.replace("{is_retweet}", str(t.is_retweet))
        output = output.replace("{user_rt}", t.user_rt)
        output = output.replace("{mentions}", str(t.mentions))
    else:
        output = "{} {} {} {} ".format(t.id, t.datestamp,
                t.timestamp, t.timezone)

        if config.Profile and t.username.lower() != config.Username:
           output += "RT "

        output += "<{}> {}".format(t.username, t.tweet)

        if config.Show_hashtags:
            output += " {}".format(",".join(t.hashtags))
        if config.Stats:
            output += " | {} replies {} retweets {} likes".format(t.replies,
                    t.retweets, t.likes)
        if config.Location:
            output += " | Location {}".format(t.location)

    return output

def User(_format, u):
    if _format:
        output = _format.replace("{id}", u.id)
        output += output.replace("{name}", u.name)
        output += output.replace("{username}", u.username)
        output += output.replace("{bio}", u.bio)
        output += output.replace("{location}", u.location)
        output += output.replace("{url}", u.url)
        output += output.replace("{join_date}", u.join_date)
        output += output.replace("{join_time}", u.join_time)
        output += output.replace("{tweets}", u.tweets)
        output += output.replace("{following}", u.following)
        output += output.replace("{followers}", u.followers)
        output += output.replace("{likes}", u.likes)
        output += output.replace("{media}", u.media_count)
        output += output.replace("{private}", u.is_private)
        output += output.replace("{verified}", u.is_verified)
        output += output.replace("{avatar}", u.avatar)
    else:
        output = "{0.id} | {0.name} | @{0.username} | Private: ".format(u)
        output += "{0.is_private} | Verified: {0.is_verified} |".format(u)
        output += " Bio: {0.bio} | Location: {0.location} | Url: ".format(u)
        output += "{0.url} | Joined: {0.join_date} {0.join_time} ".format(u)
        output += "| Tweets: {0.tweets} | Following: {0.following}".format(u)
        output += " | Followers: {0.followers} | Likes: {0.likes} ".format(u)
        output += "| Media: {0.media_count} | Avatar: {0.avatar}".format(u)

    return output
