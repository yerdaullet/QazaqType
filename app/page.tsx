"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AccountPage, type CloudProfile } from "../src/components/AccountPage";
import { AuthModal } from "../src/components/AuthModal";
import { cloudEnabled, supabase } from "../src/lib/supabase";

type View = "home" | "lessons" | "trainer" | "speed" | "results" | "account";
type KeyDef = { label: string; value?: string; grow?: number; finger?: number };
type Lesson = { id: number; title: string; subtitle: string; text: string; level: string };
type ResultRecord = { id: string; title: string; date: string; seconds: number; cpm: number; accuracy: number; errors: number; mistakeKeys?: Record<string,number>; lessonId?: number };

const abaiTexts = [
  { title: "Он тоғызыншы қара сөз", text: "Адам ата-анадан туғанда есті болмайды: естіп, көріп, ұстап, татып ескерсе, дүниедегі жақсы, жаманды таниды." },
  { title: "Отыз бірінші қара сөз", text: "Естіген нәрсені ұмытпастыққа төрт түрлі себеп бар: әуелі — көкірегі байлаулы берік болмақ керек." },
  { title: "Отыз сегізінші қара сөз", text: "Ғылым-білімді әуел бастан бала өзі ізденіп таппайды. Басында зорлықпенен яки алдауменен үйір қылу керек." },
  { title: "Жетінші қара сөз", text: "Жас бала анадан туғанда екі түрлі мінезбен туады: біреуі — ішсем, жесем, ұйықтасам деп тұрады." },
  { title: "Ғылым таппай мақтанба", text: "Ғылым таппай мақтанба, орын таппай баптанба, құмарланып шаттанба, ойнап босқа күлуге." },
  { title: "Дүниеге кірпіш болып қалан", text: "Сен де бір кірпіш дүниеге, кетігін тап та, бар қалан!" },
];

