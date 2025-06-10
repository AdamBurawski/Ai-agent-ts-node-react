const { exec } = require("child_process");

/**
 * Transcribes an audio file using Whisper CLI.
 * @param {string} audioFilePath - Path to the audio file.
 * @returns {Promise<string>} - The transcribed text.
 */
async function transcribeWithWhisperCLI(audioFilePath) {
  return new Promise((resolve, reject) => {
    const command = `whisper "${audioFilePath}" --language Polish --model base`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(
          `Błąd podczas transkrypcji pliku ${audioFilePath}:`,
          error.message
        );
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

async function transcribeFiles(audioFiles) {
  const transcripts = [];
  for (const file of audioFiles) {
    console.log(`Przetwarzanie pliku: ${file}`);
    try {
      const transcription = await transcribeWithWhisperCLI(file);
      console.log(`Transkrypcja dla ${file}:`, transcription);

      transcripts.push({ file, text: transcription });
    } catch (error) {
      console.error(`Błąd podczas transkrypcji pliku ${file}:`, error.message);
    }
  }
  return transcripts;
}

module.exports = { transcribeFiles };
