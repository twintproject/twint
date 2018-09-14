import requests
import json

API_BASE = "https://api.twitter.com/1.1/guest/activate.json"
API_URL = "https://api.twitter.com/2/timeline/conversation/{}.json?tweet_mode=extended"

def getGuestToken(url, config):
    guest_token = requests.post(API_BASE, headers = {
            'Authorization': config.Bearer_token,
            'Referer': url
        }).json()
    return guest_token["guest_token"]

def getVideo(link, config):
    tweet_id = link.split('/')[-1]
    apiURL = API_URL.format(tweet_id)
    guest_token = getGuestToken(link, config)
    response = requests.get(apiURL, headers={
            'Authorization': config.Bearer_token,
            'x-guest-token': guest_token,
        })
    video_thumb = response['globalObjects']['tweets'][tweet_id]['extended_entities']['media'][0]['media_url']
    video_info = response['globalObjects']['tweets'][tweet_id]['extended_entities']['media'][0]['video_info']['variants']
    filtered_variants = [x for x in video_info if 'bitrate' in x]
    video_url = sorted(filtered_variants, key=lambda k:k["bitrate"])[-1]["url"].split("?")[0]
    return (video_url, video_thumb)
