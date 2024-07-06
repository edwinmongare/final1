/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "https://final-pacesetter-1d5a034.payloadcms.app",
      },
    ],
  },
  pageExtensions: ["ts", "tsx"],
};

module.exports = nextConfig;
