"use client";

import * as THREE from "three";
import type { GLTFLoader } from "three-stdlib";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const BASIS_TRANSCODER_PATH = "/basis/";
const BASIS_TRANSCODER_CDN =
  "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/basis/";

export const MODEL_FIT_SIZE = 10;

let ktx2Loader: KTX2Loader | null = null;
let basisTranscoderPath = BASIS_TRANSCODER_PATH;
let basisPathChecked = false;
let probeRenderer: THREE.WebGLRenderer | null = null;
let activeCanvasRenderer: THREE.WebGLRenderer | null = null;

const enhancedScenes = new WeakSet<THREE.Object3D>();

export async function ensureBasisTranscoderPath(): Promise<void> {
  if (basisPathChecked || typeof window === "undefined") return;

  basisPathChecked = true;

  try {
    const response = await fetch(`${BASIS_TRANSCODER_PATH}basis_transcoder.js`, {
      method: "HEAD",
    });
    if (response.ok) return;
  } catch {
    // Use CDN when /basis is unavailable.
  }

  basisTranscoderPath = BASIS_TRANSCODER_CDN;
  ktx2Loader?.setTranscoderPath(BASIS_TRANSCODER_CDN);
}

function bindKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(basisTranscoderPath);
  }
  ktx2Loader.detectSupport(renderer);
  return ktx2Loader;
}

/** Register the live Canvas renderer so preload reuses one GPU context. */
export function registerCanvasRenderer(renderer: THREE.WebGLRenderer) {
  activeCanvasRenderer = renderer;
  bindKTX2Loader(renderer);
}

function getProbeRenderer(): THREE.WebGLRenderer {
  if (activeCanvasRenderer) return activeCanvasRenderer;

  if (!probeRenderer) {
    const canvas = document.createElement("canvas");
    probeRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "default",
    });
  }

  bindKTX2Loader(probeRenderer);
  return probeRenderer;
}

/** Pass this as the 4th argument to drei's useGLTF inside a Canvas. */
export function createGLTFExtendLoader(renderer: THREE.WebGLRenderer) {
  return (loader: GLTFLoader) => {
    loader.setKTX2Loader(
      bindKTX2Loader(renderer) as unknown as NonNullable<
        Parameters<GLTFLoader["setKTX2Loader"]>[0]
      >
    );
  };
}

/** For homepage preload — reuses a single probe/canvas renderer. */
export function createGLTFExtendLoaderWithFallback() {
  return createGLTFExtendLoader(getProbeRenderer());
}

export function computeSceneFit(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fitScale = maxDim > 0 ? MODEL_FIT_SIZE / maxDim : 1;

  return {
    center: [-center.x, -center.y, -center.z] as [number, number, number],
    fitScale,
  };
}

export function enhanceMeshQualityOnce(root: THREE.Object3D, maxAnisotropy: number) {
  if (enhancedScenes.has(root)) return;
  enhancedScenes.add(root);

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;

      material.envMapIntensity = 1.2;
      material.needsUpdate = true;

      [material.map, material.emissiveMap].filter(Boolean).forEach((texture) => {
        texture!.colorSpace = THREE.SRGBColorSpace;
        texture!.anisotropy = maxAnisotropy;
        texture!.minFilter = THREE.LinearMipmapLinearFilter;
        texture!.magFilter = THREE.LinearFilter;
        texture!.needsUpdate = true;
      });

      [material.normalMap, material.metalnessMap, material.roughnessMap, material.aoMap]
        .filter(Boolean)
        .forEach((texture) => {
          texture!.anisotropy = maxAnisotropy;
          texture!.minFilter = THREE.LinearMipmapLinearFilter;
          texture!.magFilter = THREE.LinearFilter;
          texture!.needsUpdate = true;
        });
    });
  });
}

/** @deprecated Prefer computeSceneFit + primitive to avoid GPU-doubling clones. */
export function prepareSceneForViewer(
  scene: THREE.Group,
  maxAnisotropy = 16
): THREE.Group {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  clone.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    clone.scale.multiplyScalar(MODEL_FIT_SIZE / maxDim);
  }

  enhanceMeshQualityOnce(clone, maxAnisotropy);
  return clone;
}
