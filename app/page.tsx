import Link from "next/link";
import { pub } from "@/lib/db";
export const revalidate = 60;
export default async function Home() {
  const { data, error } = await pub().from("categories").select("id,name,slug,image_url,products(count)").eq("is_active", true).order("sort_order");
  return (<div>
    <h1 className="mt-4 text-4xl font-black leading-none tracking-tight">EXHIBITION<br />CATALOGUE</h1>
    <p className="mb-6 mt-2 text-neutral-600">Explore our collection</p>
    {error ? <p>We couldn&apos;t load the catalogue. Please refresh.</p> : !data?.length ? <p>No categories yet.</p> :
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{data.map((c: any) => (
      <Link key={c.id} href={`/category/${c.slug}`} className="block bg-white">
        <img src={c.image_url ?? ""} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        <div className="p-3"><div className="font-bold uppercase tracking-wider">{c.name}</div><div className="text-sm text-neutral-500">{c.products?.[0]?.count ?? 0} Products</div></div>
      </Link>))}</div>}
  </div>);
}
