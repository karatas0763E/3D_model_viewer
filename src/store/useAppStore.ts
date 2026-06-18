import { create } from "zustand";
import type { Hotspot, Product } from "@/types";
import productsData from "@/data/products/products.json";

const ALL_PRODUCT_IDS = (productsData as Product[]).map((p) => p.id);
const DEFAULT_PRODUCT = (productsData as Product[])[0];

interface AppState {
  selectedHotspot: Hotspot | null;
  selectedProduct: Product | null;
  quoteItems: { productId: string; quantity: number }[];
  panelsOpen: boolean;
  loadingProgress: number;
  isModelLoaded: boolean;

  setSelectedHotspot: (hotspot: Hotspot | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  setPanelsOpen: (open: boolean) => void;
  togglePanels: () => void;
  openPanelsWithCatalog: () => void;
  setLoadingProgress: (progress: number) => void;
  setIsModelLoaded: (loaded: boolean) => void;
  addToQuote: (productId: string) => void;
  removeFromQuote: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearQuote: () => void;
  initDefaultQuote: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedHotspot: null,
  selectedProduct: null,
  quoteItems: [],
  panelsOpen: false,
  loadingProgress: 0,
  isModelLoaded: false,

  setSelectedHotspot: (hotspot) => set({ selectedHotspot: hotspot }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setPanelsOpen: (open) => set({ panelsOpen: open }),
  togglePanels: () => {
    const next = !get().panelsOpen;
    if (next) get().openPanelsWithCatalog();
    else set({ panelsOpen: false });
  },
  openPanelsWithCatalog: () => {
    get().initDefaultQuote();
    const state = get();
    if (!state.selectedProduct) {
      set({ selectedProduct: DEFAULT_PRODUCT });
    }
    set({ panelsOpen: true });
  },
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  setIsModelLoaded: (loaded) => set({ isModelLoaded: loaded }),

  initDefaultQuote: () => {
    if (get().quoteItems.length > 0) return;
    set({
      quoteItems: ALL_PRODUCT_IDS.map((productId) => ({
        productId,
        quantity: 1,
      })),
    });
  },

  addToQuote: (productId) => {
    const items = get().quoteItems;
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      set({
        quoteItems: items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ quoteItems: [...items, { productId, quantity: 1 }] });
    }
  },

  removeFromQuote: (productId) => {
    set({
      quoteItems: get().quoteItems.filter((i) => i.productId !== productId),
    });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromQuote(productId);
      return;
    }
    set({
      quoteItems: get().quoteItems.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    });
  },

  clearQuote: () => set({ quoteItems: [] }),
}));
