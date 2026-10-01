"use client";
import Link from "next/link";
import { useState } from "react";
import { aed } from "@/lib/db";
type P = { id: string; name: string; slug: string; sku: string; price: number; primary_image_url: string | null };
export default function Grid({ products, label }: { products: P[]; label: string }) {
  const [q, setQ] = useState(""); const s = q.trim().toLowerCase();
  const list = products.filter((p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  return (<div>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label}...`} className="mb-4 h-12 w-full border border-neutral-300 bg-white px-3" />
    {!products.length ? <p>No products in this category yet.</p> : !list.length ? <p>No results for &ldquo;{q}&rdquo;.</p> :
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{list.map((p) => (
      <Link key={p.id} href={`/product/${p.slug}`} className="block bg-white">
        <img src={p.primary_image_url ?? ""} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
        <div className="p-2 text-sm"><div className="text-xs text-neutral-500">{p.sku}</div><div className="font-semibold leading-tight">{p.name}</div><div className="mt-1 font-bold">{aed(p.price)}</div></div>
      </Link>))}</div>}
  </div>);
}
