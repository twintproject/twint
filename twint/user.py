import datetime
import logging as logme


class user:
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
    _usr = user()
    _usr.id = ur['data']['user']['rest_id']

    legacy_props = {
        'name': 'name',
        'screen_name': 'username',
        'description': 'bio',
        'location': 'location',
        'url': 'url',
        'protected': 'is_private',
        'verified': 'is_verified',
        'profile_image_url_https': 'avatar',
        'profile_banner_url': 'background_image',
        'media_count': 'media_count'}
    for prop, user_prop in legacy_props.items():
        _usr.__dict__[user_prop] = ur['data']['user']['legacy'].get(prop, None)

    # parsing date to user-friendly format
    if 'created_at' in ur['data']['user']['legacy']:
        _dt = ur['data']['user']['legacy']['created_at']
        _dt = datetime.datetime.strptime(_dt, '%a %b %d %H:%M:%S %z %Y')
        # date is of the format year,
        _usr.join_date = _dt.strftime(User_formats['join_date'])
        _usr.join_time = _dt.strftime(User_formats['join_time'])

    # :type `int`
    legacy_props = {
        'statuses_count': 'tweets',
        'friends_count': 'following',
        'followers_count': 'followers',
        'favourites_count': 'likes',
        'media_count': 'media_count'}
    for prop, user_prop in legacy_props.items():
        value = ur['data']['user']['legacy'].get(prop, None)
        if value:
            _usr.__dict__[user_prop] = int(value)

    # TODO : future implementation
    # legacy_extended_profile is also available in some cases which can be
    # used to get DOB of user
    return _usr
