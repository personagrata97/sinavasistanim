import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI("AIzaSyCGBpYEJaJO4BFBXW3IgWzgX5-d-C0IzNQ");
async function main() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const res = await model.generateContent("Merhaba");
    console.log(res.response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
main();
