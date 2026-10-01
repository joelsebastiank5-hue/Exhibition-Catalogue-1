import Link from "next/link";
import { pub, aed } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Slip({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: o } = await pub().rpc("get_order_by_code", { p_code: decodeURIComponent(code) });
  if (!o) return <div className="mt-8"><h1 className="text-2xl font-black">ORDER NOT FOUND</h1><p className="my-2">Please check the code.</p><Link href="/" className="underline">Back to catalogue</Link></div>;
  return (<div className="mx-auto max-w-xl text-center"><div className="mt-4 text-sm font-bold tracking-[.3em]">ORDER SLIP GENERATED</div>
    <div className="mt-4 text-xs tracking-widest">YOUR ORDER CODE</div>
    <div className="my-2 break-all bg-black py-6 text-5xl font-black tracking-widest text-white sm:text-6xl">{o.order_code}</div>
    <p className="mb-6 font-bold">SHOW THIS CODE AT THE ZAAS COUNTER</p>
    <div className="text-left">{o.items.map((i: any, n: number) => (<div key={n} className="flex gap-3 border-b border-neutral-200 py-3">
      <img src={i.image_url ?? ""} alt="" className="h-20 w-20 bg-white object-cover" />
      <div className="flex-1"><div className="font-bold">{i.product_name}</div>
        {(i.colour || i.size) && <div className="text-2xl font-black uppercase">{[i.colour, i.size].filter(Boolean).join(" / ")}</div>}
        <div>Qty: {i.quantity}</div></div><div className="font-bold">{aed(i.line_total)}</div></div>))}</div>
    <div className="mt-4 flex justify-between text-lg"><span>TOTAL ITEMS</span><b>{o.total_items}</b></div>
    <div className="flex justify-between text-2xl"><span>TOTAL</span><b>{aed(o.total_amount)}</b></div></div>);
}
