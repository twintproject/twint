import xml.etree.ElementTree as ET
import os

DIR = os.path.dirname(os.path.realpath(__file__))
AGENT_TAG = 'useragent'
KEY_TAG = 'description'
XML_FILE = DIR+'/data/useragentswitcher.xml'

def load_file(path):
    tree = ET.parse(path)
    return tree.getroot()

def get_agents(root = load_file(XML_FILE),agent_tag=AGENT_TAG,key_tag=KEY_TAG):
    '''
    Function for loading a disctionary of user_agent headers
    :param root:, an xml root object created by element tree
    :param KEY_TAG: keys which tag each user agent in root
    :param AGENT_TAG: tags for each user_agent in root
    :return: an unsorted dictionay of user_agent headers keyed by operating system
    '''
    keys = [x.get(key_tag) for x in root.iter(agent_tag)]
    values = [x.get(agent_tag) for x in root.iter(agent_tag)]
    return dict(zip(keys,values))
