import logging as logme
import re
import sys
import time
import os

import requests
from requests import Request
from torpy.http.requests import tor_requests_session as tor_session
from torpy.circuit import CellTimeoutError


class TokenExpiryException(Exception):
    def __init__(self, msg):
        super().__init__(msg)


class Token:
    def __init__(self, config):
        self._session = None
        self.config = config
        self._retries = 10
        self._timeout = 10
        self.url = 'https://twitter.com'
        self._get_new_session()

    # TODO: would need to modify this when twint proxy feature is implemented here, so that correct proxy is used
    def _get_new_session(self, session_type=None):
        if self._session is not None:
            logme.debug(__name__ + ':closing old session to create a new one')
            try:
                self._session.close()
            except AttributeError:
                pass
        if session_type == 'tor' or self.config.Tor_guest:
            logme.info(__name__ + ':[TOR SESSION] Creating new TOR Session. Please give it a couple of seconds...')
            print('[TOR SESSION] Creating new TOR Session. Please give it a couple of seconds...')
            self._session = tor_session(hops_count=2)
            self.config.Tor_guest = True
        else:
            self._session = requests.session()
            if 'http_proxy' in os.environ:
                self._session.proxies['http'] = os.environ['http_proxy']
            if 'https_proxy' in os.environ:
                self._session.proxies['https'] = os.environ['https_proxy']

    def _request(self):
        for attempt in range(self._retries + 1):
            # The request is newly prepared on each retry because of potential cookie updates.
            logme.debug(__name__ + f':Retrieving {self.url}')
            twitter_request = Request('GET', self.url).prepare()
            try:
                if self.config.Tor_guest:
                    logme.debug(__name__ + ':using TOR to fetch the Guest Token.')
                    if self.config.Debug:
                        with self._session as f:
                            logme.debug(__name__ + f":IP: {f.send(Request('GET', 'https://ident.me').prepare()).text}")
                    with self._session as f:
                        res = f.send(twitter_request).text

                else:
                    res = requests.get(self.url, timeout=self._timeout).text
            except (CellTimeoutError, TimeoutError, requests.exceptions.ConnectTimeout) as exc:
                if attempt < self._retries:
                    self._get_new_session('tor')
                    retrying = ', retrying'
                    level = logme.WARNING
                else:
                    retrying = ''
                    level = logme.ERROR
                logme.log(level, f'Error retrieving {self.url}: {exc!r}{retrying}')
            else:
                logme.debug(__name__ + f':{self.url} retrieved successfully')
                match = re.search(r'\("gt=(\d+);', res)
                if match:
                    logme.debug(__name__ + f":Found guest token in HTML: {match.group(1)}")
                    self.config.Guest_token = str(match.group(1))
                    return 1  # success
                else:
                    logme.info(__name__ + ':could not get the Guest Token in HTML. Hold Up!')
                    self._get_new_session('tor')
                    continue
            if attempt < self._retries:
                # TODO : might wanna tweak this back-off timer
                sleep_time = 2.0 * 2 ** attempt
                logme.info(f':Waiting {sleep_time:.0f} seconds')
                time.sleep(sleep_time)
            else:
                msg = f'{self._retries + 1} requests to {self.url} failed, giving up.'
                logme.fatal(__name__ + ":" + msg)
                self.config.Guest_token = None
                return 0  # failure

    def refresh(self):
        logme.debug(__name__ + ':Retrieving guest token')
        if not self._request():
            sys.exit(1)
