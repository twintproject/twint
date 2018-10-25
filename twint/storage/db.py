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

        table_users = """
            CREATE TABLE IF NOT EXISTS
                users(
                    id integer not null,
                    id_str text not null,
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
                    private integer not null,
                    verified integer not null,
                    profile_image_url text not null,
                    background_image text,
                    date_update text not null,
                    CONSTRAINT users_pk PRIMARY KEY (id)
                );
            """
        cursor.execute(table_users)

        table_tweets = """
            CREATE TABLE IF NOT EXISTS
                tweets (
                    id integer not null,
                    id_str text not null,
                    tweet text default '',
                    conversation_id text not null,
                    created_at integer not null,
                    date text not null,
                    time text not null,
                    timezone text not null,
                    place text default '',
                    location text not null,
                    replies_count integer,
                    likes_count integer,
                    retweets_count integer,
                    user_id integer not null,
                    user_id_str text not null,
                    screen_name text not null,
                    name text default '',
                    profile_image_url text,
                    link text,
                    gif_url text,
                    gif_thumb text,
                    video_url text,
                    video_thumb text,
                    is_reply_to integer,
                    has_parent_tweet integer,
                    in_reply_to_screen_name text defualt '',
                    in_reply_to_status_id integer,
                    in_reply_to_status_id_str text default '',
                    in_reply_to_user_id integer,
                    in_reply_to_user_id_str text default '',
                    is_quote_status integer,
                    quote_id integer,
                    quote_id_str text,
                    quote_url text,
                    date_update text not null,
                    PRIMARY KEY (id)
                );
        """
        cursor.execute(table_tweets)

        table_retweets = """
            CREATE TABLE IF NOT EXISTS
                retweets(
                    user_id integer not null,
                    tweet_id integer not null,
                    CONSTRAINT retweets_pk PRIMARY KEY(user_id, tweet_id),
                    CONSTRAINT user_id_fk FOREIGN KEY(user_id) REFERENCES users(id),
                    CONSTRAINT tweet_id_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id)
                );
        """
        cursor.execute(table_retweets)

        table_mentions = """
            CREATE TABLE IF NOT EXISTS
                mentions(
                    tweet_id integer not null,
                    id integer not null,
                    id_str text not null,
                    screen_name text not null,
                    CONSTRAINT mentions_pk PRIMARY KEY(tweet_id,id),
                    CONSTRAINT tweet_id_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id)
                    CONSTRAINT user_id_fk FOREIGN KEY(id) REFERENCES users(id)
                );
        """
        cursor.execute(table_mentions)

        table_replies = """
            CREATE TABLE IF NOT EXISTS
                replies(
                    tweet_id integer not null,
                    id integer not null,
                    id_str text not null,
                    screen_name text not null,
                    CONSTRAINT replies_pk PRIMARY KEY(tweet_id,id),
                    CONSTRAINT tweet_id_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id)
                    CONSTRAINT user_id_fk FOREIGN KEY(id) REFERENCES users(id)
                );
        """
        cursor.execute(table_replies)

        table_tags = """
            CREATE TABLE IF NOT EXISTS
                tags(
                    tweet_id integer not null,
                    id integer not null,
                    id_str text not null,
                    screen_name text not null,
                    CONSTRAINT tags_pk PRIMARY KEY(tweet_id, id),
                    CONSTRAINT tweet_id_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id),
                    CONSTRAINT user_id_fk FOREIGN KEY(id) REFERENCES users(id)
                );
        """
        cursor.execute(table_tags)

        table_hashtags = """
            CREATE TABLE IF NOT EXISTS
                hashtags(
                    tweet_id integer not null,
                    tag_name text not null,
                    CONSTRAINT tweet_id_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id)
                );
        """
        cursor.execute(table_hashtags)

        table_urls = """
            CREATE TABLE IF NOT EXISTS
                urls(
                    tweet_id integer not null,
                    url text not null,
                    CONSTRAINT urls_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id)
                );
        """
        cursor.execute(table_urls)

        table_photos = """
            CREATE TABLE IF NOT EXISTS
                photos(
                    tweet_id integer not null,
                    url text not null,
                    CONSTRAINT photos_fk FOREIGN KEY(tweet_id) REFERENCES tweets(id)
                );
        """
        cursor.execute(table_photos)

        table_favorites =  """
            CREATE TABLE IF NOT EXISTS
                favorites(
                    user_id integer not null,
                    tweet_id integer not null,
                    CONSTRAINT favorites_pk PRIMARY KEY (user_id, tweet_id),
                    CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users(id),
                    CONSTRAINT tweet_id_fk FOREIGN KEY (tweet_id) REFERENCES tweets(id)
                );
        """
        cursor.execute(table_favorites)

        table_followers = """
            CREATE TABLE IF NOT EXISTS
                followers (
                    id integer not null,
                    follower_id integer not null,
                    CONSTRAINT followers_pk PRIMARY KEY (id, follower_id),
                    CONSTRAINT id_fk FOREIGN KEY(id) REFERENCES users(id),
                    CONSTRAINT follower_id_fk FOREIGN KEY(follower_id) REFERENCES users(id)
                );
        """
        cursor.execute(table_followers)

        table_following = """
            CREATE TABLE IF NOT EXISTS
                following (
                    id integer not null,
                    following_id integer not null,
                    CONSTRAINT following_pk PRIMARY KEY (id, following_id),
                    CONSTRAINT id_fk FOREIGN KEY(id) REFERENCES users(id),
                    CONSTRAINT following_id_fk FOREIGN KEY(following_id) REFERENCES users(id)
                );
        """
        cursor.execute(table_following)

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

