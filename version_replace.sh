#!/bin/bash

VERSION=$(node -e "(function () { console.log(require('./package.json').version) })()")

replace 'ANGULAR_SDK_VERSION_NUMBER' $VERSION ./dist/esm2015/lib/utils/constants.js ./dist/fesm2015/splitsoftware-splitio-angular.js

if [ $? -eq 0 ]
then
  exit 0
else
  exit 1
fi
