const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const express = require('express');

// --- إعداد السيرفر لضمان بقاء الخدمة تعمل على Render ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('السكرتير الذكي يعمل بنجاح!'));
app.listen(port, () => console.log(`السيرفر مستقر على منفذ ${port}`));

// --- إعدادات البوت والذكاء الاصطناعي ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const BOT_MARKER = '\u200B'; 
let interactionLog = []; 

const client = new Client({
    authStrategy: new LocalAuth(),
    // حل مشكلة إصدار الواتساب المتكررة
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: {
        headless: true,
        // هذا السطر هو الأهم للعمل داخل Docker
        executablePath: '/usr/bin/chromium', 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// --- عرض رابط الكود في السجلات ---
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('يا ريان.. انسخ هذا الرابط وافتحه في صفحة جديدة:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('🚀 السكرتير الذكي متصل الآن وجاهز تماماً يا ريان!');
});

// --- منطق استقبال الرسائل والرد ---
client.on('message_create', async (msg) => {
    // تجاهل الرسائل التي يرسلها البوت نفسه لتجنب التكرار اللانهائي
    if (msg.body.includes(BOT_MARKER)) return;

    const chat = await msg.getChat();
    const isMe = msg.fromMe;

    // تسجيل التواصل (فقط من الأفراد وليس المجموعات)
    if (!isMe && !chat.isGroup) {
        interactionLog.push({
            name: chat.name || msg.from,
            time: new Date().toLocaleTimeString('ar-SA'),
            msg: msg.body.substring(0, 20)
        });
        if (interactionLog.length > 20) interactionLog.shift();
    }

    // الأوامر الخاصة بريان (صاحب البوت)
    if (isMe) {
        if (msg.body.includes("من كلمك") || msg.body.includes("تقرير")) {
            const report = interactionLog.length > 0
                ? interactionLog.map(i => `- ${i.name} [${i.time}]`).join('\n')
                : "ما فيه أحد كلمني اليوم يا ريان.";
            return await client.sendMessage(msg.from, `هلا ريان.. هذي قائمة التواصل الأخيرة:\n${report}${BOT_MARKER}`);
        }
    }

    // تجاهل رسائل المجموعات والحالات والرسائل الفارغة
    if (chat.isGroup || msg.isStatus || !msg.body) return;

    try {
        // تجهيز التوجيهات للذكاء الاصطناعي
        let systemPrompt = `أنت المساعد الرقمي لـ ريان. رد بلهجة سعودية وقورة ومختصرة جداً.`;
        if (isMe) {
            systemPrompt += ` أنت تتحدث مع صاحبك ريان، كن ودوداً جداً ومرحاً.`;
        } else {
            systemPrompt += ` لا تذكر اسم ريان إلا إذا سُئلت. لا تذكر تفاصيل عن عمله في جمعية سعداء إلا للضرورة.`;
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: msg.body }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
        });

        let replyText = chatCompletion.choices[0].message.content.trim() + BOT_MARKER;

        // إضافة توقيع بسيط للغرباء فقط
        if (!isMe) {
            replyText += `\n\n---\nمكتب ريان الرقمي 💎`;
        }

        await client.sendMessage(msg.from, replyText);
    } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة:', error.message);
    }
});

client.initialize();
