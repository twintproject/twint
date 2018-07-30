from datetime import datetime
import sqlite3
import sys

def Conn(database):
    if database:
        print("[+] Inserting into Database: " + str(database))
        conn = init(database)
        if isinstance(conn, str):
            print(str)
            sys.exit(1)
    else:
        conn = ""

    return conn

def init(db):
    try:
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        table_tweets = """
            CREATE TABLE IF NOT EXISTS
                tweets (
                    id integer not null,
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
                    link text,
                    retweet bool,
                    user_rt text,
                    mentions text,
                    date_update text not null,
                    PRIMARY KEY (id)
                );
        """
        cursor.execute(table_tweets)

        table_followers_names = """
            CREATE TABLE IF NOT EXISTS
                followers_names (
                    user text not null,
                    date_update text not null,
                    follower text not null,
                    PRIMARY KEY (user, follower)
                );

        """
        cursor.execute(table_followers_names)

        table_following_names = """
            CREATE TABLE IF NOT EXISTS
                following_names (
                    user text not null,
                    date_update text not null,
                    follows text not null,
                    PRIMARY KEY (user, follows)
                );
        """
        cursor.execute(table_following_names)

        table_followers = """
            CREATE TABLE IF NOT EXISTS
                followers (
                    id integer not null,
                    name text,
                    username text not null,
                    bio text,
                    url text,
                    join_date text not null,
                    join_time text not null,
                    tweets integer,
                    following integer,
                    followers integer,
                    likes integer,
                    media integer,
                    private text not null,
                    verified text not null,
                    avatar text not null,
                    date_update text not null,
                    follower text not null,
                    PRIMARY KEY (id, username, follower)
                );
        """
        cursor.execute(table_followers)

        table_following = """
            CREATE TABLE IF NOT EXISTS
                following (
                    id integer not null,
                    name text,
                    username text not null,
                    bio text,
                    location text,
                    url text,
                    join_date text not null,
                    join_time text not null,
                    tweets integer,
                    following integer,
                    followers integer,
                    likes integer,
                    media integer,
                    private text not null,
                    verified text not null,
                    avatar text not null,
                    date_update text not null,
                    follows text not null,
                    PRIMARY KEY (id, username, follows)
                );
        """
        cursor.execute(table_following)

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
        table = fTable(Followers)
        query = f"INSERT INTO {table} VALUES(?,?,?)"
        cursor.execute(query, entry)
        conn.commit()
    except sqlite3.IntegrityError:
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
        table = uTable(Followers)
        query = f"INSERT INTO {table} VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        cursor.execute(query, entry)
        conn.commit()
    except sqlite3.IntegrityError:
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
                    date_time)
        cursor.execute('INSERT INTO tweets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', entry)
        conn.commit()
    except sqlite3.IntegrityError:
        pass
