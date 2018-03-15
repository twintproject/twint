#!/usr/bin/env python

from distutils.core import setup

setup(name='pyTweep',
      version='1.0',
      description='an advanced twitter scraping tool based on tweep.py but with python outputs, iteration, and with Tor ip routing and user agent randomization',
      author='Cole Robertson',
      author_email='cbjrobertson@gmail.com',
      url='https://github.com/cbjrobertson/tweep.git',
      packages=['pyTweep'],
      package_data = {'pyTweep':['data/*.xml']}
      )
