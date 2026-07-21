import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "pdf-parse", "onnxruntime-node", "@napi-rs/canvas"],
  // onnxruntime-node's native binary and @napi-rs/canvas's native binary are both resolved
  // dynamically at runtime by platform/arch, so Next's static file tracing misses them —
  // force-include or the Vercel serverless bundle ships without them and every request 500s.
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/**/*"],
    "/api/ingest": [
      "./node_modules/onnxruntime-node/bin/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
  },
};

export default nextConfig;
