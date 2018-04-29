from bs4 import BeautifulSoup
import json
import re

def Follow(response):
	soup = BeautifulSoup(response, "html.parser")
	follow = soup.find_all("td", "info fifty screenname")
	cursor = soup.find_all("div", "w-button-more")
	try:
		cursor = re.findall(r'cursor=(.*?)">', str(cursor))[0]
	except:
		pass
	return follow, cursor

def Favorite(response):
	soup = BeautifulSoup(response, "html.parser")
	tweets = soup.find_all("span", "metadata")
	max_id = soup.find_all("div", "w-button-more")
	try:
		max_id = re.findall(r'max_id=(.*?)">', str(max_id))[0]
	except:
		pass
	return tweets, max_id

def Initial(response):
	soup = BeautifulSoup(response, "html.parser")
	feed = soup.find_all("li", "js-stream-item")
	init = "TWEET={}-{}".format(feed[-1]["data-item-id"], feed[0]["data-item-id"])
	return feed, init

def Cont(response):
	json_response = json.loads(response)
	html = json_response["items_html"]
	soup = BeautifulSoup(html, "html.parser")
	feed = soup.find_all("li", "js-stream-item")
	split = json_response["min_position"].split("-")
	split[1] = feed[-1]["data-item-id"]
	return feed, "-".join(split)
