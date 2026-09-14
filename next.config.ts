import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Scripture fetched server-side from bible.helloao.org; notes never mixed in.
  // Include BLB-Draft USX static corpus in serverless traces so fs reads work on Vercel.
  outputFileTracingIncludes: {
    "/[translation]/[book]/[chapter]": ["./public/blb-draft/usx/**/*"],
    "/*": ["./public/blb-draft/usx/**/*"],
  },
};

export default nextConfig;
