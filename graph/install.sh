#!/bin/sh
# Installation script for Debian based systems

# Install Dependencies 
sudo apt-get install -y libsqlite3-dev \
  libxss1 \
  libx11-xcb-dev \
  libxtst-dev \
  libgconf-2-4 \ 
  libnss3 \ 
  libasound-dev
  
# Install node-sqlite3
git clone git clone https://github.com/mapbox/node-sqlite3.git
cd node-sqlite3
npm install --build-from-source

# Build
cd ..
npm install
