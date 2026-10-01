"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";
export default function Header() {
  const { count } = useCart();
  return (<header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
    <Link href="/" className="text-lg font-black tracking-[.2em]">ZAAS FASHION</Link>
    <Link href="/order" className="flex min-h-11 items-center bg-black px-4 text-sm font-bold tracking-widest text-white">ORDER ({count})</Link></header>);
}
