'''
Main for Flask app in Google Cloud's AppEngine

TODO: Maybe can specify a file name instead of relying on 'main.py'?
'''

import twint

def TweetSearch():
    c = twint.Config()
    c.Search = "CIBC"
    c.Limit = 2
    twint.run.Search(c)
    
    return 200



if __name__ == "__main__":
    # Used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    
    #app.run(host="localhost", port=8080, debug=True)

    print(TweetSearch())
