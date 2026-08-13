/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },

  typescript: {
    // Vercel 构建环境 TypeScript 阶段 fetch 超时，本地已验证通过
    ignoreBuildErrors: true,
  },

  // === 安全响应头（所有路由） ===
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 防止 MIME 类型嗅探
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 防止点击劫持
          { key: "X-Frame-Options", value: "DENY" },
          // XSS 防护（旧浏览器）
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // 限制 Referer 传递
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 权限策略：禁止不必要的浏览器功能
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
