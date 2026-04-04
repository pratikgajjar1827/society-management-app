import { Linking, Platform } from 'react-native';

export interface PickedWebFile {
  dataUrl: string;
  fileName: string;
}

type TextDetectionConstructor = new () => {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

interface PickWebFileOptions {
  accept: string;
  maxSizeInBytes: number;
  unsupportedMessage: string;
  tooLargeMessage: string;
  readErrorMessage: string;
  capture?: 'user' | 'environment';
}

export async function pickWebFileAsDataUrl(
  options: PickWebFileOptions,
): Promise<PickedWebFile | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error(options.unsupportedMessage);
  }

  return new Promise<PickedWebFile | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    if (options.capture) {
      input.setAttribute('capture', options.capture);
    }

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        resolve(null);
        return;
      }

      if (file.size > options.maxSizeInBytes) {
        reject(new Error(options.tooLargeMessage));
        return;
      }

      const reader = new FileReader();
      reader.onload = () =>
        resolve(
          typeof reader.result === 'string'
            ? {
                dataUrl: reader.result,
                fileName: file.name,
              }
            : null,
        );
      reader.onerror = () => reject(new Error(options.readErrorMessage));
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

export function openWebDataUrlInNewTab(dataUrl: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Opening uploaded files is available from the web workspace right now.');
  }

  window.open(dataUrl, '_blank', 'noopener,noreferrer');
}

export async function openUploadedFileDataUrl(dataUrl: string) {
  const normalized = String(dataUrl ?? '').trim();

  if (!normalized) {
    return false;
  }

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(normalized, '_blank', 'noopener,noreferrer');
      return true;
    }

    await Linking.openURL(normalized);
    return true;
  } catch (error) {
    return false;
  }
}

export async function downloadUploadedFileDataUrl(dataUrl: string, fileName: string) {
  const normalizedDataUrl = String(dataUrl ?? '').trim();
  const normalizedFileName = String(fileName ?? '').trim() || 'society-document';

  if (!normalizedDataUrl) {
    return false;
  }

  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const downloadLink = document.createElement('a');
      downloadLink.href = normalizedDataUrl;
      downloadLink.download = normalizedFileName;
      downloadLink.rel = 'noopener';
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      return true;
    }

    await Linking.openURL(normalizedDataUrl);
    return true;
  } catch (error) {
    return false;
  }
}

function extractVehicleRegistrationCandidate(text: string) {
  const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, ' ');
  const patterns = [
    /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}\b/g,
    /\b\d{2}\s?BH\s?\d{4}\s?[A-Z]{1,2}\b/g,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern)?.[0];

    if (match) {
      return match.replace(/\s+/g, '');
    }
  }

  return null;
}

export async function tryDetectVehicleRegistrationFromDataUrl(dataUrl: string) {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    typeof fetch === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return null;
  }

  const textDetector = (
    window as typeof window & {
      TextDetector?: TextDetectionConstructor;
    }
  ).TextDetector;

  if (!textDetector) {
    return null;
  }

  try {
    const detector = new textDetector();
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const blocks = await detector.detect(bitmap);
    bitmap.close();

    const rawText = blocks
      .map((block) => String(block.rawValue ?? '').trim())
      .filter(Boolean)
      .join(' ');

    return rawText ? extractVehicleRegistrationCandidate(rawText) : null;
  } catch (error) {
    return null;
  }
}
