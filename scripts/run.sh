#!/bin/sh

# Navigate to the project directory
cd /app

# Run npm install
npm install

chown root:root /app/node_modules/electron/dist/chrome-sandbox
chmod 4755 /app/node_modules/electron/dist/chrome-sandbox

npm start