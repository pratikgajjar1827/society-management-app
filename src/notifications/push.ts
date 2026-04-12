import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const LAST_REGISTERED_TOKEN_KEY = 'societyos.pushToken';
const LAST_REGISTERED_USER_KEY = 'societyos.pushUser';

export async function prepareNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#163D34',
  });
}

export async function getExpoPushTokenForDevice() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }

  await prepareNotificationChannel();

  const permissionState = await Notifications.getPermissionsAsync();
  let status = permissionState.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse.data;
}

export async function shouldRegisterPushToken(userId: string, token: string) {
  const [lastUserId, lastToken] = await Promise.all([
    AsyncStorage.getItem(LAST_REGISTERED_USER_KEY),
    AsyncStorage.getItem(LAST_REGISTERED_TOKEN_KEY),
  ]);

  return lastUserId !== userId || lastToken !== token;
}

export async function markPushTokenRegistered(userId: string, token: string) {
  await Promise.all([
    AsyncStorage.setItem(LAST_REGISTERED_USER_KEY, userId),
    AsyncStorage.setItem(LAST_REGISTERED_TOKEN_KEY, token),
  ]);
}

export async function clearRegisteredPushTokenCache() {
  await Promise.all([
    AsyncStorage.removeItem(LAST_REGISTERED_USER_KEY),
    AsyncStorage.removeItem(LAST_REGISTERED_TOKEN_KEY),
  ]);
}
