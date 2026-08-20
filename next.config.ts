import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 親ディレクトリの lockfile を拾わせない（standalone のファイル追跡もこの root 基準）
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
