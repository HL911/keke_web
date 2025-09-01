import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 开发环境配置
  async rewrites() {
    return [
      // 如果有代理问题，可以添加重写规则
    ];
  },

  // 开发服务器配置
  ...(process.env.NODE_ENV === "development" && {
    experimental: {
      turbo: {
        rules: {
          // Turbopack 配置
        },
      },
    },
  }),
};

export default nextConfig;
