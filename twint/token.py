import random
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
        self._session.headers.update({'User-Agent': config.user_agent if config.user_agent else 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0'})
        self.config = config
        self._retries = 5
        self._timeout = config.timeout
        self.url = 'https://api.twitter.com/1.1/guest/activate.json'

    def _request(self):
        for attempt in range(self._retries + 1):
            # The request is newly prepared on each retry because of potential cookie updates.
            req = self._session.prepare_request(requests.Request('POST', self.url, headers={'authorization': self.config.Bearer_token}))
            if self.config.Proxy_host or self.config.Proxies:
                if self.config.Proxy_type == 'http' and self.config.Proxies:
                    proxy_url = random.choice(self.config.Proxies)
                else:
                    proxy_url = f'{self.config.Proxy_type}://{self.config.Proxy_host}:{self.config.Proxy_port}'
                self._session.proxies = {'https': proxy_url, 'http': proxy_url}
            logme.debug(f'Retrieving {req.url}')
            try:
                r = self._session.send(req, allow_redirects=True, timeout=self.config.timeout)
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

                if r.status_code == 200:
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
        if res.status_code == 200:
            self.config.Guest_token = res.json()['guest_token']
            logme.debug(f'Guest token retrieved: {self.config.Guest_token}')
        else:
            self.config.Guest_token = None
            raise RefreshTokenException('Could not find the Guest token in HTML')
