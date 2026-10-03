/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server external packages for libsql sqlite native handling if needed
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
