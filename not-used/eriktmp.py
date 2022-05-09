import main

#print(main.gcp_tweets_to_db())

#print(main.gcp_AppendToFilesJSON())

# TODO: Deal with this error:
"""
Progress for AirTransat: <Response [200]>
Progress for AirCanada: <Response [200]>
Progress for Rouge: <Response [200]>
[!] No more data! Scraping will stop now.
found 0 deleted tweets in this search.
Error opening file /tmp/acvac.json: [Errno 2] No such file or directory: '/tmp/acvac.json'
root@712e19ab50e4:/workspaces/twint# 


AirCanada Search done. Now saving in dbase.
Progress for AirCanada: <Response [200]>. Lstest tweet: 2022-03-31 02:00:45.
Rouge Search done. Now saving in dbase.
Progress for Rouge: <Response [200]>. Lstest tweet: 2022-03-30 21:32:00.
AirCanadaVacations Search done. Now saving in dbase.
Progress for AirCanadaVacations: <Response [200]>. Lstest tweet: None.
WestJet Search done. Now saving in dbase.
Progress for WestJet: <Response [200]>. Lstest tweet: None.
Swoop Search done. Now saving in dbase.
Progress for Swoop: <Response [200]>. Lstest tweet: None.
SunwingVacations Search done. Now saving in dbase.
Progress for SunwingVacations: <Response [200]>. Lstest tweet: None.
Sunwing Search done. Now saving in dbase.
Progress for Sunwing: <Response [200]>. Lstest tweet: None.
Flair Search done. Now saving in dbase.
Progress for Flair: <Response [200]>. Lstest tweet: None.
[!] No more data! Scraping will stop now.
found 0 deleted tweets in this search.
OWG Search done. Now saving in dbase.
Error opening file /tmp/owg.json: [Errno 2] No such file or directory: '/tmp/owg.json'
"""

# ####################
# THIS WORKS
# Based on https://gist.github.com/Zearin/2f40b7b9cfc51132851a
# ####################
def make_cloud_safe(src, dst, func, *args):
    print(src)
    func(*args)
    print(dst)

def speak(txt: str, n: int):
    for i in range(n):
        print(txt)

make_cloud_safe('From here', 'to here.', speak, "hi", 2)

# ####################
# A Class equivalent
# ####################

class MakeCloudSafe():
    def __init__(self, src, dst) -> None:
        self.src = src
        self.dst = dst

    def bucket_file(self, func, *args, **kwargs):
        print(self.src)
        func(*args, **kwargs)
        print(self.dst)

def speak(txt: str, n: int = 0):
    for i in range(n):
        print(txt)

#erik = MakeCloudSafe('From here', 'to here.')
##erik.bucket_file(speak, "hello", 3) # this does work

#MakeCloudSafe('From here', 'to here.').bucket_file(speak, "hoi", n=3)

# ####################
# Is there a decorator equivalent?
# ####################
"""def foo():
    def bar(func):
        def make_cloud_safe(src, dst, *args):
            print(src)
            func(src, dst, *args)
            #print(*args)
            print(dst)
            return func
        return make_cloud_safe
    return bar

@foo
def speak(src, dest, txt: str, n: int = 0):
    for i in range(n):
        print(txt)

speak('From here', 'to here', txt='hi', n='2')"""


main.gcp_tweets_to_file()