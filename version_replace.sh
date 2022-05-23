#!/bin/bash

VERSION=$(node -e "(function () { console.log(require('./package.json').version) })()")

replace 'ANGULAR_SDK_VERSION_NUMBER' $VERSION ./dist/esm2020/lib/utils/constants.mjs ./dist/fesm2015/splitsoftware-splitio-angular.mjs ./dist/fesm2020/splitsoftware-splitio-angular.mjs

if [ $? -eq 0 ]
then
  exit 0
else
  exit 1
fi
