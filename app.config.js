const appVariant = String(
  process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? '',
)
  .trim()
  .toLowerCase();

const isCreatorApp = appVariant === 'creator';

module.exports = {
  expo: {
    name: isCreatorApp ? 'Society Creator' : 'SocietyOS',
    slug: isCreatorApp ? 'society-creator-app' : 'society-management-app',
    version: '1.0.0',
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
        : 'com.anonymous.societymanagementapp',
    },
    android: {
      usesCleartextTraffic: true,
      adaptiveIcon: {
        backgroundColor: '#163D34',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: isCreatorApp
        ? 'com.anonymous.societycreatorapp'
        : 'com.anonymous.societymanagementapp',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['@react-native-community/datetimepicker'],
    extra: {
      appVariant: isCreatorApp ? 'creator' : 'main',
    },
  },
};
