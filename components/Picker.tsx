"use client";
import { useState } from "react";
import Link from "next/link";
import { cart, clampQty } from "@/lib/cart";
import { aed } from "@/lib/db";
type V = { id: string; sku: string; colour: string | null; size: string | null; price_override: number | null };
type P = { id: string; name: string; sku: string; price: number; primary_image_url: string | null };
const ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
const uniq = (a: (string | null)[]) => [...new Set(a.filter(Boolean) as string[])];
export default function Picker({ p, variants }: { p: P; variants: V[] }) {
  const hasC = variants.some((v) => v.colour), hasS = variants.some((v) => v.size);
  const [colour, setC] = useState<string | null>(null), [size, setS] = useState<string | null>(null);
  const [qty, setQty] = useState(1), [err, setErr] = useState(""), [added, setAdded] = useState(false);
  const colours = uniq(variants.map((v) => v.colour));
  const sizes = uniq(variants.map((v) => v.size)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const ok = (c: string | null, s: string | null) => variants.some((v) => (!c || v.colour === c) && (!s || v.size === s));
  const pickC = (c: string) => { const n = colour === c ? null : c; setC(n); if (n && size && !ok(n, size)) setS(null); setErr(""); setAdded(false); };
  const pickS = (s: string) => { const n = size === s ? null : s; setS(n); if (n && colour && !ok(colour, n)) setC(null); setErr(""); setAdded(false); };
  const variant = variants.find((v) => (!hasC || v.colour === colour) && (!hasS || v.size === size));
  const price = variant?.price_override ?? p.price;
  const add = () => {
    if (variants.length) {
      if (hasC && !colour) return setErr("Please select a colour.");
      if (hasS && !size) return setErr("Please select a size.");
      if (!variant) return setErr("This combination is not available.");
    }
    cart.add({ key: `${p.id}|${variant?.id ?? ""}`, product_id: p.id, variant_id: variant?.id ?? null, name: p.name, sku: variant?.sku ?? p.sku, colour: variant?.colour ?? null, size: variant?.size ?? null, price, image: p.primary_image_url, qty });
    setAdded(true); setQty(1);
  };
  return (<div className="mt-2">
    <img src={p.primary_image_url ?? ""} alt={p.name} className="aspect-square w-full max-w-xl bg-white object-cover" />
    <h1 className="mt-4 text-2xl font-black uppercase">{p.name}</h1>
    <div className="text-sm text-neutral-500">{variant?.sku ?? p.sku}</div><div className="mt-1 text-2xl font-bold">{aed(price)}</div>
    {hasC && <div className="mt-5"><div className="mb-2 text-sm font-bold tracking-widest">COLOUR</div><div className="flex flex-wrap gap-2">
      {colours.map((c) => <button key={c} className="chip" aria-pressed={colour === c} disabled={!!size && !ok(c, size)} onClick={() => pickC(c)}>{c}</button>)}</div></div>}
    {hasS && <div className="mt-5"><div className="mb-2 text-sm font-bold tracking-widest">SIZE</div><div className="flex flex-wrap gap-2">
      {sizes.map((s) => <button key={s} className="chip" aria-pressed={size === s} disabled={!!colour && !ok(colour, s)} onClick={() => pickS(s)}>{s}</button>)}</div></div>}
    <div className="mt-5"><div className="mb-2 text-sm font-bold tracking-widest">QUANTITY</div><div className="flex items-center gap-4">
      <button className="chip" onClick={() => setQty(clampQty(qty - 1))}>−</button><span className="w-8 text-center text-xl font-bold">{qty}</span><button className="chip" onClick={() => setQty(clampQty(qty + 1))}>+</button></div></div>
    {err && <p className="mt-3 font-semibold text-red-600">{err}</p>}
    <button className="btn mt-5 max-w-xl" onClick={add}>ADD TO ORDER</button>
    {added && <div className="mt-3 max-w-xl bg-green-50 p-3"><p className="font-semibold">Added to your order.</p>
      <div className="mt-2 grid grid-cols-2 gap-2"><Link href="/" className="chip flex items-center justify-center">CONTINUE SHOPPING</Link><Link href="/order" className="chip flex items-center justify-center bg-black text-white">VIEW ORDER</Link></div></div>}
  </div>);
}
