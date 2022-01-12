import twint

from datetime import datetime

def get_real_time():
    now = datetime.utcnow()

    year = now.year
    month = now.month
    day = now.day
    hour = now.hour
    if hour < 10:
        hour = "0"+str(hour)
    minute = now.minute
    if minute < 10:
        minute = "0"+str(minute)
    second = now.second

    date_format = str(year)+"-"+str(month)+"-"+str(day)+" "+str(hour)+":"+str(minute)+":"+str(second)
    
    return date_format

# Configure
c = twint.Config()
# c.Database = "covid.db"
c.Search = "covid vaccine OR corona vaccine OR vaccine OR vaccination OR covid-19\
            vaccination OR covid-19 vaccine OR corona\
            vaccination OR biontech OR bion-tech OR sinovac OR covid OR covid-19 OR corona\
            virus OR covid virus OR virus OR corona OR chinese virus"
# c.Search = "covid"
# c.Since = get_real_time()
c.Since = "2021-12-1"
c.Until = "2022-1-1"
c.Lang = "en"
c.Store_csv = True

c.Output = "covid-december.csv"

c.Pandas = True


# Run
twint.run.Search(c)