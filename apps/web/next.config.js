/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@formance-demo/ledger-engine',
    '@formance-demo/numscript-parser',
    '@formance-demo/demo-configs',
  ],
};

module.exports = nextConfig;
