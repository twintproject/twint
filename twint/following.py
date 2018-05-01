from . import feed, get, db, output
from bs4 import BeautifulSoup
import aiohttp
import asyncio
import re
import sys

class Following:
	def __init__(self, config):
		self.init = -1
		self.feed = [-1]
		self.count = 0
		self.config = config

		if self.config.Database:
			print("Inserting into Database: " + str(self.config.Database))
			self.conn = db.init(self.config.Database)
			if isinstance(self.conn, str):
				print(str)
				sys.exit(1)
		
		loop = asyncio.get_event_loop()
		loop.run_until_complete(self.main())

	async def Feed(self):
		ua = {'User-Agent': 'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/0.8.12'}
		connect = aiohttp.TCPConnector(verify_ssl=False)
		async with aiohttp.ClientSession(headers=ua, connector=connect) as session:
			response = await get.Response(session, await get.Url(self.config,
				self.init).following())
		self.feed = []
		try:
			self.feed, self.init = feed.Follow(response)
		except Exception as e:
			pass
		return self.feed

	async def following(self):
		await self.Feed()
		for f in self.feed:
			User = await output.getUser(f)
			if self.config.Database:
				db.following(self.conn, self.config.Username, User.name)

			if self.config.Output != None:
				output.write(User.name, self.config.Output)
			
			self.count += 1
			print(User.name)

	async def main(self):
		if self.config.User_id is not None:
			self.config.Username = await get.Username(self.config.User_id)
		while True:
			if len(self.feed) > 0:
				await self.following()
			else:
				break
			
			if self.config.Limit is not None and self.count >= int(self.config.Limit):
				break

		if self.config.Count:
			print("[+] Finished: Successfully collected all {0.count} users who @{0.config.Username} follows.".format(self))
