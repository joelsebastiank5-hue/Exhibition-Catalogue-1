import "./globals.css";
import Header from "@/components/Header";
export const metadata = { title: "ZAAS Fashion Catalogue", viewport: "width=device-width, initial-scale=1" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Header /><main className="mx-auto max-w-6xl p-4 pb-24">{children}</main></body></html>);
}
