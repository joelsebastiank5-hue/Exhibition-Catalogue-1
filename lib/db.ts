import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const pub = () => createClient(url, key, { auth: { persistSession: false } });
export const browser = () => createBrowserClient(url, key);
export const aed = (n: number) => `AED ${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;
export const hhmm = (d: string) => new Date(d).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" });
export const normCode = (s: string) => s.trim().toUpperCase().replace(/^ZAAS-?/, "");
