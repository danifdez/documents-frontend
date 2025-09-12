FROM node:24.8.0-trixie

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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app
ENV ELECTRON_DISABLE_SECURITY_KEYRING=1
ENV ELECTRON_DISABLE_SANDBOX=1

RUN mkdir -p /run/user/0 && chmod 700 /run/user/0

CMD ["sh", "-c", "scripts/run.sh"]
