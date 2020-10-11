import datetime
import logging as logme


class User:
    type = "user"

    def __init__(self):
        pass

User_formats = {
    'join_date': '%Y-%m-%d',
    'join_time': '%H:%M:%S %Z'
}


# ur object must be a json from the endpoint https://api.twitter.com/graphql
def User(ur):
    logme.debug(__name__ + ':User')
    if 'data' not in ur and 'user' not in ur['data']:
        msg = 'malformed json! cannot be parsed to get user data'
        logme.fatal(msg)
        raise KeyError(msg)
    _usr = User()
    _usr.id = ur['data']['user']['rest_id']
    _usr.name = ur['data']['user']['rest_id']['legacy']['name']
    _usr.username = ur['data']['user']['rest_id']['legacy']['screen_name']
    _usr.bio = ur['data']['user']['rest_id']['legacy']['description']
    _usr.location = ur['data']['user']['rest_id']['legacy']['location']
    _usr.url = ur['data']['user']['rest_id']['legacy']['screen_name']['url']
    # parsing date to user-friendly format
    _dt = ur['data']['user']['rest_id']['legacy']['created_at']
    _dt = datetime.datetime.strptime(_dt, '%a %b %d %H:%M:%S %z %Y')
    # date is of the format year,
    _usr.join_date = _dt.strftime(User_formats['join_date'])
    _usr.join_time = _dt.strftime(User_formats['join_time'])

    # :type `int`
    _usr.tweets = int(ur['data']['user']['rest_id']['legacy']['statuses_count'])
    _usr.following = int(ur['data']['user']['rest_id']['legacy']['friends_count'])
    _usr.followers = int(ur['data']['user']['rest_id']['legacy']['followers_count'])
    _usr.likes = int(ur['data']['user']['rest_id']['legacy']['favourites_count'])
    _usr.media_count = int(ur['data']['user']['rest_id']['legacy']['media_count'])

    _usr.is_private = ur['data']['user']['rest_id']['legacy']['protected']
    _usr.is_verified = ur['data']['user']['rest_id']['legacy']['verified']
    _usr.avatar = ur['data']['user']['rest_id']['legacy']['profile_image_url_https']
    _usr.background_image = ur['data']['user']['rest_id']['legacy']['profile_banner_url']
    # TODO : future implementation
    # legacy_extended_profile is also available in some cases which can be used to get DOB of user
    return _usr
