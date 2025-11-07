const express = require("express");
const multer = require("multer");
const { Jimp, intToRGBA } = require("jimp");

const app = express();
const port = 3000;

// Multer setup (in-memory upload)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Detailed ASCII ramp (lightest → darkest)
const ASCII_RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

const MAX_WIDTH = 180; // More width → more detail
const HEIGHT_SCALE = 0.45; // Adjusts for font aspect ratio

/**
 * Apply manual contrast and gamma to image pixels.
 */
function enhanceImage(image, contrast = 0.15, gamma = 1.1) {
  const { data, width, height } = image.bitmap;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // --- Contrast ---
    // Normalize to 0–1, apply contrast formula, then re-scale
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;

    // --- Gamma correction ---
    r = 255 * Math.pow(r / 255, 1 / gamma);
    g = 255 * Math.pow(g / 255, 1 / gamma);
    b = 255 * Math.pow(b / 255, 1 / gamma);

    // Clamp to [0, 255]
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return image;
}

/**
 * Convert image buffer → ASCII art
 */
async function convertImageToAscii(buffer, options = {}) {
  try {
    const { width = MAX_WIDTH, contrast = 0.15, gamma = 1.1 } = options;
    const image = await Jimp.read(buffer);

    const scale = image.bitmap.width / width;
    const newWidth = Math.floor(image.bitmap.width / scale);
    const newHeight = Math.floor((image.bitmap.height / scale) * HEIGHT_SCALE);

    image.resize({ w: newWidth, h: newHeight }).greyscale();

    // ✅ Apply manual contrast & gamma correction
    enhanceImage(image, contrast, gamma);

    let asciiArt = "";

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const pixelColor = image.getPixelColor(x, y);
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
    const { width, contrast, gamma } = req.query;
    const asciiArt = await convertImageToAscii(req.file.buffer, {
      width: width ? parseInt(width) : undefined,
      contrast: contrast ? parseFloat(contrast) : undefined,
      gamma: gamma ? parseFloat(gamma) : undefined,
    });

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
  console.log("➡️  Example: curl -F 'image=@test.jpg' 'http://localhost:3000/ascii?width=200&contrast=0.3&gamma=1.2'");
});
