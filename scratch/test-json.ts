import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI("AIzaSyCGBpYEJaJO4BFBXW3IgWzgX5-d-C0IzNQ");
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
async function test() {
  console.log("Sending request...");
  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: "Write 3 JSON objects." }] }],
    generationConfig: { responseMimeType: "application/json" }
  });
  console.log("Response:", res.response.text());
}
test().catch(console.error);
