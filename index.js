const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

// إعداد Groq باستخدام متغيرات البيئة للأمان
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BOT_MARKER = '\u200B'; // علامة مخفية لتمييز ردود البوت
let interactionLog = []; // سجل بسيط لمعرفة من تواصل مع البوت (سيحذف عند إعادة تشغيل السيرفر)

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    }
});

client.on('qr', qr => { qrcode.generate(qr, { small: true }); });

client.on('ready', () => {
    console.log('🚀 السكرتير الذكي متصل وجاهز لخدمتك يا ريان!');
});

client.on('message_create', async (msg) => {
    // 1. منع اللوب: إذا كانت الرسالة من البوت نفسه (تحتوي على العلامة)، تجاهلها فوراً
    if (msg.body.includes(BOT_MARKER)) return;

    const chat = await msg.getChat();
    const isMe = msg.fromMe; // هل الرسالة مرسلة مني أنا (ريان)؟

    // تسجيل التواصل (لمنحه لريان لاحقاً)
    if (!isMe && !chat.isGroup) {
        interactionLog.push({
            name: chat.name,
            time: new Date().toLocaleTimeString('ar-SA'),
            msg: msg.body.substring(0, 20) + "..."
        });
        // حفظ آخر 10 تواصلات فقط
        if (interactionLog.length > 10) interactionLog.shift();
    }

    // 2. تحديد التعليمات (System Instruction) بناءً على المرسل
    let systemPrompt = `أنت المساعد الرقمي لـ R I Y A N. رد بلهجة سعودية وقورة ومختصرة.`;

    if (isMe) {
        // تعليمات خاصة إذا كان ريان هو اللي يكلم البوت
        systemPrompt += ` أنت الآن تتحدث مع صاحبك "ريان". كن ودوداً جداً، أجب على أسئلته، وإذا سألك عن "من كلمك" أعطه ملخصاً من السجل المتاح لديك.`;
        if (msg.body.includes("من كلمك") || msg.body.includes("تقرير")) {
            const report = interactionLog.length > 0
                ? interactionLog.map(i => `- ${i.name} الساعة ${i.time}`).join('\n')
                : "ما حد كلمني للحين يا ريان.";
            return await msg.reply(`هلا ريان، أبشر.. هذي قائمة بآخر من تواصل معي:\n${report}${BOT_MARKER}`);
        }
    } else {
        // تعليمات للرد على الغرباء
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

        // التوقيع يظهر فقط للغرباء وليس لريان
        if (!isMe) {
            replyText += `\n\n---\nDigital Assistant | R I Y A N Office 💎`;
        }

        await client.sendMessage(msg.from, replyText);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
});

client.initialize();