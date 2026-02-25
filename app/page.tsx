"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string; image?: string | null }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 📊 통계 상태 관리
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const quickReplies = [
    "⚡ 허리가 찌릿찌릿 아파요",
    "🧘 집에서 하는 허리 스트레칭",
    "🦴 디스크 초기 증상이 궁금해요",
    "🐢 거북목 교정 자세 알려줘"
  ];

  useEffect(() => {
    // 채팅 내역 로드
    const savedMessages = localStorage.getItem("chatHistory");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch (e) { localStorage.removeItem("chatHistory"); }
    }

    // 통계 데이터 로드
    const savedTotal = localStorage.getItem("totalConsults");
    const savedToday = localStorage.getItem("todayConsults");
    const lastDate = localStorage.getItem("lastConsultDate");
    const currentDate = new Date().toLocaleDateString();

    if (savedTotal) setTotalCount(parseInt(savedTotal));

    if (lastDate === currentDate) {
      if (savedToday) setTodayCount(parseInt(savedToday));
    } else {
      setTodayCount(0);
      localStorage.setItem("todayConsults", "0");
      localStorage.setItem("lastConsultDate", currentDate);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClearChat = () => {
    if (confirm("대화 기록을 모두 지우시겠습니까?")) {
      setMessages([]);
      localStorage.removeItem("chatHistory");
      window.speechSynthesis.cancel();
    }
  };

  const handleDownloadChat = () => {
    if (messages.length === 0) { alert("저장할 상담 기록이 없습니다."); return; }
    const chatText = messages.map(msg => {
      const roleName = msg.role === "user" ? "👤 환자" : "🏥 허리인사이드";
      return `${roleName}:\n${msg.content}\n\n`;
    }).join("");
    const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "허리인사이드_상담기록.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ⭐ 에러 발생 지점: window as any를 사용하여 SpeechRecognition 문제를 해결합니다.
  const handleSpeechRecognition = () => {
    const win = window as any;
    if (!("webkitSpeechRecognition" in win) && !("SpeechRecognition" in win)) {
      alert("현재 브라우저에서는 음성 인식 기능을 지원하지 않습니다.");
      return;
    }
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSpeak = (text: string) => {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ko-KR";
    window.speechSynthesis.speak(utterance);
  };

  const executeSend = async (textToSend: string, imageToSend: string | null) => {
    if (textToSend.trim() === "" && !imageToSend) return;
    if (isLoading) return;

    const newTotal = totalCount + 1;
    const newToday = todayCount + 1;
    setTotalCount(newTotal);
    setTodayCount(newToday);
    localStorage.setItem("totalConsults", newTotal.toString());
    localStorage.setItem("todayConsults", newToday.toString());
    localStorage.setItem("lastConsultDate", new Date().toLocaleDateString());

    const userMessage = { role: "user", content: textToSend || "사진을 보냈습니다.", image: imageToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setSelectedImage(null);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "model", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content += chunkText;
              return updated;
            });
          }
        }
      }
    } catch (e) { alert("연결 오류 발생"); } finally { setIsLoading(false); }
  };

  return (
    <main className="flex h-screen flex-col bg-gray-50 max-w-2xl mx-auto shadow-xl border-x border-gray-200 relative">
      <header className="bg-blue-600 p-4 text-white shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex-1 text-center ml-8">🏥 허리인사이드 전문가 상담</h1>
        <div className="flex gap-2">
          <button onClick={handleDownloadChat} className="text-xs bg-emerald-500 px-3 py-1 rounded-full text-white hover:bg-emerald-600 transition flex items-center gap-1 shadow-sm font-medium">저장</button>
          <button onClick={handleClearChat} className="text-xs bg-blue-700 px-3 py-1 rounded-full hover:bg-blue-800 transition shadow-sm font-medium">삭제</button>
        </div>
      </header>

      <section className="bg-blue-50 border-b border-blue-100 py-1.5 px-4 flex justify-between items-center text-[11px] font-semibold text-blue-800">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          현재 실시간 상담 운영 중
        </div>
        <div className="flex gap-3">
          <span>오늘 상담: <span className="text-blue-600">{todayCount}</span>건</span>
          <span className="text-gray-300">|</span>
          <span>누적 상담: <span className="text-blue-600">{totalCount.toLocaleString()}</span>건</span>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center animate-fade-in-up">
            <p className="text-5xl mb-4">🩺</p>
            <p className="text-gray-700 font-bold text-xl">안녕하세요! 허리인사이드입니다.</p>
            <p className="text-gray-500 text-sm mt-2">척추/관절 건강에 대해 무엇이든 물어보세요.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {quickReplies.map((reply, index) => (
                <button key={index} onClick={() => executeSend(reply, null)} className="bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm active:scale-95">{reply}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-blue-500 text-white rounded-2xl rounded-tr-none" : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none flex flex-col"}`}>
              {msg.image && <img src={msg.image} alt="첨부" className="w-full max-w-xs h-auto rounded-lg mb-2 shadow-sm border border-blue-400" />}
              {msg.role === "model" ? (
                <>
                  <div className="prose prose-sm"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  {msg.content.length > 0 && !isLoading && index === messages.length - 1 && (
                    <button onClick={() => handleSpeak(msg.content)} className="mt-3 text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full transition-colors w-max border border-gray-200 shadow-sm">
                      🔊 읽어주기
                    </button>
                  )}
                </>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="px-4 py-3 bg-gray-100 text-gray-500 rounded-2xl w-max animate-pulse text-sm">답변 중... ✍️</div>}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-white p-4 border-t border-gray-100 flex flex-col gap-2">
        {selectedImage && (
          <div className="relative inline-block w-20 h-20 mb-2">
            <img src={selectedImage} alt="미리보기" className="object-cover w-full h-full rounded-lg border shadow-sm" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">X</button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <label htmlFor="img" className="cursor-pointer p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
          </label>
          <input type="file" id="img" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && executeSend(inputValue, selectedImage)} placeholder={isListening ? "듣고 있어요..." : "메시지 입력..."} className="flex-1 rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={handleSpeechRecognition} className={`p-2.5 rounded-full ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500"}`}>
            🎤
          </button>
          <button onClick={() => executeSend(inputValue, selectedImage)} disabled={isLoading || (!inputValue.trim() && !selectedImage)} className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold text-sm active:scale-95 disabled:bg-gray-300">전송</button>
        </div>
      </footer>
    </main>
  );
}