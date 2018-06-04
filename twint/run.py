from . import favorites, follow, profile, search
from asyncio import get_event_loop

def run(x):
    get_event_loop().run_until_complete(x)

def Favorites(config):
    config.Favorites = True
    run(favorites.Favorites(config).main())

def Followers(config):
    config.Followers = True
    run(follow.Follow(config).main())

def Following(config):
    config.Following = True
    run(follow.Follow(config).main())

def Profile(config):
    config.Profile = True
    run(profile.Profile(config).main())

def Search(config):
    config.TwitterSearch = True
    run(search.Search(config).main())
