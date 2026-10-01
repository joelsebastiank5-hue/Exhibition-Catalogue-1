import Link from "next/link";
import { pub } from "@/lib/db";
import Picker from "@/components/Picker";
export const revalidate = 60;
export default async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: p } = await pub().from("products").select("id,name,sku,price,description,primary_image_url").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!p) return <p className="mt-8">This product is unavailable. <Link href="/" className="underline">Back to catalogue</Link></p>;
  const { data: v } = await pub().from("product_variants").select("id,sku,colour,size,price_override").eq("product_id", p.id).eq("is_active", true);
  return (<div><Picker p={p} variants={v ?? []} />{p.description && <p className="mt-6 max-w-xl text-neutral-600">{p.description}</p>}</div>);
}
