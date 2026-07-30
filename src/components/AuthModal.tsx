import { useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Email-ге жіберілген сілтеме арқылы аккаунтты растаңыз.");
    else onClose();
  };

  const google = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  return <div className="modal-backdrop"><section className="auth-modal" role="dialog" aria-modal="true">
    <button className="close" onClick={onClose}>×</button>
    <div className="auth-logo"><span>Q</span></div>
    <p className="eyebrow">ЖЕКЕ КАБИНЕТ</p><h2>{mode === "login" ? "Қайта оралуыңызбен!" : "QazaqType-қа қосылыңыз"}</h2>
    <p className="auth-lead">Прогрессіңізді барлық құрылғыда сақтаңыз.</p>
    <button className="google-button" onClick={google}><b>G</b> Google арқылы жалғастыру</button>
    <div className="auth-divider"><span>немесе email</span></div>
    <form onSubmit={submit}>{mode === "signup" && <label>Атыңыз<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Аты-жөніңіз" /></label>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="name@example.com" /></label>
      <label>Құпиясөз<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Кемінде 6 таңба" /></label>
      {message && <p className="auth-message">{message}</p>}<button className="auth-submit" disabled={busy}>{busy ? "Күте тұрыңыз..." : mode === "login" ? "Кіру" : "Тіркелу"}</button>
    </form>
    <p className="auth-switch">{mode === "login" ? "Аккаунтыңыз жоқ па?" : "Аккаунтыңыз бар ма?"} <button onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage("")}}>{mode === "login" ? "Тіркелу" : "Кіру"}</button></p>
  </section></div>;
}
