from . import datelock, db, get, feed, output
from bs4 import BeautifulSoup
import aiohttp
import asyncio
import datetime
import re
import sys

class Search:
	def __init__(self, config):
		self.init = -1
		self.initial = -1
		self.feed = [-1]
		self.count = 0
		self.config = config
		self.d = datelock.Set(self.config)
		
		if self.config.Elasticsearch:
			print("Indexing to Elasticsearch @ " + str(self.config.Elasticsearch))

		if self.config.Database:
			print("Inserting into Database: " + str(self.config.Database))
			self.conn = db.init(self.config.Database)
			if isinstance(self.conn, str):
				print(str)
				sys.exit(1)
		else:
			self.conn = ""

		if not self.config.Timedelta:
			if (self.d._until - self.d._since).days > 30:
				self.config.Timedelta = 30
			else:
				self.config.Timedelta = (self.d._until - self.d._since).days

		loop = asyncio.get_event_loop()
		loop.run_until_complete(self.main())

	async def Feed(self):
		connect = aiohttp.TCPConnector(verify_ssl=False)
		async with aiohttp.ClientSession(connector=connect) as session:
			response = await get.Response(session, await get.Url(self.config, self.init).search())
		self.feed = []
		try:
			if self.init == -1:
				self.feed, self.init = feed.Initial(response)
			else:
				self.feed, self.init = feed.Cont(response)
		except:
			pass

	async def tweets(self):
		await self.Feed()
		if self.initial != -1: # Temporary fix
			for tweet in self.feed:
				self.count += 1
				await output.Tweets(tweet, self.config, self.conn)
		else:
			self.initial = 0

	async def main(self):
		if self.config.User_id is not None:
			self.config.Username = await get.Username(self.config.User_id)
		if self.config.Since and self.config.Until:
			while self.d._since < self.d._until:
				self.config.Since = str(self.d._until - datetime.timedelta(days=int(self.config.Timedelta)))
				self.config.Until = str(self.d._until)
				if len(self.feed) > 0:
					await self.tweets()
				else:
					self.d._until = self.d._until - datetime.timedelta(days=int(self.config.Timedelta))
					self.feed = [-1]

				if self.config.Limit is not None and self.count >= int(self.config.Limit):
					self.d._until = self.d._until - datetime.timedelta(days=int(self.config.Timedelta))
					self.feed = [-1]
		else:
			while True:
				if len(self.feed) > 0:
					await self.tweets()
				else:
					break 
				
				if self.config.Limit is not None and self.count >= int(self.config.Limit):
					break

		if self.config.Count:
			print("[+] Finished: Successfully collected {0.count} Tweets.".format(self))
