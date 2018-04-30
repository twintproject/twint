# Twint OSINT Explorer - https://github.com/haccer/twint/tree/master/graph
# $ xhost local:root
# docker run --name twint \
#   -v /tmp/.X11-unix:/tmp/.X11-unix \
#   -e DISPLAY=unix$DISPLAY \
#   --rm <image>
FROM node:9.11.1-stretch
LABEL maintainer "Cody Zacharias <codyzacharias@pm.me>"

# Install Packages
RUN apt-get update && \
      apt-get upgrade -y && \
      apt-get install -y \
      libsqlite3-dev \
      libxss1 \
      libx11-xcb-dev \
      libxtst-dev \
      libgconf-2-4 \ 
      libnss3 \ 
      libasound-dev

WORKDIR /data

# Install node-sqlite3
RUN git clone https://github.com/mapbox/node-sqlite3.git && \
      cd node-sqlite3 && \
      npm install --build-from-source

WORKDIR /data

# Install Twint
RUN git clone https://github.com/haccer/twint.git && \
      cd twint/graph && \
      npm install

# Make sure we're in the right directory
WORKDIR /data/twint/graph

CMD ["npm", "start"]
