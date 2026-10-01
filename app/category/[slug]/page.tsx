import Link from "next/link";
import { pub } from "@/lib/db";
import Grid from "@/components/Grid";
export const revalidate = 60;
export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const db = pub();
  const { data: c } = await db.from("categories").select("id,name").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!c) return <p className="mt-8">Category not found. <Link href="/" className="underline">Back to catalogue</Link></p>;
  const { data: ps } = await db.from("products").select("id,name,slug,sku,price,primary_image_url").eq("category_id", c.id).eq("is_active", true).order("sort_order");
  return (<div><h1 className="mt-2 text-3xl font-black uppercase tracking-wider">{c.name}</h1>
    <p className="mb-4 text-neutral-500">{ps?.length ?? 0} Products</p><Grid products={ps ?? []} label={c.name.toLowerCase()} /></div>);
}