const lessonGroups: { title: string; description: string; lessons: Lesson[] }[] = [
  { title: "Негізгі сабақтар", description: "Саусақтарды бастапқы орнына қойып, әріптерді жаттықтырыңыз.", lessons: [
    { id: 1, title: "Ф Ы В А — О Л Д Ж", subtitle: "Ортаңғы қатар", text: "а о л д ж ф ы в а ол ал дала ауа", level: "Жеңіл" },
    { id: 2, title: "Ә І Ң Ғ", subtitle: "Қазақ әріптері", text: "әке әнің ғалым жаңа таң жаңғырық", level: "Жеңіл" },
    { id: 3, title: "Ү Ұ Қ Ө Һ", subtitle: "Арнайы әріптер", text: "үлкен ұлт қазақ өнер қаһарман", level: "Жеңіл" },
    { id: 4, title: "Й Ц У К Е Н", subtitle: "Жоғарғы қатар", text: "күн еңбек ниет кен дүние", level: "Орташа" },
  ]},
  { title: "Сөздерді тереміз", description: "Қысқа сөздерден толық сөйлемдерге біртіндеп өтіңіз.", lessons: [
    { id: 5, title: "Қысқа сөздер", subtitle: "2–4 әріп", text: "ана әке ата әже ел жер су күн", level: "Жеңіл" },
    { id: 6, title: "Ұзын сөздер", subtitle: "5–10 әріп", text: "Қазақстан болашақ тәуелсіздік мәдениет", level: "Орташа" },
    { id: 7, title: "Бас әріптер", subtitle: "Shift пернесі", text: "Абай Құнанбайұлы Қазақ Елі Алматы", level: "Орташа" },
    { id: 8, title: "Толық сөйлем", subtitle: "Ырғақ пен дәлдік", text: "Білімді ұрпақ — елдің жарқын болашағы.", level: "Орташа" },
  ]},
  { title: "Сандар мен тыныс белгілері", description: "Жазба мәтінді толық әрі сауатты теруге дайындалыңыз.", lessons: [
    { id: 9, title: "Үтір мен нүкте", subtitle: ", . : ;", text: "Оқы, үйрен, ойлан. Еңбек ет, талап қыл.", level: "Орташа" },
    { id: 10, title: "Сұрақ пен леп", subtitle: "? ! —", text: "Сен дайынсың ба? Ендеше, бастайық!", level: "Орташа" },
    { id: 11, title: "Сандар", subtitle: "1–9", text: "1 2 3 4 5 6 7 8 9 10", level: "Қиын" },
    { id: 12, title: "Барлығы бірге", subtitle: "Қорытынды", text: "2026 жыл: жаңа мақсат, тың қадам, үлкен нәтиже!", level: "Қиын" },
  ]},
  { title: "Қазақша мәтіндер", description: "Буын үндестігі, мақал-мәтел және табиғи қазақша сөйлемдермен жаттығыңыз.", lessons: [
    { id: 13, title: "Буындар", subtitle: "Ырғақты теру", text: "ба ла қа зақ да ла бо ла шақ бі лім ө нер", level: "Орташа" },
    { id: 14, title: "Үндестік заңы", subtitle: "Ә, Ө, Ү, Ұ", text: "әуен өмір үлкен өнер көңіл құлын бүгін", level: "Орташа" },
    { id: 15, title: "Мақал-мәтел", subtitle: "Халық даналығы", text: "Оқу — білім бұлағы, білім — өмір шырағы.", level: "Қиын" },
    { id: 16, title: "Туған жер", subtitle: "Сипаттама мәтін", text: "Туған жердің ауасы таза, тауы биік, даласы кең.", level: "Қиын" },
  ]},
  { title: "Шеберлік деңгейі", description: "Ұзақ мәтіндер, ресми стиль және жоғары жылдамдыққа арналған сабақтар.", lessons: [
    { id: 17, title: "Абай сөзі", subtitle: "Көркем мәтін", text: "Адам баласы адам баласынан ақыл, ғылым, ар, мінез деген нәрселермен озбақ.", level: "Қиын" },
    { id: 18, title: "Іскерлік мәтін", subtitle: "Ресми стиль", text: "Жобаның негізгі мақсаты — қазақ тіліндегі цифрлық сауаттылықты дамыту.", level: "Қиын" },
    { id: 19, title: "Жылдамдық 200", subtitle: "Тұрақты ырғақ", text: "еңбек білім талап ой еңбек білім талап ой еңбек білім талап ой", level: "Шебер" },
    { id: 20, title: "Қорытынды емтихан", subtitle: "Толық бағдарлама", text: "Қазақстанның болашағы — білімді, еңбекқор және отаншыл жастардың қолында. Әр күнгі ізденіс үлкен жетістікке бастайды!", level: "Шебер" },
  ]},
  { title: "Қазақ әріптерінің арнайы курсы", description: "Қазақ тіліне тән тоғыз әріпті жеке-жеке бекітіп, перне орнын есте сақтаңыз.", lessons: [
    { id: 21, title: "Ә және І", subtitle: "Сол жақ шынашақ", text: "ә і ә і әлем ілім әсем әділ білім тәлім", level: "Жеңіл" },
    { id: 22, title: "Ң және Ғ", subtitle: "Жоғарғы қатар", text: "ң ғ аң шаң ғарыш ғылым жаңғырық қоңыр", level: "Орташа" },
    { id: 23, title: "Ү Ұ Қ", subtitle: "Оң қол", text: "ү ұ қ күн құс ұлт үлкен құқық құдық", level: "Орташа" },
    { id: 24, title: "Ө және Һ", subtitle: "Оң шынашақ", text: "ө һ өмір өнер көктем қаһарман гауһар", level: "Орташа" },
  ]},
  { title: "Әдебиет және диктант", description: "Мақал-мәтел, өлең және мазмұнды қазақша мәтіндер арқылы сауатты теріңіз.", lessons: [
    { id: 25, title: "Бес асыл іс", subtitle: "Абай өлеңі", text: "Талап, еңбек, терең ой, қанағат, рақым — ойлап қой, бес асыл іс, көнсеңіз.", level: "Қиын" },
    { id: 26, title: "Отан", subtitle: "Тақырыптық диктант", text: "Отанды сүю отбасынан басталады. Туған тіл мен туған жер — елдіктің негізі.", level: "Қиын" },
    { id: 27, title: "Еңбек пен білім", subtitle: "Мақалдар жинағы", text: "Еңбек түбі — береке. Білекті бірді жығар, білімді мыңды жығар.", level: "Қиын" },
    { id: 28, title: "Цифрлық Қазақстан", subtitle: "Заманауи мәтін", text: "Цифрлық сауаттылық ақпаратты жылдам тауып, оны дұрыс қолданып, қауіпсіз бөлісуге үйретеді.", level: "Шебер" },
  ]},
  { title: "Емтихан режимі", description: "Ұзақ мәтін, дәлдік және жылдамдықты бір уақытта сынайтын қорытынды жаттығулар.", lessons: [
    { id: 29, title: "Дәлдік емтиханы", subtitle: "Қатесіз теру", text: "Асықпай, әр таңбаны дәл теріңіз: әдеп, ізгілік, жауапкершілік, ұқыптылық және өнер.", level: "Шебер" },
    { id: 30, title: "Жылдамдық емтиханы", subtitle: "Тұрақты қарқын", text: "қазақ тілі білім еңбек талап қазақ тілі білім еңбек талап қазақ тілі білім еңбек талап", level: "Шебер" },
    { id: 31, title: "Аралас емтихан", subtitle: "Әріп, сан, белгі", text: "QazaqType: 32 сабақ, 100% ынта және күн сайын 15 минут жаттығу!", level: "Шебер" },
    { id: 32, title: "Үлкен финал", subtitle: "Толық мәтін", text: "Білімді ұрпақ ана тілін құрметтейді, технологияны меңгереді және алған білімін елдің дамуына жұмсайды. Бүгінгі тұрақты еңбек — ертеңгі үлкен жеңіс.", level: "Шебер" },
  ]},
];
const totalLessonCount = lessonGroups.flatMap(group => group.lessons).length;