def user(conn, config,  User):
    try:
        date_time = str(datetime.now())
        cursor = conn.cursor()
        entry = (int(User.id),
                User.id,
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
                User.background_image,
                date_time)
        query = f"INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        cursor.execute(query, entry)

        if config.Followers or config.Following:
            table = uTable(config.Followers)
            query = f"INSERT INTO {table} VALUES(?,?)"
            cursor.execute(query, (config.User_id, int(User.id)))

        conn.commit()
    except sqlite3.IntegrityError:
        pass

def get_user_id(conn, id):
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE id = ? LIMIT 1', (id,))
    resultset = cursor.fetchall()
    return resultset[0][0] if resultset else -1

def tweets(conn, Tweet, config):
    try:
        date_time = str(datetime.now())
        cursor = conn.cursor()
        entry = (Tweet.id,
                    Tweet.id_str,
                    Tweet.tweet,
                    Tweet.conversation_id,
                    Tweet.datetime,
                    Tweet.datestamp,
                    Tweet.timestamp,
                    Tweet.timezone,
                    Tweet.place,
                    Tweet.location,
                    Tweet.replies_count,
                    Tweet.likes_count,
                    Tweet.retweets_count,
                    Tweet.user_id,
                    Tweet.user_id_str,
                    Tweet.username,
                    Tweet.name,
                    Tweet.profile_image_url,
                    Tweet.link,
                    Tweet.gif_url,
                    Tweet.gif_thumb,
                    Tweet.video_url,
                    Tweet.video_thumb,
                    Tweet.is_reply_to,
                    Tweet.has_parent_tweet,
                    Tweet.in_reply_to_screen_name,
                    Tweet.in_reply_to_status_id,
                    Tweet.in_reply_to_status_id_str,
                    Tweet.in_reply_to_user_id,
                    Tweet.in_reply_to_user_id_str,
                    Tweet.is_quote_status,
                    Tweet.quote_id,
                    Tweet.quote_id_str,
                    Tweet.quote_url,
                    date_time)
        cursor.execute('INSERT INTO tweets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', entry)

        if len(Tweet.mentions) > 0:
            query = 'INSERT INTO mentions VALUES(?, ?, ?, ?)'
            for mention in Tweet.mentions:
                cursor.execute(query, (Tweet.id, mention["id"], mention["id_str"], mention["screen_name"]))

        if len(Tweet.replies) > 0:
            query = 'INSERT INTO replies VALUES(?, ?, ?, ?)'
            for reply in Tweet.replies:
                cursor.execute(query, (Tweet.id, reply["id"], reply["id_str"], reply["screen_name"]))

        if len(Tweet.tags) > 0:
            query = 'INSERT INTO tags VALUES(?, ?, ?, ?)'
            for tag in Tweet.tags:
                cursor.execute(query, (Tweet.id, tag["id"], tag["id_str"], tag["screen_name"]))

        if len(Tweet.hashtags) > 0:
            query = 'INSERT OR IGNORE INTO hashtags (tweet_id, tag_name) VALUES(?,?)'
            for tag in Tweet.hashtags:
                cursor.execute(query, (Tweet.id, tag))

        if len(Tweet.urls) > 0:
            query = 'INSERT INTO urls VALUES(?, ?)'
            for url in Tweet.urls:
                cursor.execute(query, (Tweet.id, url))

        if len(Tweet.photos) > 0:
            query = 'INSERT INTO photos VALUES(?, ?)'
            for photo in Tweet.photos:
                cursor.execute(query, (Tweet.id, photo))

        if config.Favorites:
            query = 'INSERT INTO favorites VALUES(?,?)'
            cursor.execute(query, (config.User_id, Tweet.id))

        if Tweet.retweet == 1:
            query = 'INSERT INTO retweets VALUES(?,?)'
            cursor.execute(query, (config.User_id, Tweet.id))

        conn.commit()
    except sqlite3.IntegrityError:
        pass