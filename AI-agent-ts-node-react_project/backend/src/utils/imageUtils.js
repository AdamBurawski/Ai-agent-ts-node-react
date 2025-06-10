const fs = require("fs");

// Convert image to Base64
exports.imageToBase64 = (filePath) => {
  return fs.readFileSync(filePath, { encoding: "base64" });
};
