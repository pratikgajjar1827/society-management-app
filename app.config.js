const appVariant = String(
  process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? '',
)
  .trim()
  .toLowerCase();

const allowCleartextTraffic =
  String(process.env.ALLOW_CLEARTEXT_TRAFFIC ?? '')
    .trim()
    .toLowerCase() === 'true';
const appVersion = String(process.env.APP_VERSION ?? '1.0.0').trim() || '1.0.0';

const isCreatorApp = appVariant === 'creator';

module.exports = {
  expo: {
    name: isCreatorApp ? 'Society Creator' : 'SocietyOS',
    slug: isCreatorApp ? 'society-creator-app' : 'society-management-app',
    version: appVersion,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#163D34',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: isCreatorApp
        ? 'com.anonymous.societycreatorapp'
        : 'com.mindsflux.residencyhub',
    },
    android: {
      usesCleartextTraffic: allowCleartextTraffic,
      permissions: ['POST_NOTIFICATIONS'],
      adaptiveIcon: {
        backgroundColor: '#163D34',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: isCreatorApp
        ? 'com.anonymous.societycreatorapp'
        : 'com.mindsflux.residencyhub',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-notifications', '@react-native-community/datetimepicker'],
    extra: {
      appVariant: isCreatorApp ? 'creator' : 'main',
      expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? null,
    },
  },
};
