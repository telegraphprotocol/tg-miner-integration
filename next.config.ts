import type { NextConfig } from 'next';

const config: NextConfig = {
  // Silence noisy "Module not found" warnings from optional deps that
  // wagmi / RainbowKit / WalletConnect / MetaMask SDK reference but never
  // actually need in a web build. They are documented as optional by their
  // authors, so we simply tell webpack to resolve them to an empty module.
  webpack: (webpackConfig, { isServer }) => {
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias ?? {}),
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };

    if (isServer) {
      webpackConfig.externals = [
        ...(webpackConfig.externals ?? []),
        'pino-pretty',
        '@react-native-async-storage/async-storage',
      ];
    }

    return webpackConfig;
  },
};

export default config;
