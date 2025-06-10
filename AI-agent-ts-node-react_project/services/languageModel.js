require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

async function generateResponse(context, question) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "Jesteś inteligentnym asystentem analizującym stenogramy przesłuchań.",
        },
        { role: "system", content: context },
        { role: "user", content: question },
      ],
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Błąd w komunikacji z OpenAI:", error.message);
    throw error;
  }
}

module.exports = { generateResponse };