const rows: KeyDef[][] = [
  [...["Ә", "І", "Ң", "Ғ", ",", ".", "Ү", "Ұ", "Қ", "Ө", "Һ", "-", "="].map((label, i) => ({ label, value: label.toLowerCase(), finger: [0,1,2,3,3,6,6,7,8,9,9,9,9][i] })), { label: "⌫", grow: 1.45 }],
  [{ label: "Tab", grow: 1.35 }, ...["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"].map((label, i) => ({ label, value: label.toLowerCase(), finger: [0,1,2,3,3,6,6,7,8,9,9,9][i] }))],
  [{ label: "Caps", grow: 1.65 }, ...["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"].map((label, i) => ({ label, value: label.toLowerCase(), finger: [0,1,2,3,3,6,6,7,8,9,9][i] })), { label: "Enter", grow: 1.55 }],
  [{ label: "Shift", grow: 2.05 }, ...["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю"].map((label, i) => ({ label, value: label.toLowerCase(), finger: [0,1,2,3,3,6,7,8,9][i] })), { label: "Shift", grow: 2.05 }],
  [{ label: "Ctrl", grow: 1.25 }, { label: "Alt", grow: 1.25 }, { label: "Бос орын", value: " ", grow: 6.3, finger: 5 }, { label: "Alt", grow: 1.25 }, { label: "Ctrl", grow: 1.25 }],
];
const fingerColors = ["#ff7f6e", "#f5bd4f", "#58c783", "#35b6a9", "#6f78e8", "#6f78e8", "#9f68dc", "#ed6d85", "#f5bd4f", "#58c783"];
const fingerNames = ["Сол шынашақ", "Сол аты жоқ", "Сол ортаңғы", "Сол сұқ", "Сол сұқ", "Бас бармақ", "Оң сұқ", "Оң сұқ", "Оң ортаңғы", "Оң шынашақ"];
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function App() {
  const [view, setView] = useState<View>("home");
  const [exercise, setExercise] = useState<{ title: string; text: string; lessonId?: number; abaiIndex?: number }>({ title: abaiTexts[0].title, text: abaiTexts[0].text, abaiIndex: 0 });
  const [completed, setCompleted] = useState<number[]>([]);
  const [history, setHistory] = useState<ResultRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [cloudState, setCloudState] = useState<"local" | "syncing" | "synced">("local");

  useEffect(() => { const saved = localStorage.getItem("qazaqtype-completed"), savedHistory = localStorage.getItem("qazaqtype-history"); if (saved) setCompleted(JSON.parse(saved)); if (savedHistory) setHistory(JSON.parse(savedHistory)); }, []);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const client = supabase;
    if (!client || !user) { setProfile(null); setCloudState("local"); return; }
    let active = true;
    const hydrate = async () => {
      setCloudState("syncing");
      const profileQuery = await client.from("profiles").select("id,full_name,role,daily_goal").eq("id", user.id).single();
      if (active && profileQuery.data) setProfile(profileQuery.data as CloudProfile);
      const migrationKey = `qazaqtype-cloud-migrated-${user.id}`;
      if (!localStorage.getItem(migrationKey)) {
        const local = JSON.parse(localStorage.getItem("qazaqtype-history") || "[]") as ResultRecord[];
        if (local.length) {
          const { error } = await client.from("results").insert(local.map(result => ({ user_id: user.id, title: result.title, lesson_id: result.lessonId ?? null, seconds: result.seconds, cpm: result.cpm, accuracy: result.accuracy, errors: result.errors, mistake_keys: result.mistakeKeys ?? {}, created_at: result.date })));
          if (!error) localStorage.setItem(migrationKey, "1");
        } else localStorage.setItem(migrationKey, "1");
      }
      const { data } = await client.from("results").select("id,title,lesson_id,seconds,cpm,accuracy,errors,mistake_keys,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (active && data) {
        const cloudHistory: ResultRecord[] = data.map(row => ({ id: row.id, title: row.title, lessonId: row.lesson_id ?? undefined, seconds: row.seconds, cpm: row.cpm, accuracy: row.accuracy, errors: row.errors, mistakeKeys: (row.mistake_keys ?? {}) as Record<string, number>, date: row.created_at }));
        setHistory(cloudHistory);
        localStorage.setItem("qazaqtype-history", JSON.stringify(cloudHistory.slice(0, 30)));
        const cloudCompleted = cloudHistory.flatMap(result => result.lessonId && !result.title.startsWith("✎") ? [result.lessonId] : []);
        setCompleted(previous => { const next = [...new Set([...previous, ...cloudCompleted])]; localStorage.setItem("qazaqtype-completed", JSON.stringify(next)); return next; });
        setCloudState("synced");
      }
    };
    void hydrate();
    return () => { active = false; };
  }, [user]);
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openLesson = (lesson: Lesson) => { setExercise({ title: lesson.title, text: lesson.text, lessonId: lesson.id }); navigate("trainer"); };
  const openLessonById = (id: number) => { const lesson = lessonGroups.flatMap(group => group.lessons).find(item => item.id === id); if (lesson) openLesson(lesson); };
  const openCustomLesson = (title: string, text: string, lessonId: number) => { setExercise({ title, text, lessonId }); navigate("trainer"); };
  const openAbai = (i = 0) => { setExercise({ title: abaiTexts[i].title, text: abaiTexts[i].text, abaiIndex: i }); navigate("trainer"); };
  const openWeakPractice = (letters: string[]) => { const clean = letters.length ? letters : ["ә","і","ң","ғ","ү","ұ","қ","ө","һ"]; const words = clean.flatMap(letter => [letter.repeat(3), `${letter}а${letter}`, `а${letter}а`, `${letter}е${letter}`]); setExercise({ title: "Қиын әріптер жаттығуы", text: words.join(" ") }); navigate("trainer"); };
  const markComplete = (id?: number) => { if (!id) return; setCompleted(prev => { const next = [...new Set([...prev, id])]; localStorage.setItem("qazaqtype-completed", JSON.stringify(next)); return next; }); };
  const saveResult = (result: Omit<ResultRecord, "id" | "date">) => {
    const record = { ...result, id: crypto.randomUUID(), date: new Date().toISOString() };
    if (!result.title.startsWith("✎")) markComplete(result.lessonId);
    setHistory(prev => { const next = [record, ...prev].slice(0, 100); localStorage.setItem("qazaqtype-history", JSON.stringify(next.slice(0, 30))); return next; });
    if (supabase && user) {
      setCloudState("syncing");
      void supabase.from("results").insert({ user_id: user.id, title: record.title, lesson_id: record.lessonId ?? null, seconds: record.seconds, cpm: record.cpm, accuracy: record.accuracy, errors: record.errors, mistake_keys: record.mistakeKeys ?? {}, created_at: record.date }).then(({ error }) => setCloudState(error ? "local" : "synced"));
    }
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setProfile(null); navigate("home"); };
  const accountAction = () => { if (user) navigate("account"); else if (cloudEnabled) setAuthOpen(true); else navigate("account"); };

  return <main className="app-shell">
    <Header view={view} navigate={navigate} user={user} profile={profile} cloudState={cloudState} onAccount={accountAction} />
    {view === "home" && <Landing onStart={() => navigate("lessons")} onAbai={() => openAbai()} />}
    {view === "lessons" && <Lessons completed={completed} history={history} openLesson={openLesson} />}
    {view === "trainer" && <Trainer exercise={exercise} onComplete={saveResult} onChooseAbai={openAbai} onLessons={() => navigate("lessons")} />}
    {view === "speed" && <SpeedTest onComplete={saveResult} onResults={() => navigate("results")} />}
    {view === "results" && <Results history={history} completed={completed} onPractice={() => navigate("lessons")} onWeakPractice={openWeakPractice} />}
    {view === "account" && (user && profile ? <AccountPage user={user} profile={profile} results={history} completedCount={completed.length} onProfile={setProfile} onSignOut={signOut} onLesson={openLessonById} onCustomLesson={openCustomLesson} onHistoryCleared={() => { setHistory([]); setCompleted([]); }} /> : <CloudSetup onLogin={() => cloudEnabled ? setAuthOpen(true) : undefined} />)}
    <Footer navigate={navigate} />
    {authOpen && cloudEnabled && <AuthModal onClose={() => setAuthOpen(false)} />}
  </main>;
}

