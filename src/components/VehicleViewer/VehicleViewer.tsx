"use client";

import React, { useEffect, useRef, useState, useMemo, useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import type { Vehicle, Hotspot } from "@/types";
import Hotspots from "@/components/Hotspots/Hotspots";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAppStore } from "@/store/useAppStore";
import {
  computeSceneFit,
  createGLTFExtendLoader,
  enhanceMeshQualityOnce,
  registerCanvasRenderer,
} from "@/utils/gltfLoaderExtensions";
import {
  resolveHotspotPositions,
  type HotspotInput,
} from "@/utils/hotspotPositions";
import { FaSync, FaPlus, FaMinus } from "react-icons/fa";

function VehicleModel({
  modelUrl,
  rotation,
  scale,
  hotspotInputs,
  onReady,
  onHotspotsResolved,
}: {
  modelUrl: string;
  rotation: [number, number, number];
  scale: number;
  hotspotInputs: HotspotInput[];
  onReady: () => void;
  onHotspotsResolved: (hotspots: Hotspot[]) => void;
}) {
  const { gl } = useThree();
  const modelRootRef = useRef<THREE.Group>(null);
  const extendLoader = useMemo(() => createGLTFExtendLoader(gl), [gl]);
  const { scene: gltfScene } = useGLTF(modelUrl, true, true, extendLoader);
  const fit = useMemo(() => computeSceneFit(gltfScene), [gltfScene]);

  useLayoutEffect(() => {
    enhanceMeshQualityOnce(gltfScene, gl.capabilities.getMaxAnisotropy());

    modelRootRef.current?.updateMatrixWorld(true);
    if (modelRootRef.current) {
      onHotspotsResolved(
        resolveHotspotPositions(modelRootRef.current, hotspotInputs)
      );
    }

    onReady();
  }, [gltfScene, gl, hotspotInputs, onReady, onHotspotsResolved]);

  return (
    <group ref={modelRootRef} rotation={rotation} scale={scale * fit.fitScale}>
      <group position={fit.center}>
        <primitive object={gltfScene} />
      </group>
    </group>
  );
}

function CameraController({
  position,
}: {
  position: [number, number, number];
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);
  }, [camera, position]);
  return null;
}

interface SceneProps {
  vehicle: Vehicle;
  hotspotInputs: HotspotInput[];
  autoRotate: boolean;
  interactive: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onModelReady: () => void;
}

function Scene({
  vehicle,
  hotspotInputs,
  autoRotate,
  interactive,
  controlsRef,
  onModelReady,
}: SceneProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  const handleHotspotsResolved = useMemo(
    () => (resolved: Hotspot[]) => setHotspots(resolved),
    []
  );

  return (
    <>
      <CameraController position={vehicle.cameraPosition} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <hemisphereLight args={["#ffffff", "#444444", 0.5]} />
      <Environment preset="city" />
      <VehicleModel
        modelUrl={vehicle.glbPath}
        rotation={vehicle.modelRotation}
        scale={vehicle.modelScale}
        hotspotInputs={hotspotInputs}
        onReady={onModelReady}
        onHotspotsResolved={handleHotspotsResolved}
      />
      {hotspots.length > 0 && <Hotspots hotspots={hotspots} />}
      <OrbitControls
        ref={controlsRef}
        enabled={interactive}
        enablePan={false}
        enableRotate={interactive}
        enableZoom={interactive}
        minDistance={3}
        maxDistance={28}
        autoRotate={interactive && autoRotate}
        autoRotateSpeed={1.5}
        makeDefault
      />
    </>
  );
}

interface VehicleViewerProps {
  vehicle: Vehicle;
  hotspotInputs: HotspotInput[];
  interactive?: boolean;
}

interface VehicleViewerContentProps extends VehicleViewerProps {
  onRetry: () => void;
}

