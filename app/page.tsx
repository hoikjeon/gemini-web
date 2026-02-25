"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  // ⭐ 1. 메시지 저장소에 'image' 자리 추가
  const [messages, setMessages] = useState<{ role: string; content: string; image?: string | null }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => setSelectedImage(null);

  const handleSend = async () => {
    if (inputValue.trim() === "" && !selectedImage) return;

    // ⭐ 2. 백엔드로 보낼 메시지에 사진(selectedImage)도 함께 포장!
    const userMessage = { role: "user", content: inputValue || "사진을 보냈습니다.", image: selectedImage };
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) handleSend();
  };

  return (
    <main className="flex h-screen flex-col bg-gray-50 max-w-2xl mx-auto shadow-xl border-x border-gray-200 relative">
      <header className="bg-blue-600 p-4 text-white shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex-1 text-center ml-8">🏥 허리인사이드 전문가 상담</h1>
        <button onClick={handleClearChat} className="text-xs bg-blue-700 px-3 py-1 rounded-full hover:bg-blue-800 transition">
          기록 삭제
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="mt-20 text-center">
            <p className="text-5xl mb-6">👁️</p>
            <p className="text-gray-500 font-medium text-lg">안녕하세요! 허리인사이드입니다.</p>
            <p className="text-blue-500 text-sm mt-2 font-semibold">✨ 사진 분석(Vision) 기능 탑재 완료!</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-2xl rounded-tr-none whitespace-pre-wrap"
                : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none overflow-hidden"
            }`}>
              {/* ⭐ 3. 내가 보낸 사진이 말풍선 안에 예쁘게 뜨도록 추가 */}
              {msg.image && (
                <img src={msg.image} alt="첨부됨" className="w-full max-w-xs h-auto rounded-lg mb-2 shadow-sm border border-blue-400" />
              )}
              {msg.role === "model" ? (
                <div className="whitespace-pre-wrap break-words prose prose-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none text-sm shadow-sm animate-pulse">
              제미나이가 열심히 사진을 분석 중입니다... 🔍
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-white p-4 border-t border-gray-100 pb-8 md:pb-4 flex flex-col gap-2">
        {selectedImage && (
          <div className="relative inline-block w-24 h-24 max-w-xl mx-auto self-start ml-2 mb-2 animate-fade-in-up">
            <img src={selectedImage} alt="미리보기" className="object-cover w-full h-full rounded-lg border border-gray-300 shadow-sm" />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md"
            >X</button>
          </div>
        )}

        <div className="flex gap-2 max-w-xl mx-auto w-full items-center">
          <label htmlFor="imageUpload" className="cursor-pointer text-gray-500 hover:text-blue-600 transition-colors p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </label>
          <input type="file" id="imageUpload" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="사진을 첨부하거나 증상을 입력하세요..."
            className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
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