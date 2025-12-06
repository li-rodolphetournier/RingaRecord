import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ringarecord.app',
  appName: 'RingaRecord',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Pour le développement local, décommenter:
    // url: 'http://localhost:5173',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      keystorePath: undefined, // À configurer pour la production
      keystoreAlias: undefined,
    },
  },
};

export default config;

