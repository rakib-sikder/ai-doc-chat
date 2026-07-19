import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "pdf-parse", "onnxruntime-node"],
};

export default nextConfig;
