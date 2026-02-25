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

  const quickReplies = [
    "⚡ 허리가 찌릿찌릿 아파요",
    "🧘 집에서 하는 허리 스트레칭",
    "🦴 디스크 초기 증상이 궁금해요",
    "🐢 거북목 교정 자세 알려줘"
  ];

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatHistory");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch (error) {
        localStorage.removeItem("chatHistory");
      }
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
    }
  };

  const handleDownloadChat = () => {
    if (messages.length === 0) {
      alert("저장할 상담 기록이 없습니다.");
      return;
    }
    const chatText = messages.map(msg => {
      const roleName = msg.role === "user" ? "👤 환자" : "🏥 허리인사이드";
      let content = msg.content;
      if (msg.image) content = "[사진 첨부됨]\n" + content;
      return `${roleName}:\n${content}\n\n--------------------------------------------------\n\n`;
    }).join("");

    const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "허리인사이드_사전문진표.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const handleRemoveImage = () => setSelectedImage(null);

  // ⭐ 타입스크립트 에러를 방지하는 마법의 'win' 치트키 적용!
  const handleSpeechRecognition = () => {
    const win = window as any; // 👈 깐깐한 검사를 무사통과하는 치트키입니다.
    
    if (!("webkitSpeechRecognition" in win) && !("SpeechRecognition" in win)) {
      alert("현재 브라우저에서는 음성 인식 기능을 지원하지 않습니다. 크롬(Chrome)이나 사파리(Safari)를 이용해 주세요.");
      return;
    }

    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = () => {
      alert("음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const executeSend = async (textToSend: string, imageToSend: string | null) => {
    if (textToSend.trim() === "" && !imageToSend) return;
    if (isLoading) return;

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

      if (!response.body) throw new Error("스트림을 지원하지 않습니다.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updatedMessages = [...prev];
            updatedMessages[updatedMessages.length - 1].content += chunkText;
            return updatedMessages;
          });
        }
      }
    } catch (error) {
      console.error("스트리밍 오류:", error);
      alert("제미나이와 연결하는 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => executeSend(inputValue, selectedImage);
  const handleQuickReply = (text: string) => executeSend(text, null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) handleSend();
  };

  return (
    <main className="flex h-screen flex-col bg-gray-50 max-w-2xl mx-auto shadow-xl border-x border-gray-200 relative">
      <header className="bg-blue-600 p-4 text-white shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex-1 text-center ml-8">🏥 허리인사이드 전문가 상담</h1>
        <div className="flex gap-2">
          <button onClick={handleDownloadChat} className="text-xs bg-emerald-500 px-3 py-1 rounded-full text-white hover:bg-emerald-600 transition flex items-center gap-1 shadow-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            저장
          </button>
          <button onClick={handleClearChat} className="text-xs bg-blue-700 px-3 py-1 rounded-full hover:bg-blue-800 transition shadow-sm font-medium">삭제</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center animate-fade-in-up">
            <p className="text-5xl mb-4">🩺</p>
            <p className="text-gray-700 font-bold text-xl">안녕하세요! 허리인사이드입니다.</p>
            <p className="text-gray-500 text-sm mt-2">척추/관절 건강에 대해 무엇이든 물어보세요.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {quickReplies.map((reply, index) => (
                <button key={index} onClick={() => handleQuickReply(reply)} className="bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm active:scale-95">
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-blue-500 text-white rounded-2xl rounded-tr-none whitespace-pre-wrap" : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none overflow-hidden"}`}>
              {msg.image && <img src={msg.image} alt="첨부됨" className="w-full max-w-xs h-auto rounded-lg mb-2 shadow-sm border border-blue-400" />}
              {msg.role === "model" ? <div className="whitespace-pre-wrap break-words prose prose-sm"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none text-sm shadow-sm animate-pulse">
              제미나이가 열심히 답변을 작성 중입니다... ✍️
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-white p-4 border-t border-gray-100 pb-8 md:pb-4 flex flex-col gap-2">
        {selectedImage && (
          <div className="relative inline-block w-24 h-24 max-w-xl mx-auto self-start ml-2 mb-2 animate-fade-in-up">
            <img src={selectedImage} alt="미리보기" className="object-cover w-full h-full rounded-lg border border-gray-300 shadow-sm" />
            <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md">X</button>
          </div>
        )}

        <div className="flex gap-2 max-w-xl mx-auto w-full items-center">
          <label htmlFor="imageUpload" className="cursor-pointer text-gray-500 hover:text-blue-600 transition-colors p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
          </label>
          <input type="file" id="imageUpload" accept="image/*" className="hidden" onChange={handleImageUpload} />
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isListening}
            placeholder={isListening ? "말씀해 주세요... 👂" : "사진을 첨부하거나 증상을 입력하세요..."}
            className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          
          <button
            onClick={handleSpeechRecognition}
            disabled={isLoading}
            className={`p-3 rounded-full transition-all flex-shrink-0 ${
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-blue-600"
            }`}
            title="음성으로 입력하기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button
            onClick={handleSend}
            disabled={isLoading || (inputValue.trim() === "" && !selectedImage)}
            className="rounded-full bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
          >전송</button>
        </div>
      </footer>
    </main>
  );
}