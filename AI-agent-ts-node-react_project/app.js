const axios = require("axios");

require("dotenv").config();

const apiKey = process.env.OPENAI_API_KEY;
const myApiKey = process.env.MY_API_KEY;
const task = process.env.TASK;

// Funkcja do wysyłania odpowiedzi w formacie JSON
async function submitAnswer(taskId, answer) {
  try {
    // Przygotowanie payloadu
    const payload = {
      task: task, // Identyfikator zadania
      apikey: myApiKey, // Twój klucz API
      answer: answer, // Odpowiedź do przesłania
    };

    // Serializacja payloadu do JSON
    const jsonString = JSON.stringify(payload);

    // Wysłanie żądania POST z danymi w formacie JSON
    const response = await axios.post(
      "https://centrala.ag3nts.org/report",
      jsonString, // Wysyłamy zserializowany JSON
      {
        headers: {
          "Content-Type": "application/json",
        },
        validateStatus: function (status) {
          return true; // Akceptujemy wszystkie statusy, aby móc odczytać odpowiedź serwera w razie błędu
        },
      }
    );

    console.log("Status odpowiedzi:", response.status);
    console.log("Odpowiedź serwera:", response.data);
  } catch (error) {
    console.error("Błąd podczas wysyłania odpowiedzi:", error.message);
    if (error.response) {
      console.error("Treść odpowiedzi serwera:", error.response.data);
    }
  }
}

// Główna logika
(async () => {
  const taskId = "identyfikator zadania"; // Wprowadź tutaj identyfikator zadania
  const answer = {
    "imie": {
        "lat": 12.345,
        "lon": 65.431
    },
    "kolejne-imie": {
        "lat": 19.433,
        "lon": 12.123
    }
}

  console.log("Wysyłam dane w formacie JSON:");
  console.log(
    JSON.stringify(
      {
        task: task,
        apikey: myApiKey,
        answer: answer,
      },
      null,
      2
    )
  );

  await submitAnswer(taskId, answer); // Wysyłanie odpowiedzi
})();
