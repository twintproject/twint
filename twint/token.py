import re
import time

import requests
import logging as logme

class TokenExpiryException(Exception):
    def __init__(self, msg):
        super().__init__(msg)

        
class RefreshTokenException(Exception):
    def __init__(self, msg):
        super().__init__(msg)
        

class Token:
    def __init__(self, config):
        self._session = requests.Session()
        self._session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0'})
        self.config = config
        self._retries = 5
        self._timeout = 10
        self._session.headers.update({'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'})
        self.url = 'https://api.twitter.com/1.1/guest/activate.json'

    def _request(self):
        for attempt in range(self._retries + 1):
            # The request is newly prepared on each retry because of potential cookie updates.
            req = self._session.prepare_request(requests.Request('POST', self.url))
            logme.debug(f'Retrieving {req.url}')
            try:
                r = self._session.send(req, allow_redirects=True, timeout=self._timeout)
            except requests.exceptions.RequestException as exc:
                if attempt < self._retries:
                    retrying = ', retrying'
                    level = logme.WARNING
                else:
                    retrying = ''
                    level = logme.ERROR
                logme.log(level, f'Error retrieving {req.url}: {exc!r}{retrying}')
            else:
                success, msg = (True, None)
                msg = f': {msg}' if msg else ''

                if success:
                    logme.debug(f'{req.url} retrieved successfully{msg}')
                    return r
            if attempt < self._retries:
                # TODO : might wanna tweak this back-off timer
                sleep_time = 2.0 * 2 ** attempt
                logme.info(f'Waiting {sleep_time:.0f} seconds')
                time.sleep(sleep_time)
        else:
            msg = f'{self._retries + 1} requests to {self.url} failed, giving up.'
            logme.fatal(msg)
            self.config.Guest_token = None
            raise RefreshTokenException(msg)

    def refresh(self):
        logme.debug('Retrieving guest token')
        res = self._request()
        res_json = res.json()
        if "guest_token" in res_json.keys():
            logme.debug('Found guest token in HTML')
            self.config.Guest_token = res_json["guest_token"]
        else:
            self.config.Guest_token = None
            raise RefreshTokenException('Could not find the Guest token in HTML')
