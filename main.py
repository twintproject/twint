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

    date_format = str(year)+"-"+str(month)+"-"+str(day)+" " + \
        str(hour)+":"+str(minute)+":"+str(second)

    return date_format


# Configure
c = twint.Config()
# c.Database = "covid.db"
c.Search = "ukraine OR russia OR russian invasion OR ukraine war OR russian war OR zelensky OR putin OR vladimir putin OR volodymyr zelensky OR ukraine russia OR defence of ukraine"

# c.Search = "CoronaVac OR sinovac OR sinovac biotech OR sinovac biotech vaccine"
# c.Search = "Sputnik OR gamaleya vaccine OR Sputnik V"
# c.Search = "Sinopharm OR Sinopharm OR Sinopharm vaccine OR Sinopharm BIBP"
# c.Search = "moderna OR spikevax"
# c.Search = "Janssen OR Johnson & Johnson vaccine"
# c.Search = "Pfizer–BioNTech OR biontech OR pfizer OR Pfizer BioNTech"
# c.Search = "Oxford–AstraZeneca OR astrazeneca OR oxford vaccine OR Vaxzevria OR Covishield"

# c.Since = get_real_time()
c.Since = "2022-2-24"
c.Until = get_real_time()
c.Lang = "ru"
c.Translate = True
c.TranslateDest = "en"
c.Count = True
c.Store_csv = True

c.Output = "war-russian.csv"

c.Pandas = True


# Run
twint.run.Search(c)
