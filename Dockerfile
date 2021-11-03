FROM python:3.6-buster
LABEL maintainer="codyzacharias@pm.me"

WORKDIR /root

COPY . /root/
RUN cd /root && mkdir output && pip3 install . -r requirements.txt


ENTRYPOINT ["twint"]
