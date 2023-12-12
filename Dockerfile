FROM node:21.2.0-alpine3.18

LABEL name=external-sharing-service
MAINTAINER "Andy S Alic (asalic)"

COPY logError.js README.md jest.config.ts package.json tsconfig.json /opt/external-sharing-service/
COPY src/ /opt/external-sharing-service/src/
COPY bin/ /opt/external-sharing-service/bin/

RUN cd /opt/external-sharing-service/ \
    && npm install \
    && npx tsc 

ENV CONFIG_PATH=/opt/config.json

ENTRYPOINT cd /opt/external-sharing-service/ \
    && npm run prod -- -s ${CONFIG_PATH}