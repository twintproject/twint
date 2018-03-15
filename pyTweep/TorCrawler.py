"""Base class for webcrawler that communicates with Tor client."""

import socket
import socks
import requests
from bs4 import BeautifulSoup
import time
import warnings
import os
from collections import defaultdict

# Stem is a module for dealing with tor
from stem import Signal
from stem.control import Controller
from stem.connection import authenticate_none, authenticate_password


class TorCrawler(object):
    """
    TorCrawler is a layer on top of the requests module.

    Description:
    ------------
    This is a webcrawler that utilizes a Tor client through SOCKS5.

    By default, tor runs SOCKS5 through port 9050 on localhost
    Note that the config file for tor can be found in /etc/tor/torrc
    Before using this, the user must have tor installed and it must be
    running (e.g. using service tor start).

    If rotation is turned on, this client will require the control port
    in tor to be open so that it can send a NEWNYM signal to it, which
    draws a new relay route. Note that in order to send a signal, this client
    first needs to authenticate itself. In /etc/tor/torrc the control port
    can be opened without a password, in which authentication can be done
    without a password. I recommend that you DO NOT DO THIS. Instead, I
    recommend you store some password as an environmental variable, hash it,
    and store the hashed copy in /etc/tor/torrc. The hashed password can be
    generated with:

        tor --hash-password "mypassword"

    This will prevent any attackers from sending signals to your tor client.

    By default, this will set controller password as your environmental
    variable called "TOR_CTRL_PASS", but you can overwrite this by passing
    ctrl_pass=<your plaintext password>.

    Arguments:
    ----------
    # Ports and host
    ctrl_port=9051,
    socks_port=9050,
    socks_host="localhost",

    # The controller password (str)
    # Defaults to os.environ["TOR_CTRL_PASS"]
    ctrl_pass=None,

    # The threshold at which we can stop trying to rotate IPs and accept
    # the new path. This value is capped at 100 because we don't want to
    # kill the tor network.
    enforce_limit=3,

    # Enforce rotation of IPs (if true, redraw circuit until IP is changed)
    enforce_rotate=True,

    # The number of consecutive requests made with the same IP.
    n_requests=25,

    # Automatically rotate IPs.
    rotate_ips=True,

    # Upon initialization, test that IP rotation works.
    test_rotate=False,

    # Use BeautifulSoup to parse HTML
    use_bs=True,

    # Use Tor when making requests
    use_tor=True
    """

    def __init__(
        self,
        ctrl_port=9051,
        ctrl_pass=None,
        enforce_limit=3,
        enforce_rotate=True,
        n_requests=25,
        socks_port=9050,
        socks_host="localhost",
        rotate_ips=True,
        test_rotate=False,
        use_bs=True,
        use_tor=True
    ):
        """Set initialization arguments."""
        # Number of requests that have been made since last ip change
        self.req_i = 0

        # The number of consecutive requests made with the same IP.
        self.n_requests = n_requests

        # Do we want to use tor?
        self.use_tor = use_tor

        # Do we want to rotate IPs with tor?
        self.rotate_ips = rotate_ips

        # Enforce rotation of IPs (if true, redraw circuit until IP is changed)
        self.enforce_rotate = enforce_rotate

        # The threshold at which we can stop trying to rotate IPs and accept
        # the new path. This value is capped at 100 because we don't want to
        # kill the tor network.
        self.enforce_limit = min(100, enforce_limit)

        # SOCKS5 params
        self.tor_port = socks_port
        self.tor_host = socks_host

        # The tor controller that will be used to receive signals
        self.ctrl_port = ctrl_port

        self.tor_controller = None
        if self.use_tor:
            self._setTorController()

        # Use BeautifulSoup to parse html GET requests
        self.use_bs = use_bs

        # The control port password
        self.ctrl_pass = None
        self._setCtrlPass(ctrl_pass)
        self._startSocks()

        # Keep an IP address logged
        self.ip = self.check_ip()

        # If we want to make sure IP rotation is working
        if test_rotate:
            self._runTests()

    def _setCtrlPass(self, p):
        """Set password for controller signaling."""
        if p:
            self.ctrl_pass = p
        elif "TOR_CTRL_PASS" in os.environ:
            self.ctrl_pass = os.environ["TOR_CTRL_PASS"]

    def _setTorController(self):
        """Initialize a Controller with the control port."""
        try:
            self.tor_controller = Controller.from_port(port=self.ctrl_port)
        except Exception as err:
            raise EnvironmentError(err)

    def _startSocks(self):
        """
        Set our tor client as the proxy server.

        All future requests will be made through this.
        """
        socks.setdefaultproxy(
            socks.PROXY_TYPE_SOCKS5,
            self.tor_host,
            self.tor_port
        )
        socket.socket = socks.socksocket

    def _runTests(self):
        """Setup tests upon initialization."""
        if self.use_tor:

            # Check if we are using tor
            print("\nChecking that tor is running...")
            tor_html = self._checkConvert("https://check.torproject.org")
            running = tor_html.find("title").text

            assert "Congratulations" in running, "Tor is not running!"

            if self.rotate_ips:
                # Redraw the circuit a few times and hope that at least 2 of
                # the external IPs are different.
                print("Validating ip rotation...")
                ips = list()
                # Define the number of rotations we will attempt.
                # Note that the testing is different than the actual rotation
                # in that we really only want to run a small number of tests.
                num_tests = max(
                    3,
                    self.enforce_limit if self.enforce_limit else 49
                )
                for i in range(num_tests):
                    try:
                        ips.append(self.check_ip())
                        self._newCircuit()
                        time.sleep(2)
                    except Exception:
                        pass
                print("ips: ", ips)
                # If we only got one IP, rotation probably isn't working
                if len(set(ips)) < 2:
                    if self.enforce_rotate:
                        msg = "Tor IP rotation failed. If you intended to use \
                        Tor, make sure it's running and listening for signals.\
                        You may also pass enforce_rotate=False to proceed or \
                        set use_tor=False to skip this process."
                        raise EnvironmentError(msg)
                    else:
                        msg = """WARNING: Your external IP was the same for {}
                        different relay circuits. You may want to make sure
                        tor is running correctly.""".format(num_tests)
                        warnings.warn(msg, Warning)

                # Set the IP as the last one
                self.ip = ips[-1]
        print("Ready.\n")

    def _newCircuit(self):
        """
        Attempt to rotate the IP by sending tor client signal NEWNYM.

        Note: this does NOT automatically change the ip. It simply
        draws a new circuit (i.e. a routing table for your requests/responses).
        If the number of relays is small, this may indeed return the same IP.
        That does not mean it is broken!

        Also note that the default control port is 9051, which is different
        from the SOCKS5 port. This port is used to receive signals.
        """
        if self.ctrl_pass:
            authenticate_password(self.tor_controller, self.ctrl_pass)
        else:
            authenticate_none(self.tor_controller)
        self.tor_controller.signal(Signal.NEWNYM)

    def _checkConvert(self, url, headers=None):
        """Check if we need to return a BeautifulSoup object (or raw res)."""
        page = requests.get(url, headers=headers)
        if self.use_bs:
            return BeautifulSoup(page.content, 'html.parser')
        else:
            return page

    def _updateCount(self):
        """Increment counter and check if we need to rotate."""
        self.req_i += 1
        if self.req_i > self.n_requests and self.enforce_rotate:
            self.rotate()
            self.req_i = 0

    def check_ip(self):
        """Check my public IP via tor."""
        return requests.get("http://www.icanhazip.com").text[:-2]

    def rotate(self):
        """Redraw the tor circuit and (hopefully) change the IP."""
        # Track the num times we have attempted rotation and the current IP
        count = 0
        new_ip = None
        # Keep rotating until success
        while count < self.enforce_limit:
            self._newCircuit()
            new_ip = self.check_ip()
            # If the ip didn't change, but we want it to...
            if new_ip == self.ip and self.enforce_rotate:
                print("IP did not change upon rotation. Retrying...")
                time.sleep(2)
                count += 1
                continue
            else:
                self.ip = new_ip
                print("IP successfully rotated. New IP: {}".format(self.ip))
                break

    def get(self, url, headers=None):
        """Return either BeautifulSoup object or raw response from GET."""
        res = self._checkConvert(url, headers)
        self._updateCount()
        return res

    def post(self, url, data, headers=None):
        """Return raw response from POST request."""
        res = requests.post(url, data=data, headers=headers)
        self._updateCount()
        return res
