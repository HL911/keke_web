import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 处理 lightweight-charts 在服务端渲染的问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // 排除 lightweight-charts 的服务端渲染
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('lightweight-charts');
    }
    
    return config;
  },
  // 确保客户端组件正确处理
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;
