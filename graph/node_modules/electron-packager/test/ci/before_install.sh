#!/bin/bash -xe
# -*- coding: utf-8 -*-

case "$TRAVIS_OS_NAME" in
  "linux")
    # Not using Trusty containers because it can't install wine1.6(-i386),
    # see: https://github.com/travis-ci/travis-ci/issues/6460
    sudo rm /etc/apt/sources.list.d/google-chrome.list
    sudo dpkg --add-architecture i386
    sudo apt-get update
    sudo apt-get install -y wine1.6
    ;;
  "osx")
    # Create CA
    openssl req -newkey rsa:4096 -days 1 -x509 -nodes -subj \
      "/C=CI/ST=Travis/L=Developer/O=Developer/CN=Developer CA" \
      -out /tmp/root.cer -keyout /tmp/root.key
    touch /tmp/certindex
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain \
      /tmp/root.cer
    # Create dev certificate
    openssl req -newkey rsa:1024 -nodes -subj \
      "/C=CI/ST=Travis/L=Developer/O=Developer/CN=Developer CodeCert" \
      -out codesign.csr -keyout codesign.key
    openssl ca -batch -config $(pwd)/test/ci/dev_ca.cnf -notext -create_serial \
      -in codesign.csr -out codesign.cer
    openssl pkcs12 -export -in codesign.cer -inkey codesign.key -out codesign.p12 -password pass:12345
    security import codesign.p12 -k ~/Library/Keychains/login.keychain -P 12345 -T /usr/bin/codesign
    npm install wine-darwin@1.9.17-1
    # Setup ~/.wine by running a command
    ./node_modules/.bin/wine hostname
    ;;
esac
