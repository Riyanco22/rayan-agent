# استخدم نسخة Node مناسبة
FROM node:18-slim

# تثبيت متصفح Chromium وكل التعريفات اللي يحتاجها الواتساب
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# تحديد مكان المتصفح للبوت
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# إعداد مجلد العمل
WORKDIR /usr/src/app

# نسخ ملفات الإعدادات وتثبيت المكتبات
COPY package*.json ./
RUN npm install

# نسخ بقية ملفات الكود
COPY . .

# تشغيل السيرفر
EXPOSE 3000
CMD [ "node", "index.js" ]
