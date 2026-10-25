/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/sdui-forge/api/:path*",
      },
    ];
  },
};

export default nextConfig;