function Header({ view, navigate, user, profile, cloudState, onAccount }: { view: View; navigate: (view: View) => void; user: User | null; profile: CloudProfile | null; cloudState: "local" | "syncing" | "synced"; onAccount: () => void }) {
  return <header className="topbar"><button className="brand" onClick={() => navigate("home")} aria-label="QazaqType басты беті"><span>Q</span>azaqType</button>
    <nav>{([['home','Басты бет'],['lessons','Сабақтар'],['trainer','Тренажёр'],['speed','Сынақ'],['results','Нәтижелер']] as [View,string][]).map(([id,label]) => <button key={id} onClick={() => navigate(id)} className={view === id ? "nav-active" : ""}>{label}</button>)}</nav>
    <div className="header-actions"><span className={`cloud-dot ${cloudState}`} title={cloudState === "synced" ? "Прогресс бұлтта сақталды" : cloudState === "syncing" ? "Сақталуда" : "Осы құрылғыда сақталады"}/><span className="layout-badge">KZ</span><button className={`account-button ${view === "account" ? "active" : ""}`} onClick={onAccount}><i>{String(user?.user_metadata.avatar_emoji || profile?.full_name?.[0]?.toUpperCase() || (user ? "Q" : "↗"))}</i><span>{profile?.full_name || "Кіру"}</span></button></div>
  </header>;
}

function CloudSetup({ onLogin }: { onLogin: () => void }) {
  return <section className="cloud-setup page-width"><div><span>☁</span><p className="eyebrow">ЖЕКЕ КАБИНЕТ</p><h1>Прогресті жоғалтпаңыз</h1><p>Аккаунт арқылы нәтижелер барлық құрылғыда сақталады. Мұғалім сынып ашып, оқушыларға сабақ тағайындай алады.</p>{cloudEnabled ? <button className="cta" onClick={onLogin}>Кіру немесе тіркелу →</button> : <div className="setup-note"><b>Бұлттық база қосылмаған</b><span>Supabase параметрлерін Vercel ортасына енгізгеннен кейін тіркелу ашылады. Сабақтар мен жергілікті прогресс қазір де толық жұмыс істейді.</span></div>}</div></section>;
}

function Landing({ onStart, onAbai }: { onStart: () => void; onAbai: () => void }) {
  return <>
    <section className="hero page-width"><div className="hero-copy"><p className="eyebrow">ҚАЗАҚША ОЙЛА · ЖЫЛДАМ ТЕР</p><h1>Ойыңды пернетақтадан<br/><em>еркін жеткіз.</em></h1><p>QazaqType — қазақ әліпбиінің барлық әрпін соқыр әдіспен, жылдам әрі қатесіз теруге үйрететін тегін жаттықтырғыш.</p><div className="hero-actions"><button className="cta" onClick={onStart}>Тегін бастау <span>→</span></button><button className="text-button" onClick={onAbai}>Абаймен жаттығу</button></div><div className="trust-row"><span>✓ Тіркелусіз</span><span>✓ Қазақша сабақтар</span><span>✓ Нәтиже сақталады</span></div></div>
      <div className="hero-demo"><div className="demo-top"><i/><span>ОН ТОҒЫЗЫНШЫ ҚАРА СӨЗ</span><b>00:42</b></div><div className="demo-text"><span>Адам ата-анадан туғанда </span><mark>е</mark><strong>сті болмайды...</strong></div><div className="mini-keys"><kbd>Е</kbd><kbd>С</kbd><kbd>Т</kbd><kbd>І</kbd></div><div className="demo-score"><div><b>184</b><small>таң/мин</small></div><div><b>97%</b><small>дәлдік</small></div></div></div>
    </section>
    <section className="impact-strip"><div className="page-width impact-grid"><div><b>15</b><span>минут күн сайын</span></div><div><b>2×</b><span>жылдамырақ теру</span></div><div><b>42</b><span>қазақ әрпі</span></div><div><b>100%</b><span>тегін оқу</span></div></div></section>
    <section className="benefits page-width"><div className="section-heading"><p className="eyebrow">НЕ ҮШІН QAZAQTYPE?</p><h2>Жылдамдық — жай сан емес.<br/>Ол ойға берілген еркіндік.</h2></div><div className="benefit-grid">
      <article><span>01</span><i>⌨</i><h3>Қазақша толық раскладка</h3><p>Ә, І, Ң, Ғ, Ү, Ұ, Қ, Ө, Һ әріптерін дұрыс саусақпен теруді меңгеріңіз.</p></article>
      <article><span>02</span><i>◎</i><h3>Нақты нәтиже</h3><p>Әр сабақта жылдамдық, дәлдік және кеткен уақыт автоматты есептеледі.</p></article>
      <article><span>03</span><i>↗</i><h3>Жеңілден күрделіге</h3><p>Жеке әріптерден бастап, сөздер, сөйлемдер және көркем мәтіндерге өтесіз.</p></article>
      <article><span>04</span><i>✦</i><h3>Қазақ мұрасымен бірге</h3><p>Абайдың қара сөздерін теріп, тіл шеберлігі мен ой тереңдігін қатар сезініңіз.</p></article>
    </div></section>
    <section className="abai-banner page-width"><div><p className="eyebrow">СӨЗДІҢ ПАТШАСЫ</p><blockquote>«Адам баласы адам баласынан ақыл, ғылым, ар, мінез деген нәрселермен озбақ.»</blockquote><span>— Абай Құнанбайұлы</span></div><button className="cta dark" onClick={onAbai}>Қара сөздерді теру →</button></section>
  </>;
}

