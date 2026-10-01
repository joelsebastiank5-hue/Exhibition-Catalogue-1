"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { aed, browser, hhmm, normCode } from "@/lib/db";
const TABS = ["new", "completed", "cancelled", "all"];
export default function Admin() {
  const [tab, setTab] = useState("new"), [q, setQ] = useState(""), [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState("");
  const load = useCallback(async () => {
    setErr(""); let r = browser().from("orders").select("id,order_code,status,customer_name,total_amount,created_at,order_items(quantity)").order("created_at", { ascending: false }).limit(100);
    const s = normCode(q);
    if (s) r = r.ilike("order_code", `%${s.replace(/[%_]/g, "")}%`); else if (tab !== "all") r = r.eq("status", tab);
    const { data, error } = await r; if (error) setErr(`Could not load orders: ${error.message}`); else setRows(data);
  }, [q, tab]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (<div className="max-w-3xl"><div className="flex items-center justify-between"><h1 className="text-2xl font-black tracking-widest">ORDERS</h1>
    <button className="chip" onClick={load}>REFRESH ORDERS</button></div>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH ORDER (e.g. K7M2)" className="my-3 h-14 w-full border-2 border-black bg-white px-3 text-lg uppercase" />
    <div className="mb-3 flex gap-2 overflow-x-auto">{TABS.map((t) => <button key={t} className="chip uppercase" aria-pressed={tab === t && !q} onClick={() => { setQ(""); setTab(t); }}>{t}</button>)}</div>
    {err && <p className="text-red-600">{err}</p>}
    {rows === null ? <p>Loading…</p> : !rows.length ? <p>{q ? "No order matches that code." : "No orders here."}</p> :
    rows.map((o) => (<Link key={o.id} href={`/admin/orders/${o.id}`} className="mb-2 flex items-center justify-between bg-white p-4">
      <div><div className="text-2xl font-black">{o.order_code}</div><div className="text-sm text-neutral-500">{hhmm(o.created_at)}{o.customer_name ? ` · ${o.customer_name}` : ""}</div></div>
      <div className="text-right"><div className="text-xs font-bold uppercase">{o.status}</div><div>{o.order_items.reduce((s: number, i: any) => s + i.quantity, 0)} items</div><div className="font-bold">{aed(o.total_amount)}</div></div></Link>))}</div>);
}
