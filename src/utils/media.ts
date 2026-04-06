import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { pickWebFileAsDataUrl } from './fileUploads';

type CapturedPhoto = {
  dataUrl: string;
  capturedAt: string;
};

type CapturePhotoOptions = {
  label: string;
  unsupportedMessage: string;
  tooLargeMessage: string;
  readErrorMessage: string;
};

type TextDetectorDetection = {
  rawValue?: string;
  lines?: Array<{ rawValue?: string }>;
};

const MAX_UPLOAD_DIMENSION = 1280;
const TARGET_DATA_URL_LENGTH = 900_000;

function buildImageDataUrl(base64: string, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${base64}`;
}

async function optimizeNativeImageAsset(asset: ImagePicker.ImagePickerAsset) {
  if (!asset.uri) {
    throw new Error('The selected image could not be read.');
  }

  const largestSide = Math.max(asset.width ?? 0, asset.height ?? 0);
  const resizeWidth = largestSide > MAX_UPLOAD_DIMENSION ? MAX_UPLOAD_DIMENSION : asset.width ?? null;
  const resizeHeight =
    largestSide > MAX_UPLOAD_DIMENSION && asset.width && asset.height
      ? Math.round((asset.height / asset.width) * MAX_UPLOAD_DIMENSION)
      : null;
  const attempts = [
    { compress: 0.45, width: resizeWidth, height: resizeHeight },
    { compress: 0.3, width: 960, height: asset.width && asset.height ? Math.round((asset.height / asset.width) * 960) : null },
    { compress: 0.22, width: 720, height: asset.width && asset.height ? Math.round((asset.height / asset.width) * 720) : null },
  ];

  let smallestResult = '';

  for (const attempt of attempts) {
    const result = await manipulateAsync(
      asset.uri,
      attempt.width
        ? [{ resize: { width: attempt.width, height: attempt.height } }]
        : [],
      {
        compress: attempt.compress,
        format: SaveFormat.JPEG,
        base64: true,
      },
    );

    const dataUrl = buildImageDataUrl(result.base64 ?? '');

    if (!dataUrl || dataUrl === 'data:image/jpeg;base64,') {
      continue;
    }

    smallestResult = dataUrl;

    if (dataUrl.length <= TARGET_DATA_URL_LENGTH) {
      return dataUrl;
    }
  }

  if (smallestResult) {
    return smallestResult;
  }

  return assetToDataUrl(asset);
}

function assetToDataUrl(asset: ImagePicker.ImagePickerAsset) {
  if (!asset.base64) {
    throw new Error('The selected image could not be read.');
  }

  const mimeType = asset.mimeType || 'image/jpeg';
  return `data:${mimeType};base64,${asset.base64}`;
}

async function capturePhoto(options: CapturePhotoOptions): Promise<CapturedPhoto | null> {
  if (Platform.OS === 'web') {
    const file = await pickWebFileAsDataUrl({
      accept: 'image/png,image/jpeg,image/webp',
      capture: 'environment',
      maxSizeInBytes: 4 * 1024 * 1024,
      unsupportedMessage: options.unsupportedMessage,
      tooLargeMessage: options.tooLargeMessage,
      readErrorMessage: options.readErrorMessage,
    });

    return file?.dataUrl
      ? {
          dataUrl: file.dataUrl,
          capturedAt: new Date().toISOString(),
        }
      : null;
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error(`Camera permission is required to capture ${options.label}.`);
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    base64: true,
    allowsEditing: true,
    quality: 0.6,
    cameraType: ImagePicker.CameraType.back,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return {
    dataUrl: await optimizeNativeImageAsset(result.assets[0]),
    capturedAt: new Date().toISOString(),
  };
}

function normalizeVehicleNumberCandidate(value: string) {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function extractVehicleNumber(text: string) {
  const patterns = [
    /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}\b/g,
    /\b\d{2}\s?BH\s?\d{4}\s?[A-Z]{1,2}\b/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);

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

function collectDetectedText(detections: TextDetectorDetection[]) {
  return detections
    .flatMap((detection) => [
      detection.rawValue ?? '',
      ...(detection.lines?.map((line) => line.rawValue ?? '') ?? []),
    ])
    .join(' ')
    .trim();
}

export async function captureGuestPhoto() {
  return capturePhoto({
    label: 'the guest photo',
    unsupportedMessage: 'Guest photo capture is not available on this device.',
    tooLargeMessage: 'Choose a guest photo smaller than 4 MB.',
    readErrorMessage: 'Could not read the guest photo.',
  });
}

export async function captureVehiclePhoto() {
  return capturePhoto({
    label: 'the vehicle photo',
    unsupportedMessage: 'Vehicle photo capture is not available on this device.',
    tooLargeMessage: 'Choose a vehicle photo smaller than 4 MB.',
    readErrorMessage: 'Could not read the vehicle photo.',
  });
}

export async function pickResidentProfilePhoto(capture?: 'user' | 'environment') {
  if (Platform.OS === 'web') {
    const file = await pickWebFileAsDataUrl({
      accept: 'image/png,image/jpeg,image/webp',
      capture,
      maxSizeInBytes: 4 * 1024 * 1024,
      unsupportedMessage: 'Resident photo upload is available from the web workspace right now.',
      tooLargeMessage: 'Choose a resident profile photo smaller than 4 MB.',
      readErrorMessage: 'Could not read the selected resident profile photo.',
    });

    return file?.dataUrl
      ? {
          dataUrl: file.dataUrl,
          capturedAt: new Date().toISOString(),
        }
      : null;
  }

  if (capture) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Camera permission is required to capture the resident profile photo.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: true,
      quality: 0.6,
      cameraType:
        capture === 'user' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return {
      dataUrl: await optimizeNativeImageAsset(result.assets[0]),
      capturedAt: new Date().toISOString(),
    };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload the resident profile photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    allowsEditing: true,
    quality: 0.6,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return {
    dataUrl: await optimizeNativeImageAsset(result.assets[0]),
    capturedAt: new Date().toISOString(),
  };
}

export async function detectVehicleNumberFromDataUrl(dataUrl: string) {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    typeof fetch === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return {
      vehicleNumber: null,
      message: 'Automatic vehicle number detection is available on supported web browsers.',
    };
  }

  const windowWithTextDetector = window as typeof window & {
    TextDetector?: new () => {
      detect: (source: ImageBitmapSource) => Promise<TextDetectorDetection[]>;
    };
  };

  if (!windowWithTextDetector.TextDetector) {
    return {
      vehicleNumber: null,
      message: 'This browser does not support automatic vehicle number detection yet.',
    };
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const detector = new windowWithTextDetector.TextDetector();
    const detections = await detector.detect(bitmap);
    const detectedText = collectDetectedText(detections);
    const vehicleNumber = extractVehicleNumber(detectedText);

    if (vehicleNumber) {
      return {
        vehicleNumber,
        message: `Vehicle number detected as ${vehicleNumber}. Review before sending.`,
      };
    }

    return {
      vehicleNumber: null,
      message: 'Vehicle number could not be read clearly. You can still type it manually.',
    };
  } finally {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}
