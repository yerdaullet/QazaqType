import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type CloudProfile = { id: string; full_name: string; role: "student" | "teacher"; daily_goal: number };
export type SimpleResult = { id?: string; title: string; cpm: number; accuracy: number; seconds: number; date: string; lessonId?: number; errors?: number; mistakeKeys?: Record<string, number> };
type SchoolClass = { id: string; name: string; join_code: string; teacher_id: string };
type Assignment = { id: string; title: string; lesson_id: number; due_at: string | null; created_at: string };
type MemberResult = SimpleResult & { userId: string };
type Member = { user_id: string; full_name: string; avg: number; best: number; minutes: number; results: MemberResult[] };

const avatars = ["🟢", "🦅", "🐆", "📚", "⚡", "🌟", "🎯", "⌨️"];
const todayKey = () => new Date().toLocaleDateString("en-CA");
const resultXp = (result: SimpleResult) => Math.max(25, Math.round(result.seconds / 6 + result.accuracy + Math.min(result.cpm, 220) / 3));
const parseCustom = (title: string) => {
  if (!title.startsWith("✎")) return null;
  const [difficulty, ...parts] = title.slice(1).split("|");
  return { difficulty: difficulty || "Орташа", text: parts.join("|") || title.slice(1) };
};
const parseCatalog = (title: string) => {
  if (!title.startsWith("§")) return null;
  const [lessonId, ...parts] = title.slice(1).split("|");
  return { lessonId: Number(lessonId), title: parts.join("|") };
};
const isCompleted = (assignment: Assignment, results: SimpleResult[]) => results.some(result => {
  if (new Date(result.date).getTime() < new Date(assignment.created_at).getTime()) return false;
  const catalog = parseCatalog(assignment.title);
  if (catalog) return result.lessonId === catalog.lessonId;
  return parseCustom(assignment.title) ? result.title === assignment.title : result.lessonId === assignment.lesson_id;
});
const assignmentState = (assignment: Assignment, results: SimpleResult[]) => {
  if (isCompleted(assignment, results)) return { label: "Орындалды", className: "done" };
  if (assignment.due_at && new Date(assignment.due_at) < new Date()) return { label: "Мерзімі өтті", className: "late" };
  return { label: "Орындалуда", className: "active" };
};

