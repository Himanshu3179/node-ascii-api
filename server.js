const express = require("express");
const multer = require("multer");
const { Jimp, intToRGBA } = require("jimp");

const app = express();
const port = 3000;

// Multer setup for in-memory upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Ultra-detailed ASCII ramp (94 characters)
const ASCII_RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$%&QWM@#B8&%$";
// You can replace with a custom ramp for a different texture

// Aspect ratio correction for monospace fonts
const HEIGHT_SCALE = 0.43;

/**
 * Advanced pixel-level brightness correction
 * (Combines gamma, contrast, and dynamic range stretching)
 */
function enhanceImage(image, contrast = 0.25, gamma = 1.1, brightness = 0.05) {
  const { data } = image.bitmap;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // --- 1️⃣ Grayscale intensity
    let intensity = 0.299 * r + 0.587 * g + 0.114 * b;

    // --- 2️⃣ Contrast enhancement (center around 128)
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    intensity = factor * (intensity - 128) + 128;

    // --- 3️⃣ Gamma correction
    intensity = 255 * Math.pow(intensity / 255, 1 / gamma);

    // --- 4️⃣ Brightness adjustment
    intensity = intensity + brightness * 255;

    // Clamp
    intensity = Math.max(0, Math.min(255, intensity));

    data[i] = data[i + 1] = data[i + 2] = intensity;
  }

  return image;
}

/**
 * Convert image buffer → ASCII art (High Quality)
 */
async function convertImageToAscii(buffer, options = {}) {
  const {
    width = 240, // higher = more detail
    contrast = 0.25,
    gamma = 1.1,
    brightness = 0.05,
    invert = false,
  } = options;

  try {
    const image = await Jimp.read(buffer);

    // Resize proportionally while preserving detail
    const scale = image.bitmap.width / width;
    const newWidth = Math.floor(image.bitmap.width / scale);
    const newHeight = Math.floor((image.bitmap.height / scale) * HEIGHT_SCALE);

    image.resize({ w: newWidth, h: newHeight }).greyscale();

    // High-precision enhancement
    enhanceImage(image, contrast, gamma, brightness);

    let asciiArt = "";

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const pixelColor = image.getPixelColor(x, y);
        const { r: brightness } = intToRGBA(pixelColor);
        let value = brightness / 255;

        if (invert) value = 1 - value; // invert mapping if dark-background style

        const rampIndex = Math.floor(value * (ASCII_RAMP.length - 1));
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
    const { width, contrast, gamma, brightness, invert } = req.query;
    const asciiArt = await convertImageToAscii(req.file.buffer, {
      width: width ? parseInt(width) : undefined,
      contrast: contrast ? parseFloat(contrast) : undefined,
      gamma: gamma ? parseFloat(gamma) : undefined,
      brightness: brightness ? parseFloat(brightness) : undefined,
      invert: invert === "true",
    });

    res.setHeader("Content-Type", "text/plain");
    res.send(asciiArt);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`✅ Ultra-Quality ASCII Art API running at http://localhost:${port}`);
  console.log("➡️  Example:");
  console.log("   curl -F 'image=@photo.jpg' 'http://localhost:3000/ascii?width=260&contrast=0.3&gamma=1.15&brightness=0.05'");
});
