#!/usr/bin/env bash

set -a
. ./run/env/test/.env
set +a

if [ ! -d "./spec/support/logs" ]; then
  mkdir -m ./spec/support/logs
  mkdir -m ./cache
fi

./node_modules/.bin/nyc --reporter=lcov --reporter=text-summary --exclude=spec ./node_modules/.bin/jasmine
