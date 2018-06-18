#!/bin/bash
(
    cd src/client;
    tsc;
    browserify ../../dist/client/index.js -o ../../dist/client.js;
    cp -r css ../../dist/client/
)

(
    cd src/server &&
    tsc
)

