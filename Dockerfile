FROM python:3.6-buster
LABEL maintainer="codyzacharias@pm.me"

WORKDIR /root


COPY . .
RUN cd /root/ && \
	pip3 install . -r requirements.txt

CMD /bin/bash
