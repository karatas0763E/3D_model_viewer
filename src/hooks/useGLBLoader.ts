"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const glbCache = new Map<string, Promise<THREE.Group>>();
const CACHE_VERSION = "fit-10";

const MODEL_FIT_SIZE = 10; // 2.5× previous size (was 4)

function fitSceneToView(scene: THREE.Group): THREE.Group {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  clone.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = MODEL_FIT_SIZE / maxDim;
    clone.scale.multiplyScalar(scale);
  }
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if ("envMapIntensity" in mat) {
            (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.2;
          }
        });
      }
    }
  });
  return clone;
}

export function loadGLBScene(
  url: string,
  onProgress?: (percent: number) => void
): Promise<THREE.Group> {
  const cached = glbCache.get(`${CACHE_VERSION}:${url}`);
  if (cached) return cached;

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Could not load ${url}: HTTP ${xhr.status}`));
        return;
      }

      const loader = new GLTFLoader();
      loader.parse(
        xhr.response as ArrayBuffer,
        "",
        (gltf) => resolve(fitSceneToView(gltf.scene)),
        (error) => {
          reject(
            new Error(
              `Could not load ${url}: ${error instanceof Error ? error.message : "parse error"}`
            )
          );
        }
      );
    };

    xhr.onerror = () =>
      reject(new Error(`Could not load ${url}: Failed to fetch`));
    xhr.send();
  });

  glbCache.set(`${CACHE_VERSION}:${url}`, promise);
  promise.catch(() => glbCache.delete(`${CACHE_VERSION}:${url}`));
  return promise;
}

export function useGLBLoader(url: string) {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    if (!url) return;
    setProgress(0);
    setIsLoaded(false);
    setScene(null);
    setError(null);

    loadGLBScene(url, (p) => {
      if (mountedRef.current) setProgress(p);
    })
      .then((loadedScene) => {
        if (mountedRef.current) {
          setScene(loadedScene);
          setProgress(100);
          setIsLoaded(true);
        }
      })
      .catch((err: Error) => {
        if (mountedRef.current) {
          setError(err.message);
          setIsLoaded(false);
        }
      });
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { progress, isLoaded, scene, error, retry: load };
}

export function preloadGLB(url: string) {
  if (typeof window === "undefined") return;
  loadGLBScene(url).catch(() => {});
}
