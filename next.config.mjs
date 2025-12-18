const nextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ['recharts'],
  turbopack: {
    resolveAlias: {
      'recharts/es6': 'recharts/lib',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'recharts/es6': 'recharts/lib',
    };
    if (config.resolve.extensionAlias) {
      config.resolve.extensionAlias['.js'] = ['.js', '.ts', '.tsx'];
    }
    return config;
  },
}

export default nextConfig
