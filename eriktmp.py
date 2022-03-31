import main

print(main.gcp_tweets_to_db())

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