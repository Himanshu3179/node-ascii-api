const express = require("express");
const multer = require("multer");
const { Jimp, intToRGBA } = require("jimp"); // ✅ include intToRGBA from jimp utils

const app = express();
const port = 3000;

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 10MB file size limit
});

// ASCII character ramp (lightest to darkest)
const ASCII_RAMP = "`.'\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

// Max width for ASCII art output
const MAX_WIDTH = 100;

/**
 * Converts an image buffer to ASCII art.
 * @param {Buffer} buffer - The image buffer
 * @returns {Promise<string>} - The ASCII art string
 */
async function convertImageToAscii(buffer) {
  try {
    const image = await Jimp.read(buffer);

    // Maintain aspect ratio; adjust for character aspect ratio
    const scale = image.bitmap.width / MAX_WIDTH;
    const newWidth = Math.floor(image.bitmap.width / scale);
    const newHeight = Math.floor((image.bitmap.height / scale) * 0.5);

    // ✅ Correct Jimp v1.x syntax (uses object + 'greyscale')
    image.resize({ w: newWidth, h: newHeight }).greyscale();

    let asciiArt = "";

    // Convert pixels to ASCII
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const pixelColor = image.getPixelColor(x, y);
        // ✅ Correct usage for Jimp v1.x
        const { r: brightness } = intToRGBA(pixelColor);
        const rampIndex = Math.floor((1 - brightness / 255) * (ASCII_RAMP.length - 1));
        asciiArt += ASCII_RAMP[rampIndex];
      }
      asciiArt += "\n";
    }

    return asciiArt;
  } catch (error) {
    console.error("Image processing failed:", error);
    throw new Error("Could not process the image.");
  }
}

// --- API Endpoint ---
app.post("/ascii", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).send("No image file uploaded.");

  try {
    const asciiArt = await convertImageToAscii(req.file.buffer);
    res.setHeader("Content-Type", "text/plain");
    res.send(asciiArt);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`✅ ASCII Art API listening at http://localhost:${port}`);
  console.log("➡️  Test by POSTing an image to http://localhost:3000/ascii");
});
