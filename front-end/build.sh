#!/bin/bash
(
    rm -rf dist/client
    cd src/client;
    tsc;
    browserify ../../dist/client/index.js -o ../../dist/client/client.js;
    cp -r css ../../dist/client/
    cp index.html ../../dist/client/
)

(
    rm -rf dist/server
    cd src/server &&
    tsc
)

