#!/bin/bash
cd /Users/Mathieu/Documents/1-Developer/GitHub/valuecollection/valuecollection
pwd
rm -rf dist
npm run build
npx wrangler pages dev dist --local --port 3000 --ip 0.0.0.0
