FROM node:22-bullseye

# Install common dependencies for headless browsers (including Playwright's Chromium)
# Your existing list is quite comprehensive, adding a couple more for robustness.
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libxshmfence1 \
    libglu1-mesa \
    libegl1 \
    libwayland-client0 \
    libwayland-egl1 \
    libwayland-cursor0 \
    libwoff1 \
    libopus0 \
    libflite1 \
    libharfbuzz-icu0 \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    libunwind8 \
    libdw1 \
    libgudev-1.0-0 \
    libgles2 \
    gstreamer1.0-libav \
    libfontconfig1 \
    libfreetype6 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app
USER node

CMD ["bash", "-c", "cp /app/.env.testing /app/.env && npm run package && echo 'Packaging complete. Waiting 2 seconds...' && sleep 2 && echo 'Starting tests...' && xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24 -ac -noreset' npm run test:e2e && echo 'Tests completed.'"]