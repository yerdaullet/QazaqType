"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type View = "home" | "lessons" | "trainer";
type KeyDef = { label: string; value?: string; grow?: number; finger?: number };
type Lesson = { id: number; title: string; subtitle: string; text: string; level: string };

const abaiTexts = [
  { title: "Он тоғызыншы қара сөз", text: "Адам ата-анадан туғанда есті болмайды: естіп, көріп, ұстап, татып ескерсе, дүниедегі жақсы, жаманды таниды." },
  { title: "Отыз бірінші қара сөз", text: "Естіген нәрсені ұмытпастыққа төрт түрлі себеп бар: әуелі — көкірегі байлаулы берік болмақ керек." },
  { title: "Отыз сегізінші қара сөз", text: "Ғылым-білімді әуел бастан бала өзі ізденіп таппайды. Басында зорлықпенен яки алдауменен үйір қылу керек." },
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
];

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

  useEffect(() => { const saved = localStorage.getItem("qazaqtype-completed"); if (saved) setCompleted(JSON.parse(saved)); }, []);
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openLesson = (lesson: Lesson) => { setExercise({ title: lesson.title, text: lesson.text, lessonId: lesson.id }); navigate("trainer"); };
  const openAbai = (i = 0) => { setExercise({ title: abaiTexts[i].title, text: abaiTexts[i].text, abaiIndex: i }); navigate("trainer"); };
  const markComplete = (id?: number) => { if (!id) return; setCompleted(prev => { const next = [...new Set([...prev, id])]; localStorage.setItem("qazaqtype-completed", JSON.stringify(next)); return next; }); };

  return <main className="app-shell">
    <Header view={view} navigate={navigate} />
    {view === "home" && <Landing onStart={() => navigate("lessons")} onAbai={() => openAbai()} />}
    {view === "lessons" && <Lessons completed={completed} openLesson={openLesson} />}
    {view === "trainer" && <Trainer exercise={exercise} onComplete={() => markComplete(exercise.lessonId)} onChooseAbai={openAbai} onLessons={() => navigate("lessons")} />}
    <Footer navigate={navigate} />
  </main>;
}

