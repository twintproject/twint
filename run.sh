#!/bin/bash

name="twint"
version="latest"

docker build -t ${name}:${version} .
docker run ${name}:${version} $@ 