function Lessons({ completed, history, openLesson }: { completed: number[]; history: ResultRecord[]; openLesson: (lesson: Lesson) => void }) {
  const percent = Math.round((completed.length / totalLessonCount) * 100);
  return <section className="catalog page-width"><div className="catalog-head"><div><p className="eyebrow">ОҚУ БАҒДАРЛАМАСЫ</p><h1>Сабақтар</h1><p>Әр қадамда жаңа пернелерді меңгеріп, жылдамдығыңызды арттырыңыз.</p></div><div className="overall-progress"><div className="progress-ring" style={{ "--p": `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div><div><b>{completed.length} / {totalLessonCount}</b><small>сабақ аяқталды</small></div></div></div>
    {lessonGroups.map((group, gi) => <section className="lesson-group" key={group.title}><div className="group-title"><span>{String(gi + 1).padStart(2,"0")}</span><div><h2>{group.title}</h2><p>{group.description}</p></div></div><div className="lesson-grid">{group.lessons.map((lesson) => { const done = completed.includes(lesson.id), attempts=history.filter(r=>r.lessonId===lesson.id), best=attempts.sort((a,b)=>b.accuracy-a.accuracy||b.cpm-a.cpm)[0]; return <button className={`lesson-card ${done ? "completed" : ""}`} key={lesson.id} onClick={() => openLesson(lesson)}><div className="card-top"><span>{lesson.level}</span><b>{done ? "✓" : String(lesson.id).padStart(2,"0")}</b></div><div className="card-main"><small>{lesson.subtitle}</small><h3>{lesson.title}</h3><div className="circle-score">{best?best.cpm:0}</div></div><div className="card-foot"><span>◷ {best?formatTime(best.seconds):"00:00"}</span><span>◎ {best?best.accuracy:0}%</span></div></button>; })}</div></section>)}
  </section>;
}

function Trainer({ exercise, onComplete, onChooseAbai, onLessons }: { exercise: { title:string; text:string; lessonId?:number; abaiIndex?:number }; onComplete:(result:Omit<ResultRecord,"id"|"date">)=>void; onChooseAbai:(i:number)=>void; onLessons:()=>void }) {
  const [index,setIndex]=useState(0), [errors,setErrors]=useState(0), [typed,setTyped]=useState(0), [seconds,setSeconds]=useState(0), [running,setRunning]=useState(false), [wrong,setWrong]=useState(false), [finished,setFinished]=useState(false);
  const [shiftHeld,setShiftHeld]=useState(false);
  const [mistakeKeys,setMistakeKeys]=useState<Record<string,number>>({});
  const target=exercise.text, next=target[index]??" ";
  const activeFinger=useMemo(()=>{for(const row of rows)for(const key of row)if(key.value===next.toLowerCase())return key.finger??5;return 5;},[next]);
  const reset=useCallback(()=>{setIndex(0);setErrors(0);setTyped(0);setSeconds(0);setRunning(false);setWrong(false);setFinished(false);setShiftHeld(false);setMistakeKeys({});},[exercise]);
  useEffect(()=>reset(),[exercise,reset]);
  const press=useCallback((char:string)=>{if(finished||char.length!==1)return;setRunning(true);setTyped(v=>v+1);const dashMatches=char==="-"&&next==="—";if(char===next||dashMatches){setWrong(false);if(index+1>=target.length){const finalSeconds=Math.max(1,seconds), finalTyped=typed+1;setRunning(false);setFinished(true);onComplete({title:exercise.title,seconds:finalSeconds,cpm:Math.round(target.length/finalSeconds*60),accuracy:Math.max(0,Math.round(((finalTyped-errors)/finalTyped)*100)),errors,mistakeKeys,lessonId:exercise.lessonId});}setIndex(v=>v+1);}else{setErrors(v=>v+1);setMistakeKeys(prev=>({...prev,[next.toLowerCase()]:(prev[next.toLowerCase()]||0)+1}));setWrong(true);window.setTimeout(()=>setWrong(false),160);}},[finished,index,next,target.length,onComplete,seconds,typed,errors,exercise,mistakeKeys]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(e.key==="Shift"){setShiftHeld(true);return}if(e.key==="Escape"){reset();return}if(e.key.length===1){e.preventDefault();press(e.key)}};const up=(e:KeyboardEvent)=>{if(e.key==="Shift")setShiftHeld(false)};window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)}},[press,reset]);
  useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setSeconds(v=>v+1),1000);return()=>clearInterval(id)},[running]);
  const accuracy=typed?Math.max(0,Math.round(((typed-errors)/typed)*100)):100, cpm=seconds?Math.round(index/seconds*60):0, progress=Math.min(100,index/target.length*100);
  const customExercise = exercise.title.startsWith("✎");
  return <section className="workspace trainer-page"><div className="trainer-crumb"><button onClick={onLessons}>← Сабақтар</button><span>/</span><span>{customExercise ? "Мұғалім тапсырмасы" : exercise.lessonId ? "Жаттығу" : "Абайдың қара сөздері"}</span></div>
    <div className="lesson-head"><div><p className="eyebrow">{customExercise ? "ЖЕКЕ МӘТІН · СЫНЫП ТАПСЫРМАСЫ" : exercise.lessonId ? "ҚАЗАҚ ПЕРНЕТАҚТАСЫ · САБАҚ" : "КӨРКЕМ МӘТІН · АБАЙ ҚҰНАНБАЙҰЛЫ"}</p><h1>{customExercise ? "Мұғалімнің жеке мәтіні" : exercise.title}</h1></div><div className="timer"><span>УАҚЫТ</span><strong>{formatTime(seconds)}</strong></div></div>
    {!exercise.lessonId && <div className="abai-tabs">{abaiTexts.map((t,i)=><button className={exercise.abaiIndex===i?"selected":""} onClick={()=>onChooseAbai(i)} key={t.title}>{i+1}-мәтін</button>)}</div>}
    <div className="stats-row"><div><span>Жылдамдық</span><strong>{cpm}</strong><small>таң/мин</small></div><div><span>Дәлдік</span><strong>{accuracy}</strong><small>%</small></div><div><span>Қате</span><strong>{errors}</strong><small>рет</small></div><div className="live-progress"><span>{Math.round(progress)}% орындалды</span><i><b style={{width:`${progress}%`}}/></i></div></div>
    <section className={`type-card expanded ${wrong?"shake":""}`}><div className="progress" style={{width:`${progress}%`}}/><div className="text-line"><span className="done">{target.slice(0,index)}</span><span className="current">{target[index]}</span><span className="pending">{target.slice(index+1)}</span></div><p><kbd>Esc</kbd> қайта бастау · қазақ раскладкасын қосып, мәтінді теріңіз</p></section>
    <div className="coach"><Hand side="left" active={activeFinger}/><section className="keyboard"><div className="hint"><span style={{background:fingerColors[activeFinger]}}>{next===" "?"—":next}</span><div><small>КЕЛЕСІ ПЕРНЕ</small><strong>{next!==next.toLowerCase()?"Shift + ":""}{fingerNames[activeFinger]}</strong></div></div>{rows.map((row,ri)=><div className="key-row" key={ri}>{row.map((key,ki)=>{const isShift=key.label==="Shift";const keyActive=(key.value===next.toLowerCase()||(key.value==="-"&&next==="—"))||isShift&&(shiftHeld||next!==next.toLowerCase());return <button key={`${key.label}-${ki}`} onClick={()=>{if(isShift){setShiftHeld(v=>!v);return}if(key.value){const char=shiftHeld&&/[а-яәіңғүұқөһ]/i.test(key.value)?key.value.toUpperCase():key.value;press(char);if(shiftHeld)setShiftHeld(false)}}} className={`key ${keyActive?"active":""} ${isShift&&shiftHeld?"shift-on":""}`} style={{flexGrow:key.grow??1,"--key-color":fingerColors[key.finger??5]} as React.CSSProperties}>{shiftHeld&&key.value&&/[а-яәіңғүұқөһ]/i.test(key.value)?key.label.toUpperCase():key.label}</button>})}</div>)}</section><Hand side="right" active={activeFinger}/></div>
    {finished&&<div className="modal-backdrop"><section className="result-modal"><button className="close" onClick={()=>setFinished(false)}>×</button><div className="trophy">★</div><p className="eyebrow">ЖАТТЫҒУ АЯҚТАЛДЫ</p><h2>Жарайсыз!</h2><p className="result-copy">Мәтінді толық теріп шықтыңыз. Нәтижеңіз сақталды.</p><div className="result-grid"><div><span>{formatTime(seconds)}</span><small>Уақыт</small></div><div><span>{cpm}</span><small>Таң/мин</small></div><div><span>{accuracy}%</span><small>Дәлдік</small></div></div><div className="modal-actions"><button onClick={reset}>Қайта өту</button><button className="primary" onClick={exercise.abaiIndex!==undefined?()=>onChooseAbai((exercise.abaiIndex!+1)%abaiTexts.length):onLessons}>{exercise.abaiIndex!==undefined?"Келесі қара сөз →":"Сабақтарға оралу"}</button></div></section></div>}
  </section>;
}

function Hand({side,active}:{side:"left"|"right";active:number}){const isActive=side==="left"?active<=5:active>=6;return <div className={`hand-wrap ${side}`} aria-hidden="true"><div className="hand-icon">☝</div><span className={isActive?"hand-dot active":"hand-dot"} style={{background:fingerColors[active]}}/><small>{isActive?fingerNames[active]:"Қолды бос ұстаңыз"}</small></div>}

const speedText = ("Қазақстан — тәуелсіз, болашағы жарқын мемлекет. Білім мен еңбек адамды биік мақсаттарға жетелейді. Қазақ тілі — халқымыздың рухани қазынасы. Жылдам әрі сауатты теру ойды еркін жеткізуге көмектеседі. Адам күн сайын ізденіп, өз шеберлігін дамытады. Талап, еңбек, терең ой — адамды алға бастайтын асыл қасиеттер. ").repeat(10);
function SpeedTest({onComplete,onResults}:{onComplete:(result:Omit<ResultRecord,"id"|"date">)=>void;onResults:()=>void}){
  const [duration,setDuration]=useState(60),[remaining,setRemaining]=useState(60),[index,setIndex]=useState(0),[typed,setTyped]=useState(0),[errors,setErrors]=useState(0),[mistakes,setMistakes]=useState<Record<string,number>>({}),[running,setRunning]=useState(false),[finished,setFinished]=useState(false),[wrong,setWrong]=useState(false);const saved=useRef(false);
  const elapsed=Math.max(1,duration-remaining), accuracy=typed?Math.max(0,Math.round((typed-errors)/typed*100)):100, cpm=Math.round(index/elapsed*60);
  const reset=useCallback((seconds=duration)=>{setDuration(seconds);setRemaining(seconds);setIndex(0);setTyped(0);setErrors(0);setMistakes({});setRunning(false);setFinished(false);setWrong(false);saved.current=false},[duration]);
  useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setRemaining(v=>{if(v<=1){setRunning(false);setFinished(true);return 0}return v-1}),1000);return()=>clearInterval(timer)},[running]);
  useEffect(()=>{if(!finished||saved.current)return;saved.current=true;onComplete({title:`${duration} секундтық жылдамдық сынағы`,seconds:elapsed,cpm,accuracy,errors,mistakeKeys:mistakes})},[finished,duration,elapsed,cpm,accuracy,errors,mistakes,onComplete]);
  const press=useCallback((char:string)=>{if(finished||char.length!==1)return;setRunning(true);setTyped(v=>v+1);const next=speedText[index];if(char===next||(char==="-"&&next==="—")){setIndex(v=>v+1);setWrong(false)}else{setErrors(v=>v+1);setMistakes(prev=>({...prev,[next.toLowerCase()]:(prev[next.toLowerCase()]||0)+1}));setWrong(true);window.setTimeout(()=>setWrong(false),140)}},[finished,index]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){reset();return}if(e.key.length===1){e.preventDefault();press(e.key)}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[press,reset]);
  return <section className="speed-page page-width"><div className="speed-head"><div><p className="eyebrow">ЖЫЛДАМДЫҚ СЫНАУЫ</p><h1>Қаншалықты жылдам тересіз?</h1><p>Уақытты таңдаңыз. Таймер алғашқы пернеден кейін автоматты басталады.</p></div><div className={`countdown ${remaining<=10&&running?"urgent":""}`}><span>ҚАЛҒАН УАҚЫТ</span><b>{formatTime(remaining)}</b></div></div>
    <div className="duration-tabs">{[30,60,120].map(s=><button key={s} disabled={running} className={duration===s?"selected":""} onClick={()=>reset(s)}>{s<60?`${s} секунд`:`${s/60} минут`}</button>)}</div>
    <div className="speed-stats"><div><span>ЖЫЛДАМДЫҚ</span><b>{cpm}</b><small>таң/мин</small></div><div><span>ДӘЛДІК</span><b>{accuracy}%</b><small>қатесіз теру</small></div><div><span>ҚАТЕ</span><b>{errors}</b><small>рет</small></div><div><span>ТЕРІЛДІ</span><b>{index}</b><small>таңба</small></div></div>
    <section className={`speed-typebox ${wrong?"shake":""}`}><div className="speed-copy"><span>{speedText.slice(Math.max(0,index-55),index)}</span><mark>{speedText[index]}</mark><b>{speedText.slice(index+1,index+180)}</b></div><div className="speed-help"><span className={running?"live-dot active":"live-dot"}/>{running?"Сынақ жүріп жатыр":"Теруді бастаңыз"}<kbd>Esc</kbd> қайта бастау</div></section>
    <div className="test-tips"><div><i>01</i><b>Экранға қараңыз</b><p>Пернетақтаға қарамай, мәтінге назар аударыңыз.</p></div><div><i>02</i><b>Ырғақты сақтаңыз</b><p>Біркелкі жылдамдық жоғары нәтижеге жеткізеді.</p></div><div><i>03</i><b>Дәлдік маңызды</b><p>Алдымен қатесіз, содан кейін жылдам теріңіз.</p></div></div>
    {finished&&<div className="modal-backdrop"><section className="result-modal"><div className="trophy">↗</div><p className="eyebrow">СЫНАҚ АЯҚТАЛДЫ</p><h2>{cpm>=180?"Тамаша нәтиже!":cpm>=100?"Жақсы нәтиже!":"Жаттығуды жалғастырыңыз!"}</h2><p className="result-copy">Нәтижеңіз жеке статистикаға сақталды.</p><div className="result-grid"><div><span>{cpm}</span><small>Таң/мин</small></div><div><span>{accuracy}%</span><small>Дәлдік</small></div><div><span>{errors}</span><small>Қате</small></div></div><div className="modal-actions"><button onClick={()=>reset()}>Қайта сынау</button><button className="primary" onClick={onResults}>Нәтижелерді көру →</button></div></section></div>}
  </section>
}

function Results({history,completed,onPractice,onWeakPractice}:{history:ResultRecord[];completed:number[];onPractice:()=>void;onWeakPractice:(letters:string[])=>void}){
  const best=history.length?Math.max(...history.map(r=>r.cpm)):0, average=history.length?Math.round(history.reduce((s,r)=>s+r.accuracy,0)/history.length):0, minutes=Math.round(history.reduce((s,r)=>s+r.seconds,0)/60);
  const chart=[...history].slice(0,10).reverse(), max=Math.max(100,...chart.map(r=>r.cpm));
  const mistakeTotals=history.reduce<Record<string,number>>((all,r)=>{Object.entries(r.mistakeKeys||{}).forEach(([key,count])=>all[key]=(all[key]||0)+count);return all},{}), weakLetters=Object.entries(mistakeTotals).filter(([key])=>key.trim()).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const dayKeys=[...new Set(history.map(r=>new Date(r.date).toLocaleDateString("en-CA")))], today=new Date(); let streak=0; for(let i=0;i<60;i++){const d=new Date(today);d.setDate(today.getDate()-i);if(dayKeys.includes(d.toLocaleDateString("en-CA")))streak++;else if(i>0||dayKeys.length)break;}
  const xp=history.reduce((sum,result)=>sum+Math.max(25,Math.round(result.seconds/6+result.accuracy+Math.min(result.cpm,220)/3)),0), level=Math.floor(xp/500)+1, levelProgress=xp%500;
  return <section className="results-page page-width"><div className="results-head"><div><p className="eyebrow">ЖЕКЕ ПРОГРЕСС</p><h1>Нәтижелер</h1><p>Әр жаттығудан кейінгі көрсеткіштеріңіз осы құрылғыда сақталады.</p></div><button className="cta" onClick={onPractice}>Жаттығуды жалғастыру →</button></div>
    <section className="results-level"><div><span>ДЕҢГЕЙ {level}</span><b>{xp} XP</b></div><div><i style={{width:`${levelProgress/5}%`}}/></div><p>Келесі деңгейге <b>{500-levelProgress} XP</b> қалды · әр дәл әрі жылдам жаттығу көбірек XP береді</p></section>
    <div className="summary-grid"><article><span>ЖЕКЕ РЕКОРД</span><b>{best}</b><small>таңба / минут</small><i>↗</i></article><article><span>ОРТАША ДӘЛДІК</span><b>{average}%</b><small>{history.length} жаттығу бойынша</small><i>◎</i></article><article><span>ЖАТТЫҒУ УАҚЫТЫ</span><b>{minutes}</b><small>минут барлығы</small><i>◷</i></article><article><span>АЯҚТАЛҒАН САБАҚ</span><b>{completed.length}<em>/{totalLessonCount}</em></b><small>оқу бағдарламасы</small><i>✓</i></article></div>
    <div className="results-layout"><section className="chart-card"><div className="panel-title"><div><h2>Жылдамдық динамикасы</h2><p>Соңғы 10 жаттығу · таңба/минут</p></div><span>{chart.length ? `+${Math.max(0,chart[chart.length-1].cpm-(chart[0]?.cpm||0))}` : "—"}</span></div>{chart.length?<div className="bar-chart">{chart.map((r,i)=><div className="chart-column" key={r.id}><b>{r.cpm}</b><i style={{height:`${Math.max(8,r.cpm/max*100)}%`}} className={i===chart.length-1?"latest":""}/><small>{i+1}</small></div>)}</div>:<EmptyState onPractice={onPractice}/>}</section>
      <section className="goal-card"><p className="eyebrow">КЕЛЕСІ МАҚСАТ</p><h2>{best<150?"150 таңба/мин":"95% дәлдік"}</h2><p>{best<150?"Жылдамдықты тұрақты ырғақпен арттырыңыз.":"Жылдамдықты сақтап, қателерді азайтыңыз."}</p><div className="goal-track"><i style={{width:`${best<150?Math.min(100,best/150*100):Math.min(100,average/95*100)}%`}}/></div><span>{best<150?`${best} / 150 таң/мин`:`${average}% / 95%`}</span><button onClick={onPractice}>Сабақты таңдау</button></section></div>
    <div className="insight-grid"><section className="weak-card"><div className="panel-title"><div><h2>Қиын әріптер</h2><p>Ең көп қате жіберілген пернелер</p></div></div>{weakLetters.length?<><div className="weak-list">{weakLetters.map(([letter,count],i)=><div key={letter}><b>{letter.toUpperCase()}</b><span><i style={{width:`${Math.max(12,count/weakLetters[0][1]*100)}%`}}/></span><small>{count} қате</small></div>)}</div><button onClick={()=>onWeakPractice(weakLetters.map(([letter])=>letter))}>Осы әріптерді жаттықтыру →</button></>:<div className="mini-empty">Жаттығуды аяқтаңыз — қиын әріптер осы жерде пайда болады.</div>}</section>
      <section className="achievements-card"><div className="panel-title"><div><h2>Жетістіктер</h2><p>Сіздің жаңа белестеріңіз</p></div><span className="streak-badge">🔥 {streak} күн</span></div><div className="badge-grid extended"><div className={history.length>=1?"earned":""}><i>✦</i><b>Алғашқы қадам</b><small>1 жаттығу</small></div><div className={best>=150?"earned":""}><i>↗</i><b>Жылдам теруші</b><small>150 таң/мин</small></div><div className={average>=95&&history.length>0?"earned":""}><i>◎</i><b>Мінсіз дәлдік</b><small>Орташа 95%</small></div><div className={streak>=3?"earned":""}><i>🔥</i><b>Тұрақты қадам</b><small>3 күн қатарынан</small></div><div className={history.length>=10?"earned":""}><i>10</i><b>Ондық белес</b><small>10 жаттығу</small></div><div className={completed.length>=16?"earned":""}><i>½</i><b>Жарты жол</b><small>16 сабақ</small></div><div className={xp>=1000?"earned":""}><i>XP</i><b>Тәжірибелі</b><small>1000 XP</small></div><div className={completed.length>=totalLessonCount?"earned":""}><i>★</i><b>Шебер</b><small>{totalLessonCount} сабақ</small></div></div></section></div>
    <section className="history-card"><div className="panel-title"><div><h2>Соңғы жаттығулар</h2><p>Сіздің теру тарихыңыз</p></div></div>{history.length?<div className="history-table"><div className="history-row header"><span>Жаттығу</span><span>Күні</span><span>Уақыт</span><span>Жылдамдық</span><span>Дәлдік</span></div>{history.slice(0,8).map(r=><div className="history-row" key={r.id}><span><i>{r.lessonId?"S":"A"}</i><b>{r.title}</b></span><span>{new Intl.DateTimeFormat("kk-KZ",{day:"2-digit",month:"short"}).format(new Date(r.date))}</span><span>{formatTime(r.seconds)}</span><span><b>{r.cpm}</b> таң/мин</span><span className={r.accuracy>=90?"good":"warn"}>{r.accuracy}%</span></div>)}</div>:<EmptyState onPractice={onPractice}/>}</section>
  </section>
}
function EmptyState({onPractice}:{onPractice:()=>void}){return <div className="empty-state"><span>⌨</span><h3>Әзірге нәтиже жоқ</h3><p>Алғашқы жаттығуды аяқтағаннан кейін прогрессіңіз осында көрінеді.</p><button onClick={onPractice}>Алғашқы сабақты бастау</button></div>}
function Footer({navigate}:{navigate:(v:View)=>void}){return <footer><div className="page-width"><button className="brand" onClick={()=>navigate("home")}><span>Q</span>azaqType</button><p>Қазақша жылдам әрі сауатты теруге арналған жаттықтырғыш.</p><div><button onClick={()=>navigate("home")}>Басты бет</button><button onClick={()=>navigate("lessons")}>Сабақтар</button><button onClick={()=>navigate("trainer")}>Тренажёр</button><button onClick={()=>navigate("speed")}>Сынақ</button><button onClick={()=>navigate("results")}>Нәтижелер</button></div><small>© 2026 QazaqType · Қазақ тілі үшін жасалды</small></div></footer>}
