import twint
import schedule
import time

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

# you can change the name of each "job" after "def" if you'd like.
def get_tweets():
	c = twint.Config()
	c.Search = "chickens rule"
	c.Limit = "5000"
	c.Since = get_real_time()
	c.Store_csv = True

	c.Output = "covid_real_time_test8.csv"

	c.Pandas = True
 
	# Run
	twint.run.Search(c)


# run once when you start the program

get_tweets()

# run every minute(s), hour, day at, day of the week, day of the week and time. Use "#" to block out which ones you don't want to use.  Remove it to active. Also, replace "jobone" and "jobtwo" with your new function names (if applicable)

schedule.every(30).seconds.do(get_tweets)
# schedule.every(1).minutes.do(get_tweets)
# schedule.every().hour.do(get_tweets)
# schedule.every().day.at("10:30").do(jobone)
# schedule.every().monday.do(jobone)
# schedule.every().wednesday.at("13:15").do(jobone)

while True:
  schedule.run_pending()
  time.sleep(1)
