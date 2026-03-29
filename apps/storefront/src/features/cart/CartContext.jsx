import { createContext, useContext, useState, useEffect } from "react";
import { CART_STORAGE_KEY } from "@parthub/shared";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  function persist(next) {
    setItems(next);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  }

  function addItem(part, quantity = 1) {
    const existing = items.find((i) => i.part_id === part.id);
    if (existing) {
      persist(items.map((i) =>
        i.part_id === part.id ? { ...i, quantity: i.quantity + quantity } : i
      ));
    } else {
      persist([...items, {
        part_id: part.id, slug: part.slug, title: part.title,
        price: part.price, thumbnail: part.thumbnail, quantity,
        seller_name: part.seller_name,
      }]);
    }
  }

  function updateQuantity(partId, quantity) {
    if (quantity <= 0) return removeItem(partId);
    persist(items.map((i) => i.part_id === partId ? { ...i, quantity } : i));
  }

  function removeItem(partId) {
    persist(items.filter((i) => i.part_id !== partId));
  }

  function clearCart() { persist([]); }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
