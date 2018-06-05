from datetime import datetime
import MySQLdb
import sys

def Conn(hostname,Database,db_user,db_pwd):
    if Database:
        print("[+] Inserting into Database: " + str(Database))
        conn = init(hostname,Database,db_user,db_pwd)
        if isinstance(conn, str):
            print(str)
            sys.exit(1)
    else:
        conn = ""

    return conn

def init(hostname,Database,db_user,db_pwd):
    try:
        conn = MySQLdb.connect(host=hostname,    # your host, usually localhost
                     user=db_user,         # your username
                     passwd=db_pwd,  # your password
                     db=Database,# name of the data base
					 charset='utf8mb4',
                     use_unicode=True)          
        cursor = conn.cursor()
       #here would be the code for creating the tables if them don't exist
        return conn
    except Exception as e:
        return str(e)

def fTable(Followers):
    if Followers:
        table = "followers_names"
    else:
        table = "following_names"
    
    return table

def uTable(Followers):
    if Followers:
        table = "followers"
    else:
        table = "following"
    
    return table

def follow(conn, Username, Followers, User):
    try:
        date_time = str(datetime.now())
        cursor = conn.cursor()
        entry = (User, date_time, Username,)
        query = 'INSERT INTO {} VALUES(%s,%s,%s)'.format(fTable(Followers))
        cursor.execute(query, entry)
        conn.commit()
    except MySQLdb.IntegrityError:
        pass

def user(conn, Username, Followers,  User):
    try:
        date_time = str(datetime.now())
        cursor = conn.cursor()
        entry = (User.id,
                User.name,
                User.username,
                User.bio,
                User.location,
                User.url,
                User.join_date,
                User.join_time,
                User.tweets,
                User.following,
                User.followers,
                User.likes,
                User.media_count,
                User.is_private,
                User.is_verified,
                User.avatar, 
                date_time,
                Username,)
        query = 'INSERT INTO {} VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)'.format(uTable(Followers))
        cursor.execute(query, entry)
        conn.commit()
 
    except MySQLdb.IntegrityError:
        pass
           

def tweets(conn, Tweet, config):
    try:
        date_time = str(datetime.now())
        cursor = conn.cursor()
        entry = (Tweet.id,
                    Tweet.user_id,
                    Tweet.datestamp,
                    Tweet.timestamp,
                    Tweet.timezone,
                    Tweet.location,
                    Tweet.username,
                    Tweet.tweet,
                    Tweet.replies,
                    Tweet.likes,
                    Tweet.retweets,
                    ",".join(Tweet.hashtags),
                    Tweet.link,
                    Tweet.retweet,
                    Tweet.user_rt,
                    ",".join(Tweet.mentions),
                    date_time,
                    config.search_name,)
        cursor.execute('INSERT INTO tweets VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', entry)
        conn.commit()
    except MySQLdb.IntegrityError:
        pass
