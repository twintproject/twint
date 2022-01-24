import twint
c = twint.Config()

#search term
c.Search = "guns"
#account to get tweets from
c.Username = "POTUS"

#info wanted about tweet
c.Custom["tweet"] = ["id", "tweet"]
#info wanted about user
c.Custom["user"] = ["bio"]

#output as csv
c.Store_csv = True
#put data in folder "data"
c.Output = "data"

twint.run.getCustomData(c)



                



