import { useMemo } from "react";
import productsData from "@/data/products/products.json";
import type { Product } from "@/types";
import { useAppStore } from "@/store/useAppStore";

const IVA_RATE = 0.16;

export function useProducts() {
  const products = productsData as Product[];

  const getProduct = (id: string) => products.find((p) => p.id === id);

  return { products, getProduct };
}

export function useQuoteTotals() {
  const quoteItems = useAppStore((s) => s.quoteItems);
  const { getProduct } = useProducts();

  return useMemo(() => {
    const subtotal = quoteItems.reduce((sum, item) => {
      const product = getProduct(item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);
    const iva = subtotal * IVA_RATE;
    const total = subtotal + iva;
    return { subtotal, iva, total, itemCount: quoteItems.reduce((s, i) => s + i.quantity, 0) };
  }, [quoteItems, getProduct]);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
