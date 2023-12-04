FROM node:21.2.0-alpine3.18

LABEL name=grandchallenge-result-manager
MAINTAINER "Andy S Alic (asalic)"

COPY jest.config.ts package.json tsconfig.json /opt/grandchallenge-result-manager/
COPY src/ /opt/grandchallenge-result-manager/src/

RUN apk add --no-cache sendmail \
    && cd /opt/grandchallenge-result-manager/ \
    && npm install \
    && npx tsc 

ENTRYPOINT cd /opt/grandchallenge-result-manager/ \
    && npm run prod