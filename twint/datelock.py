import datetime

import logging as logme


class Datelock:
    _until = None
    _since = None
    _since_def_user = None


def convertToDateTime(string):
    dateTimeList = string.split()
    ListLength = len(dateTimeList)
    if ListLength == 2:
        return string
    if ListLength == 1:
        return string + " 00:00:00"
    else:
        return ""


def Set(Until, Since):
    logme.debug(__name__+':Set')
    d = Datelock()

    if Until:
        d._until = datetime.datetime.strptime(convertToDateTime(Until), "%Y-%m-%d %H:%M:%S")
    else:
        d._until = datetime.datetime.today()

    if Since:
        d._since = datetime.datetime.strptime(convertToDateTime(Since), "%Y-%m-%d %H:%M:%S")
        d._since_def_user = True
    else:
        d._since = datetime.datetime.strptime("2006-03-21 00:00:00", "%Y-%m-%d %H:%M:%S")
        d._since_def_user = False

    return d
