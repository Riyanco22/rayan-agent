const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const express = require('express');

// --- إعداد السيرفر لمنع الإغلاق التلقائي في Render ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('السكرتير الذكي يعمل بنجاح!'));
app.listen(port, () => console.log(`السيرفر مستقر على منفذ ${port}`));

// --- إعدادات البوت الأساسية ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const BOT_MARKER = '\u200B'; 
let interactionLog = []; 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- حل مشكلة الباركود (رابط مباشر) ---
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('يا ريان.. انسخ هذا الرابط وافتحه في صفحة جديدة:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('🚀 السكرتير الذكي متصل وجاهز لخدمتك يا ريان!');
});

// --- منطق الرد والذكاء (اللي استعدناه الآن) ---
client.on('message_create', async (msg) => {
    if (msg.body.includes(BOT_MARKER)) return;

    const chat = await msg.getChat();
    const isMe = msg.fromMe; 

    // تسجيل التواصل
    if (!isMe && !chat.isGroup) {
        interactionLog.push({
            name: chat.name,
            time: new Date().toLocaleTimeString('ar-SA'),
            msg: msg.body.substring(0, 20) + "..."
        });
        if (interactionLog.length > 10) interactionLog.shift();
    }

    let systemPrompt = `أنت المساعد الرقمي لـ R I Y A N. رد بلهجة سعودية وقورة ومختصرة.`;

    if (isMe) {
        systemPrompt += ` أنت الآن تتحدث مع صاحبك "ريان". كن ودوداً جداً، أجب على أسئلته، وإذا سألك عن "من كلمك" أعطه ملخصاً من السجل المتاح لديك.`;
        if (msg.body.includes("من كلمك") || msg.body.includes("تقرير")) {
            const report = interactionLog.length > 0
                ? interactionLog.map(i => `- ${i.name} الساعة ${i.time}`).join('\n')
                : "ما حد كلمني للحين يا ريان.";
            return await msg.reply(`هلا ريان، أبشر.. هذي قائمة بآخر من تواصل معي:\n${report}${BOT_MARKER}`);
        }
    } else {
        systemPrompt += ` لا تذكر ريان إلا إذا سألك المرسل. ممنوع ذكر تفاصيل العمل (جمعية سعداء) إلا بطلب.`;
        if (msg.body.length < 2 || msg.isStatus || chat.isGroup) return;
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: msg.body }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
        });

        let replyText = chatCompletion.choices[0].message.content.trim() + BOT_MARKER;

        if (!isMe) {
            replyText += `\n\n---\nDigital Assistant | R I Y A N Office 💎`;
        }

        await client.sendMessage(msg.from, replyText);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
});

client.initialize();
