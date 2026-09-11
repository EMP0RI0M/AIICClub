/** @type {import('next').NextConfig} */
const isTauriBuild = process.env.TAURI_BUILD === "true";

const nextConfig = {
  trailingSlash: isTauriBuild,
  images: { unoptimized: true },
  transpilePackages: ["@corvus/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(isTauriBuild ? { output: "export" } : {}),
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination: "/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/archieve",
        destination: "/archive",
        permanent: true,
      },
      {
        source: "/archieve/:path*",
        destination: "/archive/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
