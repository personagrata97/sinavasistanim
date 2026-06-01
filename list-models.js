const axios = require('axios');
const fs = require('fs');

async function listModels() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const keyMatch = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY="(.+)"/);
  const key = keyMatch ? keyMatch[1] : null;

  if (!key) {
    console.log("No key found");
    return;
  }

  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const models = response.data.models.map(m => m.name);
    console.log(models);
  } catch (e) {
    console.log(`Failed: ${e.response?.status}`);
  }
}

listModels();
