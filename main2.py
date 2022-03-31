"""March 31, 2022 - probably delete. Here for reference for today."""

    group_entity_id = entity["group_entity_id"]
        group_search_id = entity["search"]
        params = {'group_entity_id': group_entity_id}
        #params = {'group_entity_id':"TD_Canada"]}
        
        # TODO: set this back on
        #response = requests.get(url = url_latest_tweet, params = params)
        #most_recent_tweet_date = response.text
        most_recent_tweet_date = 'abc'

        # if response != 200 there is an error
        #if most_recent_tweet_date != "None": # search without from_ date
         #   print("Tweetdate {}: {}".format(entity["group_entity_id"], most_recent_tweet_date))
        
        # TODO: do something with datesearch

        c.Search = group_search_id 
        twint.run.Search(c)
        tweets_df = twint.storage.panda.Tweets_df
        tweets_json = tweets_df.to_json(orient = "records", force_ascii=False)
        tweets_dict = json.loads(tweets_json)

        # TODO: no tweets actually get loaded. Landing session data does. Twice somehow.
        # There is an error message in some part of the web calls. IS MY JSON WELL FORMATTED
        tweet_set = json.dumps({'group_entity_id': group_entity_id, 'group_search_id': group_search_id, 'comment': comment, 'tweets': tweets_dict}, ensure_ascii=False)
        headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'} # 'Content-Type' is essential; 'Accept' not sure.
        response = requests.post(url_capture_tweets, data=tweet_set.encode('utf-8'), headers = headers) # .encode('utf-8') is essential
        print("Response {}: {}".format(group_entity_id, response.text))