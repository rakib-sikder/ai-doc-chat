import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "pdf-parse", "onnxruntime-node"],
  // onnxruntime-node's native binary is resolved dynamically at runtime by platform/arch,
  // so Next's static file tracing misses it — force-include it or Vercel's serverless
  // bundle ships without libonnxruntime.so.1 and every request 500s.
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/**/*"],
    "/api/ingest": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
