import datetime

class Datelock:
	_until = None
	_since = None
	_since_def_user = None

def Set(config):
	d = Datelock()

	if config.Until:
		d._until = datetime.datetime.strptime(config.Until, "%Y-%m-%d").date()
	else:
		d._until = datetime.date.today()

	if config.Since:
		d._since = datetime.datetime.strptime(config.Since, "%Y-%m-%d").date()
		d._since_def_user = True
	else:
		d._since = datetime.datetime.strptime("2006-03-21", "%Y-%m-%d").date() # the 1st tweet
		d._since_def_user = False

	return d
