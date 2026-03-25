const path = require('node:path');

const { createWorker, PSM } = require('tesseract.js');
const englishData = require('@tesseract.js-data/eng');

let workerPromise;

function normalizeVehicleNumberCandidate(value) {
  return String(value ?? '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function extractVehicleNumber(text) {
  const patterns = [
    /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}\b/g,
    /\b\d{2}\s?BH\s?\d{4}\s?[A-Z]{1,2}\b/g,
  ];

  for (const pattern of patterns) {
    const matches = String(text ?? '').match(pattern);

    if (!matches?.length) {
      continue;
    }

    const candidate = normalizeVehicleNumberCandidate(matches[0]);

    if (candidate.length >= 8 && candidate.length <= 12) {
      return candidate;
    }
  }

  const compact = normalizeVehicleNumberCandidate(text);
  const fallbackMatch = compact.match(/[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2}/);
  return fallbackMatch?.[0] ?? null;
}

function parseImageDataUrl(dataUrl) {
  const normalized = String(dataUrl ?? '').trim();
  const match = normalized.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);

  if (!match) {
    throw new Error('Upload a valid vehicle photo before starting OCR.');
  }

  return Buffer.from(match[1], 'base64');
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      langPath: englishData.langPath,
      gzip: englishData.gzip,
      cachePath: path.join(process.cwd(), 'backend-data', 'tesseract-cache'),
      logger: () => undefined,
    }).catch((error) => {
      workerPromise = undefined;
      throw error;
    });
  }

  return workerPromise;
}

async function runRecognitionPass(worker, imageBuffer, pageSegmentationMode) {
  await worker.setParameters({
    tessedit_pageseg_mode: pageSegmentationMode,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    preserve_interword_spaces: '0',
  });

  const {
    data: { text },
  } = await worker.recognize(imageBuffer);

  return String(text ?? '').trim();
}

async function detectVehicleNumberFromPhotoDataUrl(photoDataUrl) {
  const imageBuffer = parseImageDataUrl(photoDataUrl);
  const worker = await getWorker();
  const recognitionPasses = [PSM.SINGLE_LINE, PSM.SINGLE_BLOCK, PSM.SPARSE_TEXT];
  const recognizedTexts = [];

  for (const pass of recognitionPasses) {
    const text = await runRecognitionPass(worker, imageBuffer, pass);

    if (!text) {
      continue;
    }

    recognizedTexts.push(text);
    const vehicleNumber = extractVehicleNumber(text);

    if (vehicleNumber) {
      return {
        vehicleNumber,
        rawText: text,
        message: `Vehicle number detected as ${vehicleNumber}. Review before sending.`,
        source: 'backend-ocr',
      };
    }
  }

  const mergedText = recognizedTexts.join(' ').trim();
  const fallbackVehicleNumber = extractVehicleNumber(mergedText);

  if (fallbackVehicleNumber) {
    return {
      vehicleNumber: fallbackVehicleNumber,
      rawText: mergedText,
      message: `Vehicle number detected as ${fallbackVehicleNumber}. Review before sending.`,
      source: 'backend-ocr',
    };
  }

  return {
    vehicleNumber: null,
    rawText: mergedText,
    message: 'Vehicle number could not be read clearly. Try a closer plate photo or enter it manually.',
    source: 'backend-ocr',
  };
}

module.exports = {
  detectVehicleNumberFromPhotoDataUrl,
};
