"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cart, useCart } from "@/lib/cart";
import { aed, browser } from "@/lib/db";
export default function Order() {
  const { lines, ready, count, total } = useCart(); const router = useRouter();
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const lock = useRef(false);
  if (!ready) return <p className="mt-8">Loading…</p>;
  if (!lines.length) return <div className="mt-8"><h1 className="text-2xl font-black">YOUR ORDER</h1><p className="my-3">Your order is empty.</p><Link href="/" className="btn max-w-xs">BROWSE CATALOGUE</Link></div>;
  const submit = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setErr("");
    const { data, error } = await browser().rpc("create_order", { p_name: name, p_phone: phone, p_items: lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.qty })) });
    if (error || !data) { setErr("We couldn't generate your order. Please try again."); lock.current = false; setBusy(false); return; }
    cart.clear(); router.push(`/order/${data}`);
  };
  return (<div className="max-w-2xl"><h1 className="mt-2 text-2xl font-black tracking-wider">YOUR ORDER</h1>
    {lines.map((l) => (<div key={l.key} className="flex gap-3 border-b border-neutral-200 py-4">
      <img src={l.image ?? ""} alt="" className="h-24 w-24 bg-white object-cover" />
      <div className="flex-1"><div className="font-bold">{l.name}</div><div className="text-xs text-neutral-500">{l.sku}</div>
        {(l.colour || l.size) && <div className="mt-1 text-lg font-black uppercase">{[l.colour, l.size].filter(Boolean).join(" / ")}</div>}
        <div className="text-sm">{aed(l.price)} each</div>
        <div className="mt-2 flex items-center gap-3"><button className="chip" onClick={() => cart.setQty(l.key, l.qty - 1)}>−</button><span className="w-6 text-center font-bold">{l.qty}</span><button className="chip" onClick={() => cart.setQty(l.key, l.qty + 1)}>+</button>
          <span className="ml-auto font-bold">{aed(l.price * l.qty)}</span></div>
        <button className="mt-2 min-h-11 text-sm underline" onClick={() => cart.remove(l.key)}>Remove</button></div></div>))}
    <Link href="/" className="mt-3 block min-h-11 py-3 underline">Continue shopping</Link>
    <div className="mt-4 flex justify-between text-lg"><span>TOTAL ITEMS</span><b>{count}</b></div>
    <div className="flex justify-between text-2xl"><span>TOTAL</span><b>{aed(total)}</b></div>
    <p className="mt-1 text-xs text-neutral-500">Final prices are confirmed when the slip is generated.</p>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="mt-4 h-12 w-full border border-neutral-300 bg-white px-3" />
    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number (optional)" inputMode="tel" className="mt-2 h-12 w-full border border-neutral-300 bg-white px-3" />
    {err && <p className="mt-3 font-semibold text-red-600">{err}</p>}
    <button className="btn mt-4" disabled={busy} onClick={submit}>{busy ? "GENERATING…" : "GENERATE ORDER SLIP"}</button></div>);
}
