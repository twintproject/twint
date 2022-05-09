import twint
import joblib
import time
import asyncio

tweets = joblib.load('./tweets.pkl')

for i in range(len(tweets)):
    c = twint.Config()
    c.User_id = tweets[i].user_id
    print(605203235)
    c.Store_object = True
    c.User_full = True
    twint.run.Lookup(c)
    user_location = twint.output.users_list[i].location if 'location' in twint.output.users_list[0].__dict__.keys() else "-"
    
    print("User location empty?: ", user_location=="")


