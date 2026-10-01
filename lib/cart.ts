"use client";
import { useEffect, useState } from "react";
export type Line = { key: string; product_id: string; variant_id: string | null; name: string; sku: string; colour: string | null; size: string | null; price: number; image: string | null; qty: number };
const K = "zaas-order";
const read = (): Line[] => { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch { return []; } };
const save = (l: Line[]) => { localStorage.setItem(K, JSON.stringify(l)); window.dispatchEvent(new Event("zaas-cart")); };
export const clampQty = (q: number) => Math.max(1, Math.min(99, Math.floor(q) || 1));
export const cart = {
  add(l: Line) { const c = read(); const e = c.find((x) => x.key === l.key); if (e) e.qty = clampQty(e.qty + l.qty); else c.push({ ...l, qty: clampQty(l.qty) }); save(c); },
  setQty(key: string, q: number) { save(read().map((x) => (x.key === key ? { ...x, qty: clampQty(q) } : x))); },
  remove(key: string) { save(read().filter((x) => x.key !== key)); },
  clear() { save([]); },
};
export function useCart() {
  const [lines, set] = useState<Line[]>([]); const [ready, setReady] = useState(false);
  useEffect(() => { const f = () => set(read()); f(); setReady(true); window.addEventListener("zaas-cart", f); window.addEventListener("storage", f); return () => { window.removeEventListener("zaas-cart", f); window.removeEventListener("storage", f); }; }, []);
  return { lines, ready, count: lines.reduce((s, l) => s + l.qty, 0), total: lines.reduce((s, l) => s + l.qty * l.price, 0) };
}
