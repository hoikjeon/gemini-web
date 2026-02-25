"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ⭐ 1. 처음 사이트에 들어왔을 때: 수첩(로컬 스토리지)에서 기존 대화 꺼내오기
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatHistory");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // ⭐ 2. 대화가 바뀔 때마다: 수첩(로컬 스토리지)에 새로운 대화 덮어쓰기
  useEffect(() => {
    // 빈 배열일 때는 저장하지 않도록 방어 (초기화 방지)
    if (messages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 대화 초기화 버튼 기능 추가
  const handleClearChat = () => {
    if (confirm("대화 기록을 모두 지우시겠습니까?")) {
      setMessages([]);
      localStorage.removeItem("chatHistory");
    }
  };

  const handleSend = async () => {
    if (inputValue.trim() === "") return;

    const userMessage = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "model", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
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
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content += chunkText;
            return newMessages;
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
        {/* ⭐ 대화 초기화 버튼 추가 */}
        <button onClick={handleClearChat} className="text-xs bg-blue-700 px-3 py-1 rounded-full hover:bg-blue-800 transition">
          기록 삭제
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="mt-20 text-center">
            <p className="text-5xl mb-6">🧘‍♂️</p>
            <p className="text-gray-500 font-medium text-lg">안녕하세요! 허리인사이드입니다.</p>
            <p className="text-blue-500 text-sm mt-2 font-semibold">✨ 대화 자동 저장 기능 켜짐!</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-2xl rounded-tr-none whitespace-pre-wrap"
                : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none overflow-hidden"
            }`}>
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
              제미나이가 열심히 답변을 작성 중입니다... ✍️
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-white p-4 border-t border-gray-100 pb-8 md:pb-4">
        <div className="flex gap-2 max-w-xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="증상이나 궁금한 점을 입력하세요..."
            className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="rounded-full bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </footer>
    </main>
  );
}