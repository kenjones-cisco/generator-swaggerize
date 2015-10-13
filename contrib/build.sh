#!/bin/bash
set -eu

DIR="/home/vagrant/swagger/contrib"

# this is a bit cryptic but required to get yo installed for user appy

# NodeJS 4.x
docker build -t temp/nodejs:4 -f "${DIR}/Dockerfile.node4" "${DIR}"
docker rm nodejs4-yo > /dev/null 2>&1 || :
docker run --name nodejs4-yo temp/nodejs:4 npm install --quiet -g yo
docker commit nodejs4-yo krakenjs/nodejs:4
docker rm nodejs4-yo
docker rmi temp/nodejs:4

# NodeJS 0.10.x
docker build -t krakenjs/nodejs:0.10 -f "${DIR}/Dockerfile.node10" "${DIR}"
# (dropping for now since yo does not support NodeJS less than 0.12)
# docker run --name nodejs10-yo krakenjs/nodejs:0.10 npm install --quiet -g yo
# docker commit nodejs10-yo krakenjs/nodejs:0.10-yo
# docker rm nodejs10-yo

# NodeJS 0.12.x
docker build -t temp/nodejs:0.12 -f "${DIR}/Dockerfile.node12" "${DIR}"
docker rm nodejs12-yo > /dev/null 2>&1 || :
docker run --name nodejs12-yo temp/nodejs:0.12 npm install --quiet -g yo
docker commit nodejs12-yo krakenjs/nodejs:0.12
docker rm nodejs12-yo
docker rmi temp/nodejs:0.12
