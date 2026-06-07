/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs und fit-file-parser sind CommonJS-Server-Bibliotheken
  serverExternalPackages: ["exceljs", "fit-file-parser"],
};

export default nextConfig;
