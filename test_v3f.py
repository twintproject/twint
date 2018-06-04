import  twint

#info comun
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
c.DB_pwd = "init00"


#para sacar los followers de un usuario con y sin  full dator
#################################################################################################
#c.User_full = True
c.Username = "nestorpomar" 
twint.run.Following(c)


print("PROCESO FINALIZADO recoleccion tweets followers")


