"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ShopCurrency = "UGX" | "USD";
export type CartItem = {
  key: string;
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  image: string | null;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  currency: ShopCurrency;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  currency: ShopCurrency;
  currencyReady: boolean;
  currencyError: string;
  addItem: (item: Omit<CartItem, "key" | "quantity">) => boolean;
  setCurrency: (currency: ShopCurrency) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "okecha-willy-cart-v1";
const CURRENCY_KEY = "okecha-willy-currency-v1";

function setCurrencyCookie(currency: ShopCurrency) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `okecha-willy-currency=${currency}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return typeof item.key === "string" &&
    typeof item.productId === "string" && item.productId.length > 0 &&
    (item.variantId === null || typeof item.variantId === "string") &&
    typeof item.title === "string" && typeof item.slug === "string" &&
    (item.image === null || typeof item.image === "string") &&
    (item.variantLabel === null || typeof item.variantLabel === "string") &&
    Number.isInteger(item.quantity) && Number(item.quantity) >= 1 && Number(item.quantity) <= 20 &&
    typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) && item.unitPrice >= 0 &&
    (item.currency === "UGX" || item.currency === "USD");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currency, setCurrencyState] = useState<ShopCurrency>("UGX");
  const [ready, setReady] = useState(false);
  const [currencyReady, setCurrencyReady] = useState(false);
  const [currencyError, setCurrencyError] = useState("");

  useEffect(() => {
    let savedItems: CartItem[] = [];
    let preferred: string | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) savedItems = parsed.filter(isCartItem);
      }
      preferred = window.localStorage.getItem(CURRENCY_KEY);
    } catch {
      setCurrencyError("Your saved bag could not be read. You can continue with a new bag.");
    }

    if (savedItems.length) {
      const cartCurrency = savedItems[0].currency;
      const consistentItems = savedItems.filter((item) => item.currency === cartCurrency);
      setItems(consistentItems);
      setCurrencyState(cartCurrency);
      try {
        window.localStorage.setItem(CURRENCY_KEY, cartCurrency);
        setCurrencyCookie(cartCurrency);
      } catch {
        setCurrencyError("Your currency preference could not be saved on this device.");
      }
      setCurrencyReady(true);
    } else if (preferred === "UGX" || preferred === "USD") {
      setCurrencyState(preferred);
      try { setCurrencyCookie(preferred); } catch { /* The server still defaults safely. */ }
      setCurrencyReady(true);
    } else {
      fetch("/api/shop/currency", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((value) => {
          const next: ShopCurrency = value.currency === "USD" ? "USD" : "UGX";
          setCurrencyState(next);
          try {
            window.localStorage.setItem(CURRENCY_KEY, next);
            setCurrencyCookie(next);
          } catch {
            setCurrencyError("Your currency preference could not be saved on this device.");
          }
        })
        .catch(() => setCurrencyError("We couldn't detect your region. Uganda pricing is selected by default."))
        .finally(() => setCurrencyReady(true));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch { setCurrencyError("Your bag could not be saved on this device. Keep this page open while completing your order."); }
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    currency,
    currencyReady,
    currencyError,
    addItem: (item) => {
      if (item.currency !== currency || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) return false;
      setItems((current) => {
        const key = item.productId + ":" + (item.variantId || "base");
        const found = current.find((entry) => entry.key === key);
        if (found) return current.map((entry) => entry.key === key
          ? { ...entry, quantity: Math.min(20, entry.quantity + 1) }
          : entry);
        return [...current, { ...item, key, quantity: 1 }];
      });
      return true;
    },
    setCurrency: (next) => {
      if (items.length) return false;
      setCurrencyState(next);
      try {
        window.localStorage.setItem(CURRENCY_KEY, next);
        setCurrencyCookie(next);
      } catch {
        setCurrencyError("Your currency preference could not be saved on this device.");
      }
      return true;
    },
    setQuantity: (key, quantity) => setItems((current) => current.map((item) =>
      item.key === key ? { ...item, quantity: Math.max(1, Math.min(20, Math.floor(quantity) || 1)) } : item
    )),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clearCart: () => setItems([]),
  }), [items, currency, currencyReady, currencyError]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
