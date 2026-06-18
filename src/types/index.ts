export interface Category {
  id: string;
  title: string;
  description: string;
  image: string;
  icon: string;
  iconColor: string;
  glbPath: string;
  vehicleId: string;
}

export interface Hotspot {
  id: string;
  label: string;
  description: string;
  relativePosition?: [number, number, number];
  labelOffset?: [number, number];
  position: [number, number, number];
  productId: string;
  installationNotes: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  pdf: string;
  benefits: string[];
  technicalSpecs: { icon: string; label: string }[];
  advantages: string[];
}

export interface Vehicle {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  glbPath: string;
  cameraPosition: [number, number, number];
  modelScale: number;
  modelRotation: [number, number, number];
  hotspotsFile: string;
}

export interface QuoteItem {
  productId: string;
  quantity: number;
}

export interface HotspotData {
  hotspots: Hotspot[];
}
