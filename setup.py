#!/usr/bin/python3
from setuptools import setup
import io
import os

# Package meta-data
NAME = 'twint'
DESCRIPTION = 'An advanced Twitter scraping & OSINT tool.'
URL = 'https://github.com/twintproject/twint'
EMAIL = 'codyzacharias@pm.me'
AUTHOR = 'Cody Zacharias'
REQUIRES_PYTHON = '>=3.6.0'
VERSION = None

# Packages required
REQUIRED = [
    'aiohttp', 'aiodns', 'beautifulsoup4', 'cchardet', 'dataclasses',
    'elasticsearch', 'pysocks', 'pandas', 'aiohttp_socks',
    'schedule', 'geopy', 'fake-useragent', 'googletransx'
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
    long_description_content_type="text/markdown",
    author=AUTHOR,
    author_email=EMAIL,
    python_requires=REQUIRES_PYTHON,
    url=URL,
    packages=['twint', 'twint.storage'],
    entry_points={
        'console_scripts': [
            'twint = twint.cli:run_as_command',
        ],
    },
    install_requires=REQUIRED,
    dependency_links=[
        'git+https://github.com/x0rzkov/py-googletrans#egg=googletrans'
    ],
    license='MIT',
    classifiers=[
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: Implementation :: CPython',
    ],
)
