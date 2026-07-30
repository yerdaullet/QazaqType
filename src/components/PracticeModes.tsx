import { useCallback, useEffect, useMemo, useState } from "react";

export type ModeResult = { title: string; seconds: number; cpm: number; accuracy: number; errors: number; mistakeKeys?: Record<string, number>; lessonId?: number };
type HistoryItem = ModeResult & { id: string; date: string };

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const weekNumber = () => {
  const date = new Date();
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
};
const raceTitle = () => `Апталық жарыс · ${new Date().getFullYear()}-${String(weekNumber()).padStart(2, "0")}`;
const raceText = "Қазақ тілінде жылдам әрі сауатты теру — ойды еркін жеткізудің сенімді жолы. Күн сайынғы тұрақты жаттығу дәлдік пен жылдамдықты қатар дамытады.";

export function RacePage({ history, onComplete, onResults }: { history: HistoryItem[]; onComplete: (result: ModeResult) => void; onResults: () => void }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [errors, setErrors] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const title = raceTitle();
  const previous = history.filter(result => result.title === title);
  const personalBest = previous.length ? Math.max(...previous.map(result => result.cpm)) : 0;
  const accuracy = typed ? Math.max(0, Math.round((typed - errors) / typed * 100)) : 100;
  const cpm = seconds ? Math.round(index / seconds * 60) : 0;
  const progress = Math.min(100, index / raceText.length * 100);
  const ghostProgress = personalBest && seconds ? Math.min(100, personalBest * seconds / 60 / raceText.length * 100) : 0;
  const reset = useCallback(() => { setIndex(0); setTyped(0); setErrors(0); setSeconds(0); setRunning(false); setFinished(false); setWrong(false); setMistakes({}); }, []);
  const press = useCallback((char: string) => {
    if (finished || char.length !== 1) return;
    setRunning(true); setTyped(value => value + 1);
    const next = raceText[index];
    if (char === next || (char === "-" && next === "—")) {
      const nextIndex = index + 1; setIndex(nextIndex); setWrong(false);
      if (nextIndex >= raceText.length) {
        const finalSeconds = Math.max(1, seconds), finalTyped = typed + 1;
        setRunning(false); setFinished(true);
        onComplete({ title, seconds: finalSeconds, cpm: Math.round(raceText.length / finalSeconds * 60), accuracy: Math.max(0, Math.round((finalTyped - errors) / finalTyped * 100)), errors, mistakeKeys: mistakes });
      }
    } else {
      setErrors(value => value + 1); setMistakes(previousMistakes => ({ ...previousMistakes, [next.toLowerCase()]: (previousMistakes[next.toLowerCase()] || 0) + 1 })); setWrong(true); window.setTimeout(() => setWrong(false), 150);
    }
  }, [errors, finished, index, mistakes, onComplete, seconds, title, typed]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape") { reset(); return; } if (event.key.length === 1) { event.preventDefault(); press(event.key); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [press, reset]);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds(value => value + 1), 1000); return () => window.clearInterval(timer); }, [running]);
  return <section className="race-page page-width"><div className="race-head"><div><p className="eyebrow">АПТАЛЫҚ ЖАРЫС · #{weekNumber()}</p><h1>Өзіңізбен және сыныппен жарысыңыз</h1><p>Барлығына ортақ мәтінді теріңіз. Мұғалім кабинетінде сыныптың апталық рейтингі автоматты құрылады.</p></div><div className="race-record"><span>ЖЕКЕ РЕКОРД</span><b>{personalBest || "—"}</b><small>{personalBest ? "таң/мин" : "алғашқы нәтижеңізді қойыңыз"}</small></div></div>
    <div className="race-board"><div className="race-lane"><span>СІЗ</span><div><i style={{ width: `${progress}%` }}><b>⌨</b></i></div><strong>{Math.round(progress)}%</strong></div><div className="race-lane ghost"><span>РЕКОРД</span><div><i style={{ width: `${ghostProgress}%` }}><b>◆</b></i></div><strong>{personalBest || 0}</strong></div></div>
    <div className="race-stats"><div><span>УАҚЫТ</span><b>{formatTime(seconds)}</b></div><div><span>ЖЫЛДАМДЫҚ</span><b>{cpm}</b><small>таң/мин</small></div><div><span>ДӘЛДІК</span><b>{accuracy}%</b></div><div><span>ҚАТЕ</span><b>{errors}</b></div></div>
    <section className={`race-copy ${wrong ? "shake" : ""}`}><span>{raceText.slice(0, index)}</span><mark>{raceText[index]}</mark><b>{raceText.slice(index + 1)}</b><p><kbd>Esc</kbd> қайта бастау · таймер алғашқы пернеден басталады</p></section>
    {finished && <div className="modal-backdrop"><section className="result-modal"><div className="trophy">🏁</div><p className="eyebrow">МӘРЕГЕ ЖЕТТІҢІЗ</p><h2>{cpm > personalBest ? "Жаңа рекорд!" : "Жарыс аяқталды!"}</h2><p className="result-copy">Нәтижеңіз апталық жарыс кестесіне сақталды.</p><div className="result-grid"><div><span>{cpm}</span><small>Таң/мин</small></div><div><span>{accuracy}%</span><small>Дәлдік</small></div><div><span>{errors}</span><small>Қате</small></div></div><div className="modal-actions"><button onClick={reset}>Қайта жарысу</button><button className="primary" onClick={onResults}>Нәтижелер →</button></div></section></div>}
  </section>;
}

const dictations = [
  { title: "Туған тіл", level: "Жеңіл", text: "Қазақ тілі — халқымыздың рухани қазынасы." },
  { title: "Білім", level: "Жеңіл", text: "Білімді адам жаңа мүмкіндіктерге жол ашады." },
  { title: "Туған жер", level: "Орташа", text: "Туған жердің кең даласы мен асқар тауы адамға ерекше күш береді." },
  { title: "Еңбек", level: "Орташа", text: "Тұрақты еңбек пен терең білім үлкен мақсатқа жеткізеді." },
  { title: "Цифрлық сауат", level: "Қиын", text: "Ақпаратты дұрыс пайдалану, қауіпсіз сақтау және сауатты бөлісу — цифрлық мәдениеттің негізі." },
];

export function DictationPage({ onComplete, onResults }: { onComplete: (result: ModeResult) => void; onResults: () => void }) {
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [plays, setPlays] = useState(0);
  const [result, setResult] = useState<{ accuracy: number; errors: number; seconds: number; cpm: number } | null>(null);
  const [voiceMessage, setVoiceMessage] = useState("");
  const dictation = dictations[selected];
  const voices = useMemo(() => typeof window === "undefined" ? [] : window.speechSynthesis?.getVoices() || [], [selected, plays]);
  const play = (slow = false) => {
    if (!("speechSynthesis" in window)) { setVoiceMessage("Бұл браузер дыбыстық оқуды қолдамайды."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(dictation.text);
    utterance.lang = "kk-KZ"; utterance.rate = slow ? 0.68 : 0.88;
    const kazakhVoice = voices.find(voice => voice.lang.toLowerCase().startsWith("kk")); if (kazakhVoice) utterance.voice = kazakhVoice;
    window.speechSynthesis.speak(utterance); setPlays(value => value + 1); if (!startedAt) setStartedAt(Date.now()); setVoiceMessage(kazakhVoice ? "Қазақша дауыс ойнатылды" : "Құрылғыдағы ең жақын дауыс қолданылды");
  };
  const reset = (next = selected) => { window.speechSynthesis?.cancel(); setSelected(next); setAnswer(""); setStartedAt(0); setPlays(0); setResult(null); setVoiceMessage(""); };
  const check = () => {
    if (!answer.trim()) return;
    const target = dictation.text.trim(), typed = answer.trim();
    let correct = 0; const mistakes: Record<string, number> = {};
    const length = Math.max(target.length, typed.length);
    for (let index = 0; index < length; index++) { if (target[index] === typed[index]) correct += 1; else if (target[index]) mistakes[target[index].toLowerCase()] = (mistakes[target[index].toLowerCase()] || 0) + 1; }
    const errors = length - correct, accuracy = Math.max(0, Math.round(correct / length * 100)), seconds = Math.max(1, Math.round((Date.now() - (startedAt || Date.now())) / 1000)), cpm = Math.round(typed.length / seconds * 60);
    setResult({ accuracy, errors, seconds, cpm }); onComplete({ title: `Дыбыстық диктант · ${dictation.title}`, seconds, cpm, accuracy, errors, mistakeKeys: mistakes });
  };
  return <section className="dictation-page page-width"><div className="dictation-head"><div><p className="eyebrow">ТЫҢДА · ТҮСІН · ТЕР</p><h1>Қазақша дыбыстық диктант</h1><p>Мәтінді тыңдап, естігеніңізді дәл теріңіз. Жауап тексерілгеннен кейін ғана түпнұсқа көрсетіледі.</p></div><span>🔊</span></div>
    <div className="dictation-layout"><aside><h3>Диктанттар</h3>{dictations.map((item, index) => <button className={selected === index ? "selected" : ""} onClick={() => reset(index)} key={item.title}><i>{index + 1}</i><span><b>{item.title}</b><small>{item.level} · {item.text.length} таңба</small></span></button>)}</aside><section className="dictation-work"><div className="audio-card"><div className={plays ? "sound-icon playing" : "sound-icon"}>◖)))</div><div><p className="eyebrow">{dictation.level} ДЕҢГЕЙ</p><h2>{dictation.title}</h2><small>{voiceMessage || "Дыбысты тыңдау үшін батырманы басыңыз"}</small></div><button onClick={() => play(false)}>▶ Тыңдау</button><button className="slow" onClick={() => play(true)}>0.7× Баяу</button></div><label className="dictation-input">Естіген мәтінді жазыңыз<textarea value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Мәтінді осы жерге теріңіз..." autoFocus /></label><div className="dictation-actions"><span>Тыңдалды: <b>{plays}</b> рет</span><button onClick={() => reset()}>Тазалау</button><button className="primary" onClick={check} disabled={!answer.trim()}>Жауапты тексеру →</button></div>{result && <div className="dictation-result"><div><span>ДӘЛДІК</span><b>{result.accuracy}%</b></div><div><span>ҚАТЕ</span><b>{result.errors}</b></div><div><span>ЖЫЛДАМДЫҚ</span><b>{result.cpm}</b><small> таң/мин</small></div><p><span>Дұрыс мәтін:</span>{dictation.text}</p><button onClick={onResults}>Барлық нәтижені көру →</button></div>}</section></div>
  </section>;
}
