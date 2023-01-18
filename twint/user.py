import datetime
import logging as logme


class user:
    type = "user"
    name = None
    username = None
    bio = None
    location = None
    url = None
    join_date = None
    join_time = None
    tweets = None
    following = None
    followers = None
    likes = None
    media_count = None
    is_private = None
    avatar = None
    background_image = None
    listed_count = None
    entities = []

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
    _usr = user()
    _usr.id = ur['data']['user']['rest_id']

    if ur['data']['user'].get('legacy'):
        _usr.name = ur['data']['user']['legacy'].get('name', '')
        _usr.username = ur['data']['user']['legacy'].get('screen_name', '')
        _usr.bio = ur['data']['user']['legacy'].get('description', '')
        _usr.location = ur['data']['user']['legacy'].get('location', '')
        _usr.url = ur['data']['user']['legacy'].get('url', '')
        # parsing date to user-friendly format
        _dt = ur['data']['user']['legacy'].get('created_at')
        if _dt:
            _dt = datetime.datetime.strptime(_dt, '%a %b %d %H:%M:%S %z %Y')
            # date is of the format year,
            _usr.join_date = _dt.strftime(User_formats['join_date'])
            _usr.join_time = _dt.strftime(User_formats['join_time'])

        # :type `int`
        _usr.tweets = int(ur['data']['user']['legacy'].get('statuses_count', 0))
        _usr.following = int(ur['data']['user']['legacy'].get('friends_count', 0))
        _usr.followers = int(ur['data']['user']['legacy'].get('followers_count', 0))
        _usr.likes = int(ur['data']['user']['legacy'].get('favourites_count', 0))
        _usr.media_count = int(ur['data']['user']['legacy'].get('media_count', 0))
        _usr.listed_count = int(ur['data']['user']['legacy'].get('listed_count', 0))

        _usr.is_private = ur['data']['user']['legacy'].get('protected')
        _usr.is_verified = ur['data']['user']['legacy'].get('verified')
        _usr.avatar = ur['data']['user']['legacy'].get('profile_image_url_https', '')
        _usr.background_image = ur['data']['user']['legacy'].get('profile_banner_url')
        _usr.entities = ur['data']['user']['legacy'].get('entities')

    # TODO : future implementation
    # legacy_extended_profile is also available in some cases which can be used to get DOB of user
    return _usr