function Header({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  return <header className="topbar"><button className="brand" onClick={() => navigate("home")} aria-label="QazaqType басты беті"><span>Q</span>azaqType</button>
    <nav>{([['home','Басты бет'],['lessons','Сабақтар'],['trainer','Тренажёр']] as [View,string][]).map(([id,label]) => <button key={id} onClick={() => navigate(id)} className={view === id ? "nav-active" : ""}>{label}</button>)}</nav>
    <div className="header-actions"><span className="layout-badge">KZ</span><span className="header-note">Қазақша теру</span></div>
  </header>;
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

function Lessons({ completed, openLesson }: { completed: number[]; openLesson: (lesson: Lesson) => void }) {
  const total = lessonGroups.flatMap(g => g.lessons).length; const percent = Math.round((completed.length / total) * 100);
  return <section className="catalog page-width"><div className="catalog-head"><div><p className="eyebrow">ОҚУ БАҒДАРЛАМАСЫ</p><h1>Сабақтар</h1><p>Әр қадамда жаңа пернелерді меңгеріп, жылдамдығыңызды арттырыңыз.</p></div><div className="overall-progress"><div className="progress-ring" style={{ "--p": `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div><div><b>{completed.length} / {total}</b><small>сабақ аяқталды</small></div></div></div>
    {lessonGroups.map((group, gi) => <section className="lesson-group" key={group.title}><div className="group-title"><span>0{gi + 1}</span><div><h2>{group.title}</h2><p>{group.description}</p></div></div><div className="lesson-grid">{group.lessons.map((lesson) => { const done = completed.includes(lesson.id); return <button className={`lesson-card ${done ? "completed" : ""}`} key={lesson.id} onClick={() => openLesson(lesson)}><div className="card-top"><span>{lesson.level}</span><b>{done ? "✓" : String(lesson.id).padStart(2,"0")}</b></div><div className="card-main"><small>{lesson.subtitle}</small><h3>{lesson.title}</h3><div className="circle-score">{done ? "✓" : "0"}</div></div><div className="card-foot"><span>◷ 00:00</span><span>◎ {done ? "100" : "0"}%</span></div></button>; })}</div></section>)}
  </section>;
}

function Trainer({ exercise, onComplete, onChooseAbai, onLessons }: { exercise: { title:string; text:string; lessonId?:number; abaiIndex?:number }; onComplete:()=>void; onChooseAbai:(i:number)=>void; onLessons:()=>void }) {
  const [index,setIndex]=useState(0), [errors,setErrors]=useState(0), [typed,setTyped]=useState(0), [seconds,setSeconds]=useState(0), [running,setRunning]=useState(false), [wrong,setWrong]=useState(false), [finished,setFinished]=useState(false);
  const [shiftHeld,setShiftHeld]=useState(false);
  const target=exercise.text, next=target[index]??" ";
  const activeFinger=useMemo(()=>{for(const row of rows)for(const key of row)if(key.value===next.toLowerCase())return key.finger??5;return 5;},[next]);
  const reset=useCallback(()=>{setIndex(0);setErrors(0);setTyped(0);setSeconds(0);setRunning(false);setWrong(false);setFinished(false);setShiftHeld(false);},[exercise]);
  useEffect(()=>reset(),[exercise,reset]);
  const press=useCallback((char:string)=>{if(finished||char.length!==1)return;setRunning(true);setTyped(v=>v+1);const dashMatches=char==="-"&&next==="—";if(char===next||dashMatches){setWrong(false);if(index+1>=target.length){setRunning(false);setFinished(true);onComplete();}setIndex(v=>v+1);}else{setErrors(v=>v+1);setWrong(true);window.setTimeout(()=>setWrong(false),160);}},[finished,index,next,target.length,onComplete]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(e.key==="Shift"){setShiftHeld(true);return}if(e.key==="Escape"){reset();return}if(e.key.length===1){e.preventDefault();press(e.key)}};const up=(e:KeyboardEvent)=>{if(e.key==="Shift")setShiftHeld(false)};window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)}},[press,reset]);
  useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setSeconds(v=>v+1),1000);return()=>clearInterval(id)},[running]);
  const accuracy=typed?Math.max(0,Math.round(((typed-errors)/typed)*100)):100, cpm=seconds?Math.round(index/seconds*60):0, progress=Math.min(100,index/target.length*100);
  return <section className="workspace trainer-page"><div className="trainer-crumb"><button onClick={onLessons}>← Сабақтар</button><span>/</span><span>{exercise.lessonId ? "Жаттығу" : "Абайдың қара сөздері"}</span></div>
    <div className="lesson-head"><div><p className="eyebrow">{exercise.lessonId ? "ҚАЗАҚ ПЕРНЕТАҚТАСЫ · САБАҚ" : "КӨРКЕМ МӘТІН · АБАЙ ҚҰНАНБАЙҰЛЫ"}</p><h1>{exercise.title}</h1></div><div className="timer"><span>УАҚЫТ</span><strong>{formatTime(seconds)}</strong></div></div>
    {!exercise.lessonId && <div className="abai-tabs">{abaiTexts.map((t,i)=><button className={exercise.abaiIndex===i?"selected":""} onClick={()=>onChooseAbai(i)} key={t.title}>{i+1}-мәтін</button>)}</div>}
    <div className="stats-row"><div><span>Жылдамдық</span><strong>{cpm}</strong><small>таң/мин</small></div><div><span>Дәлдік</span><strong>{accuracy}</strong><small>%</small></div><div><span>Қате</span><strong>{errors}</strong><small>рет</small></div><div className="live-progress"><span>{Math.round(progress)}% орындалды</span><i><b style={{width:`${progress}%`}}/></i></div></div>
    <section className={`type-card expanded ${wrong?"shake":""}`}><div className="progress" style={{width:`${progress}%`}}/><div className="text-line"><span className="done">{target.slice(0,index)}</span><span className="current">{target[index]}</span><span className="pending">{target.slice(index+1)}</span></div><p><kbd>Esc</kbd> қайта бастау · қазақ раскладкасын қосып, мәтінді теріңіз</p></section>
    <div className="coach"><Hand side="left" active={activeFinger}/><section className="keyboard"><div className="hint"><span style={{background:fingerColors[activeFinger]}}>{next===" "?"—":next}</span><div><small>КЕЛЕСІ ПЕРНЕ</small><strong>{next!==next.toLowerCase()?"Shift + ":""}{fingerNames[activeFinger]}</strong></div></div>{rows.map((row,ri)=><div className="key-row" key={ri}>{row.map((key,ki)=>{const isShift=key.label==="Shift";const keyActive=(key.value===next.toLowerCase()||(key.value==="-"&&next==="—"))||isShift&&(shiftHeld||next!==next.toLowerCase());return <button key={`${key.label}-${ki}`} onClick={()=>{if(isShift){setShiftHeld(v=>!v);return}if(key.value){const char=shiftHeld&&/[а-яәіңғүұқөһ]/i.test(key.value)?key.value.toUpperCase():key.value;press(char);if(shiftHeld)setShiftHeld(false)}}} className={`key ${keyActive?"active":""} ${isShift&&shiftHeld?"shift-on":""}`} style={{flexGrow:key.grow??1,"--key-color":fingerColors[key.finger??5]} as React.CSSProperties}>{shiftHeld&&key.value&&/[а-яәіңғүұқөһ]/i.test(key.value)?key.label.toUpperCase():key.label}</button>})}</div>)}</section><Hand side="right" active={activeFinger}/></div>
    {finished&&<div className="modal-backdrop"><section className="result-modal"><button className="close" onClick={()=>setFinished(false)}>×</button><div className="trophy">★</div><p className="eyebrow">ЖАТТЫҒУ АЯҚТАЛДЫ</p><h2>Жарайсыз!</h2><p className="result-copy">Мәтінді толық теріп шықтыңыз. Нәтижеңіз сақталды.</p><div className="result-grid"><div><span>{formatTime(seconds)}</span><small>Уақыт</small></div><div><span>{cpm}</span><small>Таң/мин</small></div><div><span>{accuracy}%</span><small>Дәлдік</small></div></div><div className="modal-actions"><button onClick={reset}>Қайта өту</button><button className="primary" onClick={exercise.abaiIndex!==undefined?()=>onChooseAbai((exercise.abaiIndex!+1)%abaiTexts.length):onLessons}>{exercise.abaiIndex!==undefined?"Келесі қара сөз →":"Сабақтарға оралу"}</button></div></section></div>}
  </section>;
}

function Hand({side,active}:{side:"left"|"right";active:number}){const isActive=side==="left"?active<=5:active>=6;return <div className={`hand-wrap ${side}`} aria-hidden="true"><div className="hand-icon">☝</div><span className={isActive?"hand-dot active":"hand-dot"} style={{background:fingerColors[active]}}/><small>{isActive?fingerNames[active]:"Қолды бос ұстаңыз"}</small></div>}
function Footer({navigate}:{navigate:(v:View)=>void}){return <footer><div className="page-width"><button className="brand" onClick={()=>navigate("home")}><span>Q</span>azaqType</button><p>Қазақша жылдам әрі сауатты теруге арналған жаттықтырғыш.</p><div><button onClick={()=>navigate("home")}>Басты бет</button><button onClick={()=>navigate("lessons")}>Сабақтар</button><button onClick={()=>navigate("trainer")}>Тренажёр</button></div><small>© 2026 QazaqType · Қазақ тілі үшін жасалды</small></div></footer>}
