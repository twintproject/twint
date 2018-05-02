import datetime
import sqlite3

def init(db):
	try:
		conn = sqlite3.connect(db)
		cursor = conn.cursor()
		table_tweets = """
			CREATE TABLE IF NOT EXISTS
				tweets (
					id integer primary key,
					user_id integer,
					date text not null,
					time text not null,
					timezone text not null,
					location text not null,
					user text not null,
					tweet text not null,
					replies integer,
					likes integer,
					retweets integer,
					hashtags text,
					link text
				);
		"""
		cursor.execute(table_tweets)
		table_users = """
			CREATE TABLE IF NOT EXISTS
				users (
					user text,
					date_update text not null,
					num_tweets integer,
					PRIMARY KEY (user, date_update)
				);
		"""
		cursor.execute(table_users)
		table_search = """
			CREATE TABLE IF NOT EXISTS
				searches (
					user text,
					date_update text not null,
					num_tweets integer,
					search_keyword text,
					PRIMARY KEY (user, date_update, search_keyword)
				);
		"""
		cursor.execute(table_search)
		table_followers = """
			CREATE TABLE IF NOT EXISTS
				followers (
					user text not null,
					date_update text not null,
					follower text not null,
					PRIMARY KEY (user, follower)
				);
		"""
		cursor.execute(table_followers)
		table_following = """
			CREATE TABLE IF NOT EXISTS
				following (
					user text not null,
					date_update text not null,
					follows text not null,
					PRIMARY KEY (user, follows)
				);
		"""
		cursor.execute(table_following)
		return conn
	except Exception as e:
		return str(e)

def following(conn, user, follow):
	try:
		date_time = str(datetime.datetime.now())
		cursor = conn.cursor()
		entry = (user, date_time, follow,)
		cursor.execute('INSERT INTO following VALUES(?,?,?)', entry)
		conn.commit()
	except sqlite3.IntegrityError:
		pass

def followers(conn, user, follow):
	try:
		date_time = str(datetime.datetime.now())
		cursor = conn.cursor()
		entry = (user, date_time, follow,)
		cursor.execute('INSERT INTO followers VALUES(?,?,?)', entry)
		conn.commit()
	except sqlite3.IntegrityError:
		pass

def tweets(conn, Tweet):
	try:
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
				Tweet.link,)
		cursor.execute("INSERT INTO tweets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", entry)
		conn.commit()
	except sqlite3.IntegrityError:
		pass