export function AccountPage({ user, profile, results, completedCount, onProfile, onSignOut, onLesson, onCustomLesson, onHistoryCleared }: {
  user: User;
  profile: CloudProfile;
  results: SimpleResult[];
  completedCount: number;
  onProfile: (profile: CloudProfile) => void;
  onSignOut: () => void;
  onLesson: (id: number) => void;
  onCustomLesson: (title: string, text: string, lessonId: number) => void;
  onHistoryCleared: () => void;
}) {
  const [tab, setTab] = useState<"profile" | "school">("profile");
  const [name, setName] = useState(profile.full_name);
  const [goal, setGoal] = useState(profile.daily_goal);
  const [avatar, setAvatar] = useState(String(user.user_metadata.avatar_emoji || "🟢"));
  const [saving, setSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const best = results.length ? Math.max(...results.map(result => result.cpm)) : 0;
  const avg = results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0;
  const todayResults = results.filter(result => new Date(result.date).toLocaleDateString("en-CA") === todayKey());
  const todaySeconds = todayResults.reduce((sum, result) => sum + result.seconds, 0);
  const goalPercent = Math.min(100, Math.round(todaySeconds / 60 / goal * 100));
  const xp = results.reduce((sum, result) => sum + resultXp(result), 0);
  const level = Math.floor(xp / 500) + 1;
  const levelProgress = xp % 500;
  const dayKeys = [...new Set(results.map(result => new Date(result.date).toLocaleDateString("en-CA")))];
  let streak = 0;
  for (let index = 0; index < 90; index++) {
    const date = new Date(); date.setDate(date.getDate() - index);
    if (dayKeys.includes(date.toLocaleDateString("en-CA"))) streak += 1;
    else if (index > 0 || dayKeys.length) break;
  }

  const save = async () => {
    if (!supabase || !name.trim()) return;
    setSaving(true); setAccountMessage("");
    const [{ data, error }, avatarResult] = await Promise.all([
      supabase.from("profiles").update({ full_name: name.trim(), daily_goal: goal, updated_at: new Date().toISOString() }).eq("id", user.id).select().single(),
      supabase.auth.updateUser({ data: { ...user.user_metadata, avatar_emoji: avatar } }),
    ]);
    setSaving(false);
    if (error || avatarResult.error) setAccountMessage(error?.message || avatarResult.error?.message || "Сақтау қатесі");
    else { if (data) onProfile(data as CloudProfile); setAccountMessage("Өзгерістер сақталды"); }
  };
  const changeRole = async () => {
    if (!supabase) return;
    const nextRole = profile.role === "teacher" ? "student" : "teacher";
    if (!window.confirm(`Рөлді «${nextRole === "teacher" ? "Мұғалім" : "Оқушы"}» режиміне ауыстырамыз ба?`)) return;
    const { data, error } = await supabase.from("profiles").update({ role: nextRole }).eq("id", user.id).select().single();
    if (error) setAccountMessage(error.message);
    else if (data) { onProfile(data as CloudProfile); setTab("school"); setAccountMessage("Рөл сәтті ауыстырылды"); }
  };
  const resetPassword = async () => {
    if (!supabase || !user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
    setAccountMessage(error ? error.message : "Құпиясөзді жаңарту сілтемесі поштаға жіберілді");
  };
  const clearHistory = async () => {
    if (!supabase || !window.confirm("Барлық жаттығу нәтижесін өшіруге сенімдісіз бе? Бұл әрекетті кері қайтару мүмкін емес.")) return;
    const { error } = await supabase.from("results").delete().eq("user_id", user.id);
    if (error) setAccountMessage(error.message);
    else { localStorage.removeItem("qazaqtype-history"); localStorage.removeItem("qazaqtype-completed"); onHistoryCleared(); setAccountMessage("Жаттығу тарихы тазаланды"); }
  };

  return <section className="account-page page-width">
    <div className="account-hero"><div className="avatar">{avatar}</div><div><p className="eyebrow">ЖЕКЕ КАБИНЕТ</p><h1>{profile.full_name || "QazaqType қолданушысы"}</h1><span>{user.email} · {profile.role === "teacher" ? "Мұғалім" : "Оқушы"}</span></div><button onClick={onSignOut}>Шығу</button></div>
    <div className="level-banner"><div><span>LVL {level}</span><b>{xp} XP</b><small>Келесі деңгейге {500 - levelProgress} XP қалды</small></div><div className="level-track"><i style={{ width: `${levelProgress / 5}%` }}/></div><div className="level-streak">🔥 <b>{streak}</b><small>күндік серия</small></div></div>
    <div className="account-tabs"><button className={tab === "profile" ? "selected" : ""} onClick={() => setTab("profile")}>Профиль және мақсат</button><button className={tab === "school" ? "selected" : ""} onClick={() => setTab("school")}>{profile.role === "teacher" ? "Мұғалім кабинеті" : "Менің сыныбым"}</button></div>
    {accountMessage && <p className="account-message">{accountMessage}</p>}
    {tab === "profile" ? <>
      <div className="profile-layout"><section className="profile-main"><h2>Жеке мәліметтер</h2><label>Аты-жөні<input value={name} onChange={event => setName(event.target.value)} /></label><label>Аватар<div className="avatar-picker">{avatars.map(item => <button type="button" className={avatar === item ? "selected" : ""} onClick={() => setAvatar(item)} key={item}>{item}</button>)}</div></label><label>Күнделікті мақсат<select value={goal} onChange={event => setGoal(Number(event.target.value))}>{[5, 10, 15, 20, 30, 45, 60].map(value => <option value={value} key={value}>{value} минут</option>)}</select></label><button className="save-profile" onClick={save} disabled={saving}>{saving ? "Сақталуда..." : "Өзгерістерді сақтау"}</button></section>
        <aside className="profile-side"><h2>Бүгінгі мақсат</h2><div className="daily-ring" style={{ "--daily": `${goalPercent * 3.6}deg` } as React.CSSProperties}><b>{goalPercent}%</b></div><p>{Math.round(todaySeconds / 60)} / {goal} минут орындалды</p><div className="account-mini-stats"><div><b>{best}</b><small>рекорд</small></div><div><b>{avg}%</b><small>дәлдік</small></div><div><b>{completedCount}</b><small>сабақ</small></div></div></aside></div>
      <div className="daily-quests"><div><p className="eyebrow">КҮНДЕЛІКТІ МИССИЯЛАР</p><h2>Бүгінгі үш қадам</h2></div><article className={todayResults.length >= 1 ? "done" : ""}><i>{todayResults.length >= 1 ? "✓" : "1"}</i><b>Бір жаттығу</b><small>{Math.min(1, todayResults.length)} / 1</small></article><article className={todaySeconds >= 600 ? "done" : ""}><i>{todaySeconds >= 600 ? "✓" : "2"}</i><b>10 минут теру</b><small>{Math.min(10, Math.round(todaySeconds / 60))} / 10 мин</small></article><article className={todayResults.some(result => result.accuracy >= 95) ? "done" : ""}><i>{todayResults.some(result => result.accuracy >= 95) ? "✓" : "3"}</i><b>95% дәлдік</b><small>{todayResults.length ? Math.max(...todayResults.map(result => result.accuracy)) : 0}%</small></article></div>
      <div className="account-security"><section><span>🔐</span><div><h3>Қауіпсіздік</h3><p>Құпиясөзді ауыстыру сілтемесін электрондық поштаға жіберіңіз.</p></div><button onClick={resetPassword}>Сілтемені жіберу</button></section><section><span>🛡️</span><div><h3>Құпиялылық</h3><p>Нәтижелер Supabase-та қорғалған. Оқушы тек өз деректерін, мұғалім тек өз сыныбының нәтижесін көреді.</p></div></section><section><span>↔</span><div><h3>Аккаунт рөлі</h3><p>Қазіргі рөл: <b>{profile.role === "teacher" ? "Мұғалім" : "Оқушы"}</b>. Рөлді тек өз растауыңызбен өзгерте аласыз.</p></div><button onClick={changeRole}>{profile.role === "teacher" ? "Оқушы режимі" : "Мұғалім режимі"}</button></section><section className="danger-zone"><span>⌫</span><div><h3>Жаттығу тарихы</h3><p>Бұлттағы және осы құрылғыдағы барлық нәтижені тазалау.</p></div><button onClick={clearHistory}>Тарихты тазалау</button></section></div>
    </> : <SchoolPanel profile={profile} results={results} onBecomeTeacher={changeRole} onLesson={onLesson} onCustomLesson={onCustomLesson} />}
  </section>;
}

function SchoolPanel({ profile, results, onBecomeTeacher, onLesson, onCustomLesson }: { profile: CloudProfile; results: SimpleResult[]; onBecomeTeacher: () => void; onLesson: (id: number) => void; onCustomLesson: (title: string, text: string, lessonId: number) => void }) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selected, setSelected] = useState("");
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [lessonId, setLessonId] = useState(1);
  const [dueAt, setDueAt] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"lesson" | "custom">("lesson");
  const [customText, setCustomText] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState("Орташа");
  const [message, setMessage] = useState("");

  const loadClasses = async () => {
    if (!supabase) return;
    if (profile.role === "teacher") {
      const { data } = await supabase.from("classes").select("*").order("created_at"); setClasses((data || []) as SchoolClass[]);
    } else {
      const { data } = await supabase.from("class_members").select("class_id, classes(id,name,join_code,teacher_id)");
      setClasses((data || []).flatMap((row: any) => row.classes ? [row.classes] : []) as SchoolClass[]);
    }
  };
  const loadClass = async () => {
    if (!selected || !supabase) return;
    const { data: assignmentData } = await supabase.from("assignments").select("id,title,lesson_id,due_at,created_at").eq("class_id", selected).order("created_at", { ascending: false });
    setAssignments((assignmentData || []) as Assignment[]);
    if (profile.role !== "teacher") return;
    const { data: memberData } = await supabase.from("class_members").select("user_id, profiles(full_name)").eq("class_id", selected);
    const ids = (memberData || []).map((row: any) => row.user_id);
    const { data: resultData } = ids.length ? await supabase.from("results").select("user_id,title,lesson_id,cpm,accuracy,seconds,mistake_keys,created_at").in("user_id", ids) : { data: [] as any[] };
    setMembers((memberData || []).map((row: any) => {
      const mine: MemberResult[] = (resultData || []).filter((result: any) => result.user_id === row.user_id).map((result: any) => ({ userId: result.user_id, title: result.title, lessonId: result.lesson_id || undefined, cpm: result.cpm, accuracy: result.accuracy, seconds: result.seconds, mistakeKeys: result.mistake_keys || {}, date: result.created_at }));
      return { user_id: row.user_id, full_name: row.profiles?.full_name || "Оқушы", avg: mine.length ? Math.round(mine.reduce((sum, result) => sum + result.accuracy, 0) / mine.length) : 0, best: mine.length ? Math.max(...mine.map(result => result.cpm)) : 0, minutes: Math.round(mine.reduce((sum, result) => sum + result.seconds, 0) / 60), results: mine };
    }));
  };
  useEffect(() => { void loadClasses(); }, [profile.role]);
  useEffect(() => { void loadClass(); }, [selected, profile.role]);
  useEffect(() => { if (!selected && classes[0]) setSelected(classes[0].id); }, [classes, selected]);

  const createClass = async () => { if (!supabase || !className.trim()) return; const { error } = await supabase.from("classes").insert({ name: className.trim(), teacher_id: profile.id }); if (error) setMessage(error.message); else { setClassName(""); setMessage("Сынып құрылды"); void loadClasses(); } };
  const join = async () => { if (!supabase || !joinCode.trim()) return; const { error } = await supabase.rpc("join_class", { invite_code: joinCode.trim().toUpperCase() }); if (error) setMessage(error.message); else { setJoinCode(""); setMessage("Сыныпқа қосылдыңыз"); void loadClasses(); } };
  const assign = async () => {
    if (!supabase || !selected) return;
    const title = assignmentMode === "custom" ? `✎${customDifficulty}|${customText.trim()}` : lessonId > 20 ? `§${lessonId}|${assignmentTitle.trim()}` : assignmentTitle.trim();
    if (!title || (assignmentMode === "custom" && customText.trim().length < 10)) { setMessage("Мәтін кемінде 10 таңбадан тұруы керек"); return; }
    const { error } = await supabase.from("assignments").insert({ class_id: selected, teacher_id: profile.id, title, lesson_id: assignmentMode === "custom" || lessonId > 20 ? 20 : lessonId, due_at: dueAt ? new Date(dueAt).toISOString() : null });
    if (error) setMessage(error.message); else { setAssignmentTitle(""); setCustomText(""); setDueAt(""); setMessage("Тапсырма берілді"); void loadClass(); }
  };
  const startAssignment = (assignment: Assignment) => { const custom = parseCustom(assignment.title), catalog = parseCatalog(assignment.title); if (custom) onCustomLesson(assignment.title, custom.text, assignment.lesson_id); else onLesson(catalog?.lessonId || assignment.lesson_id); };
  const removeAssignment = async (id: string) => { if (!supabase || !window.confirm("Тапсырманы өшіреміз бе?")) return; const { error } = await supabase.from("assignments").delete().eq("id", id); if (error) setMessage(error.message); else { setMessage("Тапсырма өшірілді"); void loadClass(); } };
  const allMemberResults = members.flatMap(member => member.results);
  const averageSpeed = allMemberResults.length ? Math.round(allMemberResults.reduce((sum, result) => sum + result.cpm, 0) / allMemberResults.length) : 0;
  const averageAccuracy = allMemberResults.length ? Math.round(allMemberResults.reduce((sum, result) => sum + result.accuracy, 0) / allMemberResults.length) : 0;
  const week = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); const key = date.toLocaleDateString("en-CA"); return { key, label: new Intl.DateTimeFormat("kk-KZ", { weekday: "short" }).format(date), count: allMemberResults.filter(result => new Date(result.date).toLocaleDateString("en-CA") === key).length }; });
  const maxDay = Math.max(1, ...week.map(day => day.count));
  const weakKeys = Object.entries(allMemberResults.reduce<Record<string, number>>((all, result) => { Object.entries(result.mistakeKeys || {}).forEach(([key, count]) => { if (key.trim()) all[key] = (all[key] || 0) + count; }); return all; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ranking = [...members].sort((a, b) => b.best - a.best || b.avg - a.avg);
  const downloadCsv = () => {
    const rows = [["Оқушы", "Рекорд (таң/мин)", "Орташа дәлдік", "Уақыт (мин)", "Жаттығу саны"], ...ranking.map(member => [member.full_name, member.best, member.avg, member.minutes, member.results.length])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "qazaqtype-synyp-esebi.csv"; link.click(); URL.revokeObjectURL(url);
  };

  if (profile.role !== "teacher" && !classes.length) return <div className="school-empty"><span>♟</span><h2>Сыныпқа қосылыңыз</h2><p>Мұғалім берген алты таңбалы кодты енгізіңіз.</p><div><input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" /><button onClick={join}>Қосылу</button></div>{message && <small>{message}</small>}<button className="teacher-switch" onClick={onBecomeTeacher}>Мен мұғаліммін →</button></div>;
  return <div className="school-layout"><aside className="class-sidebar"><h3>{profile.role === "teacher" ? "Менің сыныптарым" : "Менің сыныбым"}</h3>{classes.map(item => <button className={selected === item.id ? "selected" : ""} onClick={() => setSelected(item.id)} key={item.id}><b>{item.name}</b><small>Код: {item.join_code}</small></button>)}{profile.role === "teacher" ? <div className="new-class"><input value={className} onChange={event => setClassName(event.target.value)} placeholder="Жаңа сынып атауы" /><button onClick={createClass}>+ Құру</button></div> : <div className="new-class"><input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} placeholder="Қосылу коды" /><button onClick={join}>Қосылу</button></div>}{message && <p>{message}</p>}</aside>
    <section className="class-content">{!selected ? <div className="select-class">← Жұмыс істеу үшін сыныпты таңдаңыз</div> : <>
      {profile.role === "teacher" && <><div className="assign-form advanced"><div className="assign-title"><h2>Жаңа тапсырма</h2><div className="mode-switch"><button className={assignmentMode === "lesson" ? "selected" : ""} onClick={() => setAssignmentMode("lesson")}>Дайын сабақ</button><button className={assignmentMode === "custom" ? "selected" : ""} onClick={() => setAssignmentMode("custom")}>Өз мәтінім</button></div></div>{assignmentMode === "lesson" ? <><input value={assignmentTitle} maxLength={110} onChange={event => setAssignmentTitle(event.target.value)} placeholder="Тапсырма атауы" /><select value={lessonId} onChange={event => setLessonId(Number(event.target.value))}>{Array.from({ length: 32 }, (_, index) => <option value={index + 1} key={index}>Сабақ {index + 1}</option>)}</select></> : <><textarea value={customText} maxLength={105} onChange={event => setCustomText(event.target.value)} placeholder="Оқушы теретін қазақша мәтінді жазыңыз..." /><select value={customDifficulty} onChange={event => setCustomDifficulty(event.target.value)}><option>Жеңіл</option><option>Орташа</option><option>Қиын</option></select></>}<label className="due-field">Мерзімі<input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label><button className="assign-button" onClick={assign}>Тапсырма беру</button></div>
        <div className="teacher-overview"><article><span>ОҚУШЫ</span><b>{members.length}</b><small>сыныпта</small></article><article><span>ОРТАША ЖЫЛДАМДЫҚ</span><b>{averageSpeed}</b><small>таң/мин</small></article><article><span>ОРТАША ДӘЛДІК</span><b>{averageAccuracy}%</b><small>барлық нәтиже</small></article><article><span>ЖАТТЫҒУ</span><b>{allMemberResults.length}</b><small>барлығы</small></article></div>
        <div className="analytics-grid"><section><div className="analytics-title"><div><h3>7 күндік белсенділік</h3><p>Сынып орындаған жаттығулар</p></div><button onClick={downloadCsv}>CSV жүктеу ↓</button></div><div className="week-chart">{week.map(day => <div key={day.key}><b>{day.count}</b><i style={{ height: `${Math.max(7, day.count / maxDay * 100)}%` }} /><small>{day.label}</small></div>)}</div></section><section><h3>Қиын әріптер</h3>{weakKeys.length ? <div className="class-weak-list">{weakKeys.map(([key, count]) => <div key={key}><b>{key.toUpperCase()}</b><i><span style={{ width: `${count / weakKeys[0][1] * 100}%` }} /></i><small>{count}</small></div>)}</div> : <p className="muted">Қате статистикасы жаттығулардан кейін шығады.</p>}</section></div></>}
      <div className="class-columns"><section><h2>Тапсырмалар</h2>{assignments.length ? assignments.map(assignment => { const state = profile.role === "student" ? assignmentState(assignment, results) : null; const completion = members.length ? members.filter(member => isCompleted(assignment, member.results)).length : 0; const custom = parseCustom(assignment.title), catalog = parseCatalog(assignment.title), actualLesson = catalog?.lessonId || assignment.lesson_id; return <article className="assignment expanded" key={assignment.id}><div><span>{custom ? `${custom.difficulty} · Жеке мәтін` : `Сабақ ${actualLesson}`}</span><b>{custom ? custom.text : catalog?.title || assignment.title}</b>{assignment.due_at && <small>Мерзімі: {new Intl.DateTimeFormat("kk-KZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(assignment.due_at))}</small>}</div>{profile.role === "student" ? <div className="assignment-action"><em className={state?.className}>{state?.label}</em><button onClick={() => startAssignment(assignment)}>{state?.className === "done" ? "Қайта өту" : "Бастау →"}</button></div> : <div className="assignment-teacher-actions"><div className="completion-badge"><b>{completion}/{members.length}</b><small>орындады</small></div><button className="delete-assignment" onClick={() => removeAssignment(assignment.id)} aria-label="Тапсырманы өшіру">×</button></div>}</article>; }) : <p className="muted">Тапсырма әзірге жоқ.</p>}</section>{profile.role === "teacher" && <section><h2>Оқушылар рейтингі</h2>{ranking.length ? ranking.map((member, index) => <article className="student-row detailed" key={member.user_id}><i>{index + 1}</i><b>{member.full_name}</b><span>{member.best} таң/мин</span><em>{member.avg}% · {member.minutes} мин</em></article>) : <p className="muted">Оқушылар код арқылы қосылғанда осында көрінеді.</p>}</section>}</div>
    </>}</section></div>;
}
