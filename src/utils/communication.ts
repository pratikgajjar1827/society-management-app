import { Linking, Platform } from 'react-native';

function normalizePhoneForUri(phone: string) {
  return String(phone ?? '').trim().replace(/[^\d+]/g, '');
}

function normalizePhoneForWhatsapp(phone: string) {
  return String(phone ?? '').replace(/\D/g, '');
}

async function openUrl(url: string) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export async function openPhoneDialer(phone: string) {
  const normalizedPhone = normalizePhoneForUri(phone);

  if (!normalizedPhone) {
    return false;
  }

  return openUrl(`tel:${normalizedPhone}`);
}

export async function openWhatsAppConversation(phone: string, message: string) {
  const normalizedPhone = normalizePhoneForWhatsapp(phone);

  if (!normalizedPhone) {
    return false;
  }

  return openUrl(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`);
}

type ActiveRingSession = {
  key: string;
  audioContext: AudioContext;
  intervalId: number;
  timeoutId: number;
};

let activeRingSession: ActiveRingSession | null = null;

function getAudioContextConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.AudioContext
    || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    || null;
}

function scheduleRingBurst(audioContext: AudioContext, startTime: number) {
  const pattern = [
    { offset: 0, frequency: 620, duration: 0.22 },
    { offset: 0.3, frequency: 740, duration: 0.22 },
    { offset: 0.6, frequency: 620, duration: 0.22 },
    { offset: 1.1, frequency: 740, duration: 0.28 },
  ];

  pattern.forEach(({ offset, frequency, duration }) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const burstStart = startTime + offset;

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, burstStart);
    gain.gain.exponentialRampToValueAtTime(0.14, burstStart + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, burstStart + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(burstStart);
    oscillator.stop(burstStart + duration + 0.02);
  });
}

export async function stopRingAlert() {
  if (!activeRingSession) {
    return false;
  }

  try {
    window.clearInterval(activeRingSession.intervalId);
    window.clearTimeout(activeRingSession.timeoutId);
    await activeRingSession.audioContext.close();
    activeRingSession = null;
    return true;
  } catch (error) {
    activeRingSession = null;
    return false;
  }
}

export async function startRingAlert(key: string, durationMs = 60_000) {
  const audioContextConstructor = getAudioContextConstructor();

  if (!audioContextConstructor) {
    return false;
  }

  if (activeRingSession?.key === key) {
    return true;
  }

  await stopRingAlert();

  const audioContext = new audioContextConstructor();

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const playBurst = () => {
      scheduleRingBurst(audioContext, audioContext.currentTime + 0.02);
    };

    playBurst();

    const intervalId = window.setInterval(() => {
      playBurst();
    }, 2200);

    const timeoutId = window.setTimeout(() => {
      void stopRingAlert();
    }, durationMs);

    activeRingSession = {
      key,
      audioContext,
      intervalId,
      timeoutId,
    };

    return true;
  } catch (error) {
    await audioContext.close();
    activeRingSession = null;
    return false;
  }
}
