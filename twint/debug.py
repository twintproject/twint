import datetime
import sys

def Write(e, func, output):
		now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
		msg = "[{}] {} - {}".format(now, func, e)
		if output:
				print(msg, file=open(output, "a", encoding="utf-8"))
		print(msg, file=open("twint_debug.log", "a", encoding="utf-8"))
		print(msg)
