"""Similar functions exist in dbcontroller (with same name).

"""

import json
import logging as logme
import sys

# exists in dbcontroller
def tweets_from_file(filepath):
    """Returns a list of tweets in dictionary format from a file in JSON format.

    Removes any duplicates.
    """
    tweets_from_file = []

    try:
        for line in open(filepath, 'r', encoding="utf8"): # without this encoding french characters don't show right; also causes errors for others
            tweets_from_file.append(json.loads(line))
    except IOError as e: 
        logme.error(f"Error opening file {filepath}: {e}")
        sys.exit(1)

    # Remove duplicates in source file
    unique = { each['id'] : each for each in tweets_from_file }.values()
    tweets_from_file = list(unique)

    return tweets_from_file

# Does not necessarily exist in dbcontroller
def tweets_file_to_JSON(filepath, group_entity_id, group_search_id, comment = "NA"):
    """Create a JSON with tweets.

    The filepath points to a file with JSON output from TWINT. The output is meant
    to be processed by Erik's dbcontroller package.

    The resulting JSON represents the following:
    group_entity_id --
    group_search_id --
    comment --
    tweets -- a list of tweets
    """
    """filepath = 'testdata/bmo-small.json'
    group_entity_id = "TEST_FLASK_ENT"
    group_search_id = "TEST_FLASK_HANDLE"
    comment = "Local testing of Flask 2. \U0001f436" """ 

    tweets = []
    for tweet in tweets_from_file(filepath):
        tweets.append(tweet)
            
    # ensure_ascii=False does not seem essential from a processing perspective. But does make a differnce in print(tweet_set)
    tweet_set = json.dumps({'group_entity_id': group_entity_id, 'group_search_id': group_search_id, 'comment': comment, 'tweets': tweets}, ensure_ascii=False)
    
    return tweet_set
