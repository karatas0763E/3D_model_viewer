"use client";

import { useGLTF } from "@react-three/drei";
import {
  createGLTFExtendLoaderWithFallback,
  ensureBasisTranscoderPath,
} from "@/utils/gltfLoaderExtensions";

let preloadQueue: Promise<void> = Promise.resolve();
let lastPreloadUrl: string | null = null;

export function preloadGLB(url: string) {
  if (typeof window === "undefined" || !url || url === lastPreloadUrl) return;

  lastPreloadUrl = url;
  preloadQueue = preloadQueue.then(async () => {
    await ensureBasisTranscoderPath();
    useGLTF.preload(url, true, true, createGLTFExtendLoaderWithFallback());
  });
}
