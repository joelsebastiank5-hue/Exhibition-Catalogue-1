"use client";
import { useState } from "react";
import { browser } from "@/lib/db";
export default function Login() {
  const [email, setE] = useState(""), [pw, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); setErr(""); const { error } = await browser().auth.signInWithPassword({ email, password: pw });
    if (error) { setErr("Login failed. Check your email and password."); setBusy(false); } else window.location.href = "/admin"; };
  return (<div className="mx-auto mt-10 max-w-sm"><h1 className="mb-6 text-3xl font-black tracking-widest">ZAAS ADMIN</h1>
    <input value={email} onChange={(e) => setE(e.target.value)} type="email" placeholder="Email" className="mb-2 h-12 w-full border border-neutral-300 bg-white px-3" />
    <input value={pw} onChange={(e) => setP(e.target.value)} type="password" placeholder="Password" className="mb-3 h-12 w-full border border-neutral-300 bg-white px-3" />
    {err && <p className="mb-3 font-semibold text-red-600">{err}</p>}<button className="btn" disabled={busy} onClick={go}>LOGIN</button></div>);
}
