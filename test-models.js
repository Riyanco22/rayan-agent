const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI("AIzaSyCnCKP5Scq4vzRp2dwA7PvmKP50N4H6Ntg");

async function run() {
    try {
        const model = genAI.getGenerativeModel({model: "gemini-3-flash"});
        const result = await model.generateContent("hello");
        console.log("3-flash works:", result.response.text());
    } catch (e) {
        console.log("3-flash error:", e.message);
    }
    try {
        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});
        const result = await model.generateContent("hello");
        console.log("2.5-flash works:", result.response.text());
    } catch (e) {
        console.log("2.5-flash error:", e.message);
    }
    try {
        const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
        const result = await model.generateContent("hello");
        console.log("2.0-flash works:", result.response.text());
    } catch (e) {
        console.log("2.0-flash error:", e.message);
    }
}
run();
