'''
TWINT - Twitter Intelligence Tool (formerly known as Tweep).

See wiki on Github for in-depth details.
https://github.com/twintproject/twint/wiki

Licensed under MIT License
Copyright (c) 2018 Cody Zacharias
'''
import logging, os

from .config import Config
from .__version__ import __version__
from . import run

_levels = {
    'info': logging.INFO,
    'debug': logging.DEBUG
}

_level = os.getenv('TWINT_DEBUG', 'info')
_logLevel = _levels[_level]
logger = logging.getLogger('twint')
logger.setLevel(_logLevel)

if _level == 'debug':
    _output_fn = 'twint.log'
    formatter = logging.Formatter('%(levelname)s:%(asctime)s:%(name)s:%(message)s')
    fileHandler = logging.FileHandler(_output_fn)
    fileHandler.setLevel(_logLevel)
    fileHandler.setFormatter(formatter)
    logger.addHandler(fileHandler)
