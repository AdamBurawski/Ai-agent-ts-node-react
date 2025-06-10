const axios = require("axios");

async function sendToServer(answer) {
  try {
    const response = await axios.post("http://central-server/report", {
      name: "mp3",
      data: answer,
    });
    console.log("Odpowiedź z serwera centrali:", response.data);
  } catch (error) {
    console.error(
      "Błąd podczas wysyłania odpowiedzi na serwer:",
      error.message
    );
    throw error;
  }
}

module.exports = { sendToServer };
