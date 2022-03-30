# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.202.3/containers/alpine/.devcontainer/base.Dockerfile

# [Choice] Alpine version: 3.14, 3.13, 3.12, 3.11
# ARG VARIANT="3.14"
# FROM mcr.microsoft.com/vscode/devcontainers/base:0-alpine-${VARIANT}

# ** [Optional] Uncomment this section to install additional packages. **
# RUN apk update \
#     && apk add --no-cache <your-package-list-here>

# ERIK: commented out the above; created this based on TWINT
FROM python:3.6-buster

# TODO: run something to nltk.download('vader_lexicon') or python -m nltk.downloader vader_lexicon
CMD /bin/bash