import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "parthub_cart";

const CartContext = createContext(null);

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePrice(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;

  if (number > 0 && Number.isInteger(number) && number >= 100) {
    return number;
  }

  return Math.round(number * 100);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const value = useMemo(() => {
    function addItem(part, quantity = 1) {
      const qty = Math.max(1, Number(quantity || 1));

      setItems((current) => {
        const existingIndex = current.findIndex((item) => item.part_id === part.part_id);

        if (existingIndex >= 0) {
          return current.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity + qty }
              : item
          );
        }

        return [
          ...current,
          {
            part_id: part.part_id ?? part.id,
            slug: part.slug,
            title: part.title,
            thumbnail: part.thumbnail || part.image_url || null,
            seller_name: part.seller_name || "",
            price: normalizePrice(part.price),
            quantity: qty,
          },
        ];
      });
    }

    function updateQuantity(partId, quantity) {
      const qty = Math.max(0, Number(quantity || 0));

      setItems((current) => {
        if (qty <= 0) {
          return current.filter((item) => item.part_id !== partId);
        }

        return current.map((item) =>
          item.part_id === partId ? { ...item, quantity: qty } : item
        );
      });
    }

    function removeItem(partId) {
      setItems((current) => current.filter((item) => item.part_id !== partId));
    }

    function clearCart() {
      setItems([]);
    }

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      totalItems,
      subtotal,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
