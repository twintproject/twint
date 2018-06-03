import  twint


c = twint.Config()
c.Count = True
c.Limit = "5000"
"""
#output csv
c.Output = "file.csv"
c.Store_csv = True
"""
#output database
c.hostname="localhost"
c.Database = "twitterdata_v9"
c.DB_user = "root"
c.DB_pwd = "password"


#################################################################################################
c.search_name ="testmysql1_es"

c.Search = "3dprinter"

c.Since = "2017-09-01"
c.Until = "2017-11-02"
c.Lang = "es"
twint.run.Search(c) #busca tweets

