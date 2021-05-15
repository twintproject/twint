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
    user_json = ur['data']['user']
    _usr.id = user_json['rest_id']

    if 'legacy' in user_json.keys():
        legacy_json = user_json['legacy']
        _usr.name = legacy_json['name']
        _usr.username = legacy_json['screen_name']
        _usr.bio = legacy_json['description'] if 'description' in legacy_json.keys() else None
        _usr.location = legacy_json['location'] if 'location' in legacy_json.keys() else None
        _usr.url = legacy_json['url'] if 'url' in legacy_json.keys() else None
        # parsing date to user-friendly format
        _dt = legacy_json['created_at']
        _dt = datetime.datetime.strptime(_dt, '%a %b %d %H:%M:%S %z %Y')
        # date is of the format year,
        _usr.join_date = _dt.strftime(User_formats['join_date'])
        _usr.join_time = _dt.strftime(User_formats['join_time'])

        # :type `int`
        _usr.tweets = int(legacy_json['statuses_count'])
        _usr.following = int(legacy_json['friends_count'])
        _usr.followers = int(legacy_json['followers_count'])
        _usr.likes = int(legacy_json['favourites_count'])
        _usr.media_count = int(legacy_json['media_count']) if 'media_count' in legacy_json.keys() else None
        _usr.listed_count = int(legacy_json['listed_count']) if 'listed_count' in legacy_json.keys() else None

        _usr.is_private = legacy_json['protected']
        _usr.is_verified = legacy_json['verified']
        _usr.avatar = legacy_json['profile_image_url_https']
        _usr.background_image = legacy_json[
            'profile_banner_url'] if 'profile_banner_url' in legacy_json.keys() else None
        _usr.entities = legacy_json['entities'] if 'entities' in legacy_json.keys() else None

    # TODO : future implementation
    # legacy_extended_profile is also available in some cases which can be used to get DOB of user
    return _usr
