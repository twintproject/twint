from . import output
from bs4 import BeautifulSoup
import aiohttp
import async_timeout
import asyncio

class Url:
	def __init__(self, config, init):
		self.config = config
		self.init = init

	async def favorites(self):
		if self.init == -1:
			url = "https://mobile.twitter.com/{0.Username}/favorites?lang=en".format(self.config)
		else:
			url = "https://mobile.twitter.com/{0.Username}/favorites?max_id={1.init}&lang=en".format(self.config, self)
		return url

	async def followers(self):
		if self.init == -1:
			url = "https://mobile.twitter.com/{0.Username}/followers?lang=en".format(self.config)
		else:
			url = "https://mobile.twitter.com/{0.Username}/followers?cursor={1.init}&lang=en".format(self.config, self)
		return url

	async def following(self):
		if self.init == -1:
			url = "https://mobile.twitter.com/{0.Username}/following?lang=en".format(self.config)
		else:
			url = "https://mobile.twitter.com/{0.Username}/following?cursor={1.init}&lang=en".format(self.config, self)
		return url
	
	async def search(self):
		if self.init == -1:
			url = "https://twitter.com/search?f=tweets&vertical=default&lang=en&q="
		else:
			url = "https://twitter.com/i/search/timeline?f=tweets&vertical=default"
			url+= "&lang=en&include_available_features=1&include_entities=1&reset_"
			url+= "error_state=false&src=typd&max_position={0.init}&q=".format(self)

		if self.config.Lang != None:
			url = url.replace("lang=en", "l={0.Lang}&lang=en".format(self.config))
		if self.config.Username != None:
			url+= "from%3A{0.Username}".format(self.config)
		if self.config.Geo != None:
			self.config.Geo = self.config.Geo.replace(" ", "")
			url+= "geocode%3A{0.Geo}".format(self.config)
		if self.config.Search != None:
			self.config.Search = self.config.Search.replace(" ", "%20")
			self.config.Search = self.config.Search.replace("#", "%23")
			url+= "%20{0.Search}".format(self.config)
		if self.config.Year != None:
			url+= "%20until%3A{0.Year}-1-1".format(self.config)
		if self.config.Since != None:
			url+= "%20since%3A{0.Since}".format(self.config)
		if self.config.Until != None:
			url+= "%20until%3A{0.Until}".format(self.config)
		if self.config.Fruit:
			url+= "%20myspace.com%20OR%20last.fm%20OR"
			url+= "%20mail%20OR%20email%20OR%20gmail%20OR%20e-mail"
			url+= "%20OR%20phone%20OR%20call%20me%20OR%20text%20me"
			url+= "%20OR%20keybase"
		if self.config.Verified:
			url+= "%20filter%3Averfied"
		if self.config.To:
			url+= "%20to%3A{0.To}".format(self.config)
		if self.config.All:
			url+= "%20to%3A{0.All}%20OR%20from%3A{0.All}%20OR%20@{0.All}".format(self.config)
		if self.config.Near:
			self.config.Near = self.config.Near.replace(" ", "%20")
			self.config.Near = self.config.Near.replace(",", "%2C")
			url+= "%20near%3A{0.Near}".format(self.config)
		return url

async def Response(session, url):
	with async_timeout.timeout(30):
		async with session.get(url) as response:
			return await response.text()

async def Username(userid):
	connect = aiohttp.TCPConnector(verify_ssl=False)
	async with aiohttp.ClientSession(connector=connect) as session:
		r = await Response(session, "https://twitter.com/intent/user?user_id={}&lang=en".format(userid))
	soup = BeautifulSoup(r, "html.parser")
	return soup.find("a", "fn url alternate-context")["href"].replace("/", "")

async def Tweet(url, config, conn):
	try:
		connect = aiohttp.TCPConnector(verify_ssl=False)
		async with aiohttp.ClientSession(connector=connect) as session:
			response = await Response(session, url)
		soup = BeautifulSoup(response, "html.parser")
		tweet = soup.find("div", "permalink-inner permalink-tweet-container")
		# Experimental
		location = soup.find("span", "ProfileHeaderCard-locationText u-dir").text.replace("\n", "").replace(" ", "").replace(",", ", ")
		await output.Tweets(tweet, location, config, conn)
	except:
		pass
