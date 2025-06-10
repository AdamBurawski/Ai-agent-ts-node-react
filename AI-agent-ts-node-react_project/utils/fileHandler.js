const { exec } = require("child_process");
const path = require("path");

/**
 * Converts an audio file from .m4a format to .wav format using ffmpeg.
 * @param {string} inputPath - The full path of the .m4a file to be converted.
 * @returns {Promise<string>} - A promise that resolves to the path of the converted .wav file.
 */
function convertToWav(inputPath) {
  return new Promise((resolve, reject) => {
    // Replace the file extension with .wav
    const outputPath = inputPath.replace(".mp3", ".wav");

    // Construct the ffmpeg command
    const command = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 "${outputPath}"`;

    // Execute the ffmpeg command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(
          `Error during conversion of ${inputPath}:`,
          error.message
        );
        return reject(error);
      }

      console.log(`Successfully converted ${inputPath} to ${outputPath}`);
      resolve(outputPath);
    });
  });
}

module.exports = { convertToWav };
