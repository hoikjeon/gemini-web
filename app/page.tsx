"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string; image?: string | null }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // 요약 상태
  const [summary, setSummary] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // 튜토리얼 및 면책 상태
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const [totalCount, setTotalCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const spineData = [
    { part: "경추", icon: "🦒", desc: "C자 곡선 유지!", stretch: "넥 리트랙션" },
    { part: "흉추", icon: "🐢", desc: "유연성이 핵심.", stretch: "고양이 자세" },
    { part: "요추", icon: "🧍", desc: "요추 전만 사수!", stretch: "맥켄지 운동" }
  ];

  useEffect(() => {
    const agreeStatus = localStorage.getItem("medicalDisclaimerAgreed");
    if (agreeStatus !== "true") {
      setShowDisclaimer(true);
    } else {
      const tutorialDone = localStorage.getItem("tutorialFinished");
      if (tutorialDone !== "true") {
        setShowTutorial(true);
        setTutorialStep(1);
      }
    }

    const saved = localStorage.getItem("chatHistory");
    if (saved) setMessages(JSON.parse(saved));
    setTotalCount(parseInt(localStorage.getItem("totalConsults") || "0"));
  }, []);

  const handleAgree = () => {
    localStorage.setItem("medicalDisclaimerAgreed", "true");
    setShowDisclaimer(false);
    setShowTutorial(true);
    setTutorialStep(1);
  };

  const nextStep = () => {
    if (tutorialStep < 4) setTutorialStep(prev => prev + 1);
    else finishTutorial(); // ⭐ 에러 해결: 여기서 호출하는 함수가 아래에 정의됨
  };

  // ⭐ 에러 해결: 삭제되었던 finishTutorial 함수를 다시 정의합니다.
  const finishTutorial = () => {
    localStorage.setItem("tutorialFinished", "true");
    setTutorialStep(0);
    setShowTutorial(false);
  };

  const handleSummarize = async () => {
    if (messages.length < 2) return;
    setIsSummarizing(true);
    setIsSummaryOpen(true);
    setSummary("요약 중...");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: "3줄 요약해줘." }] }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      if (reader) {
        setSummary("");
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          text += decoder.decode(value);
          setSummary(text);
        }
      }
    } catch (e) { setSummary("오류 발생"); } finally { setIsSummarizing(false); }
  };

  const executeSend = async (text: string, img: string | null) => {
    if (!text.trim() && !img) return;
    if (isLoading) return;
    const nt = totalCount + 1;
    setTotalCount(nt);
    localStorage.setItem("totalConsults", nt.toString());
    const userMsg = { role: "user", content: text || "이미지 분석", image: img };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setSelectedImage(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      setMessages(prev => [...prev, { role: "model", content: "" }]);
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages(prev => {
            const up = [...prev];
            up[up.length - 1].content += chunk;
            return up;
          });
        }
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  return (
    <main className="flex h-screen flex-col bg-gray-50 max-w-2xl mx-auto shadow-xl relative overflow-hidden font-sans text-gray-900">
      {showTutorial && <div className="absolute inset-0 bg-black/40 z-[90]" />}
      {showDisclaimer && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-2xl animate-zoom-in">
            <h2 className="text-xl font-bold mb-4">⚖️ 의료 면책 동의</h2>
            <p className="text-sm text-gray-600 mb-8">AI 상담은 가이드일 뿐 진료를 대신할 수 없습니다.</p>
            <button onClick={handleAgree} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">확인 및 시작</button>
          </div>
        </div>
      )}
      <header className="bg-blue-600 p-4 text-white flex justify-between font-bold shadow-md z-20">
        <h1>🏥 허리인사이드</h1>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[10px] bg-blue-700 px-3 py-1 rounded-full">초기화</button>
      </header>
      <section className="bg-blue-50 py-2 px-4 flex justify-between items-center z-20 border-b text-[10px] font-bold">
        <div className="text-blue-800">누적 상담: {totalCount}건</div>
        <button onClick={handleSummarize} className={`bg-white border text-blue-600 px-3 py-1 rounded-full ${tutorialStep === 3 ? "z-[100] ring-4 ring-yellow-400 relative" : ""}`}>
          {isSummarizing ? "⏳ 요약 중" : "📝 AI 요약"}
        </button>
      </section>
      {isSummaryOpen && <div className="bg-white p-4 border-b z-10 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap shadow-inner font-medium">{summary}</div>}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-2.5 max-w-[85%] text-sm rounded-2xl shadow-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 border"}`}>
              {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-w-full" alt="첨부" />}
              {/* ⭐ 에러 해결: ReactMarkdown에서 문법 오류를 일으키던 className을 제거했습니다. */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="absolute bottom-24 right-6 z-20">
        <button onClick={() => setIsGuideOpen(true)} className={`bg-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-xl border ${tutorialStep === 4 ? "z-[100] ring-4 ring-yellow-400 relative" : ""}`}>🦴</button>
      </div>
      {isGuideOpen && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between font-bold"><span>🦴 건강 가이드</span><button onClick={() => setIsGuideOpen(false)}>✕</button></div>
            <div className="p-4 flex flex-col gap-3">
              {spineData.map((s, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl flex gap-3 border text-[11px]"><div className="text-2xl">{s.icon}</div><div><h4 className="font-bold text-blue-700">{s.part}</h4><p>{s.desc}</p></div></div>
              ))}
            </div>
          </div>
        </div>
      )}
      <footer className="bg-white p-4 border-t z-[95] flex items-center gap-2">
        <label className={`p-2.5 bg-gray-100 rounded-full cursor-pointer ${tutorialStep === 2 ? "z-[100] ring-4 ring-yellow-400 relative bg-white" : ""}`}>📷<input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setSelectedImage(r.result as string); r.readAsDataURL(f); } }} /></label>
        <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && executeSend(inputValue, selectedImage)} className="flex-1 bg-gray-100 rounded-full px-5 py-2.5 text-sm" placeholder="메시지 입력" />
        <button onClick={() => executeSend(inputValue, selectedImage)} className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold text-xs">전송</button>
      </footer>
      {showTutorial && tutorialStep === 1 && <div className="absolute bottom-20 right-10 z-[100] bg-yellow-400 p-3 rounded-xl text-[10px] font-bold shadow-xl animate-bounce-slow">채팅을 시작해 보세요! <button onClick={nextStep} className="block mt-2 bg-black text-white px-2 py-1 rounded">다음 ▶</button></div>}
      {showTutorial && tutorialStep === 2 && <div className="absolute bottom-20 left-10 z-[100] bg-yellow-400 p-3 rounded-xl text-[10px] font-bold shadow-xl animate-bounce-slow">사진도 올릴 수 있어요! <button onClick={nextStep} className="block mt-2 bg-black text-white px-2 py-1 rounded">다음 ▶</button></div>}
      {showTutorial && tutorialStep === 3 && <div className="absolute top-32 right-10 z-[100] bg-yellow-400 p-3 rounded-xl text-[10px] font-bold shadow-xl animate-bounce-slow">상담을 요약해 드려요! <button onClick={nextStep} className="block mt-2 bg-black text-white px-2 py-1 rounded">다음 ▶</button></div>}
      {showTutorial && tutorialStep === 4 && <div className="absolute bottom-40 right-10 z-[100] bg-yellow-400 p-3 rounded-xl text-[10px] font-bold shadow-xl animate-bounce-slow">가이드 버튼입니다! <button onClick={nextStep} className="block mt-2 bg-black text-white px-2 py-1 rounded">시작하기 ✅</button></div>}
    </main>
  );
}