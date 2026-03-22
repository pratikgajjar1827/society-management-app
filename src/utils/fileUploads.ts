import { Platform } from 'react-native';

export interface PickedWebFile {
  dataUrl: string;
  fileName: string;
}

interface PickWebFileOptions {
  accept: string;
  maxSizeInBytes: number;
  unsupportedMessage: string;
  tooLargeMessage: string;
  readErrorMessage: string;
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
