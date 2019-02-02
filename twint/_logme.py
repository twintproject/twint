import logging

class  _logger:
    def __init__(self, loggerName):
        self._level = logging.DEBUG
        self._output_fn = 'test.log'
        self.logger = logging.getLogger(loggerName)
        self.logger.setLevel(self._level)
        self.formatter = logging.Formatter('%(levelname)s:%(asctime)s:%(name)s:%(message)s')
        self.fileHandler = logging.FileHandler(self._output_fn)
        self.fileHandler.setLevel(self._level)
        self.fileHandler.setFormatter(self.formatter)
        self.logger.addHandler(self.fileHandler)

    def critical(self, message):
        self.logger.critical(message)

    def info(self, message):
        self.logger.info(message)
    
    def debug(self, message):
        self.logger.debug(message)