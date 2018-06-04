#!/usr/bin/python3
from setuptools import setup
import io
import os
import sys

# Package meta-data
NAME = 'twint'
DESCRIPTION = 'An advanced Twitter scraping & OSINT tool.'
URL = 'https://github.com/haccer/twint'
EMAIL = 'codyzacharias@pm.me'
AUTHOR = 'Cody Zacharias'
REQUIRES_PYTHON = '>=3.5.0'
VERSION = None

# Packages required
REQUIRED = [
		'aiohttp', 'aiodns', 'beautifulsoup4', 'cchardet', 'elasticsearch'
		]

here = os.path.abspath(os.path.dirname(__file__))

with io.open(os.path.join(here, 'README.md'), encoding='utf-8') as f:
	long_description = '\n' + f.read()

# Load the package's __version__.py
about = {}
if not VERSION:
	with open(os.path.join(here, NAME, '__version__.py')) as f:
		exec(f.read(), about)
else:
	about['__version__'] = VERSION

setup(
	name=NAME,
	version=about['__version__'],
	description=DESCRIPTION,
	long_description=long_description,
	author=AUTHOR,
	author_email=EMAIL,
	python_requires=REQUIRES_PYTHON,
	url=URL,
	packages=['twint'],
	install_requires=REQUIRED,
	license='MIT',
	classifiers=[
		'License :: OSI Approved :: MIT License',
		'Programming Language :: Python',
		'Programming Language :: Python :: 3',
		'Programming Language :: Python :: 3.5',
		'Programming Language :: Python :: 3.6'
		],
)