function VehicleViewerContent({
  vehicle,
  hotspotInputs,
  interactive = true,
  onRetry,
}: VehicleViewerContentProps) {
  const { progress, errors } = useProgress();
  const [modelReady, setModelReady] = useState(false);
  const error = errors.length > 0 ? errors.join(", ") : null;
  const isLoaded = modelReady && !error;

  const setLoadingProgress = useAppStore((s) => s.setLoadingProgress);
  const setIsModelLoaded = useAppStore((s) => s.setIsModelLoaded);
  const [autoRotate, setAutoRotate] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleModelReady = useMemo(
    () => () => setModelReady(true),
    []
  );

  useEffect(() => {
    setLoadingProgress(modelReady ? 100 : progress);
  }, [progress, modelReady, setLoadingProgress]);

  useEffect(() => {
    setIsModelLoaded(isLoaded);
  }, [isLoaded, setIsModelLoaded]);

  useEffect(() => {
    return () => {
      setIsModelLoaded(false);
      setLoadingProgress(0);
    };
  }, [vehicle.glbPath, setIsModelLoaded, setLoadingProgress]);

  const zoomBy = (delta: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    const dir = camera.position.clone().normalize();
    camera.position.addScaledVector(dir, delta);
    controls.update();
  };

  const viewerControls = [
    { icon: FaSync, label: "Rotar 360°", action: "rotate" as const },
    { icon: FaPlus, label: "Acercar", action: "zoomIn" as const },
    { icon: FaMinus, label: "Alejar", action: "zoomOut" as const },
  ];

  const handleControlAction = (action: "rotate" | "zoomIn" | "zoomOut") => {
    if (action === "rotate") {
      setAutoRotate((v) => !v);
      return;
    }
    zoomBy(action === "zoomIn" ? -1 : 1);
  };

  return (
    <div className="relative h-full min-h-[calc(100vh-12rem)] w-full lg:min-h-[calc(100vh-10rem)]">
      <AnimatePresence>
        {!isLoaded && !error && (
          <LoadingSpinner progress={modelReady ? 100 : progress} />
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <p className="mb-2 text-sm font-medium text-red-600">Error al cargar el modelo 3D</p>
          <p className="mb-4 max-w-xs text-center text-xs text-gray-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-[#1e88e5] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1565c0]"
          >
            Reintentar
          </button>
        </div>
      )}

      <div
        className={`absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 transition-opacity sm:left-4 ${
          interactive ? "opacity-100" : "pointer-events-none opacity-30"
        }`}
      >
        {viewerControls.map((ctrl) => {
          const Icon = ctrl.icon;
          return (
            <button
              key={ctrl.label}
              type="button"
              onClick={() => handleControlAction(ctrl.action)}
              disabled={!interactive || !isLoaded}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-blue-50 sm:h-12 sm:w-12"
              aria-label={ctrl.label}
              title={ctrl.label}
            >
              <Icon className="text-sm text-[#1e88e5] sm:text-base" />
            </button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        className={`absolute inset-0 ${
          interactive && isLoaded ? "" : "pointer-events-none"
        }`}
      >
        <Canvas
          shadows
          className="!h-full !w-full"
          camera={{ fov: 45, near: 0.1, far: 1000 }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => registerCanvasRenderer(gl)}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
            width: "100%",
            height: "100%",
          }}
        >
          <Scene
            vehicle={vehicle}
            hotspotInputs={hotspotInputs}
            autoRotate={autoRotate}
            interactive={interactive}
            controlsRef={controlsRef}
            onModelReady={handleModelReady}
          />
        </Canvas>
      </motion.div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs text-gray-500 shadow-md backdrop-blur-sm">
          <FaSync className="text-[#1e88e5]" />
          360°
        </div>
      </div>
    </div>
  );
}

export default function VehicleViewer(props: VehicleViewerProps) {
  const [loadAttempt, setLoadAttempt] = useState(0);

  return (
    <VehicleViewerContent
      key={`${props.vehicle.glbPath}:${loadAttempt}`}
      {...props}
      onRetry={() => {
        useGLTF.clear(props.vehicle.glbPath);
        setLoadAttempt((attempt) => attempt + 1);
      }}
    />
  );
}
