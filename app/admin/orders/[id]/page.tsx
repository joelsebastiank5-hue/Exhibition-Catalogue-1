"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { aed, browser } from "@/lib/db";
export default function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const [o, setO] = useState<any>(null), [err, setErr] = useState(""), [missing, setMissing] = useState(false);
  const load = async () => { const { data } = await browser().from("orders").select("*,order_items(*)").eq("id", id).maybeSingle(); if (data) setO(data); else setMissing(true); };
  useEffect(() => { load(); }, [id]);
  const set = async (status: string) => { if (status === "cancelled" && !confirm("Cancel this order?")) return;
    const { error } = await browser().from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id); if (error) setErr("Could not update status."); else load(); };
  if (missing) return <p>Order not found. <Link href="/admin" className="underline">Back</Link></p>;
  if (!o) return <p>Loading…</p>;
  return (<div className="max-w-2xl"><Link href="/admin" className="underline">← Orders</Link>
    <h1 className="mt-2 text-3xl font-black">ORDER {o.order_code}</h1><div className="font-bold uppercase">STATUS: {o.status}</div>
    <div className="text-sm">{new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</div>
    <div>Customer: {o.customer_name || "—"} · Mobile: {o.customer_phone || "—"}</div>
    {o.order_items.map((i: any) => (<div key={i.id} className="mt-3 flex gap-3 bg-white p-3"><img src={i.image_url ?? ""} alt="" className="h-24 w-24 object-cover" />
      <div className="flex-1"><div className="font-bold">{i.product_name}</div><div className="text-sm">SKU: {i.sku}</div>
        {i.colour && <div className="text-xl font-black uppercase">COLOUR: {i.colour}</div>}{i.size && <div className="text-4xl font-black uppercase">SIZE: {i.size}</div>}
        <div className="text-xl font-bold">QTY: {i.quantity}</div><div className="text-sm">{aed(i.unit_price)} each · Total {aed(i.line_total)}</div></div></div>))}
    <div className="mt-4 text-2xl font-black">ORDER TOTAL {aed(o.total_amount)}</div>{err && <p className="text-red-600">{err}</p>}
    <div className="mt-4 grid grid-cols-2 gap-2"><button className="btn" disabled={o.status === "completed"} onClick={() => set("completed")}>MARK COMPLETED</button>
      <button className="btn !bg-white !text-black border border-black" disabled={o.status === "cancelled"} onClick={() => set("cancelled")}>CANCEL ORDER</button></div></div>);
}
