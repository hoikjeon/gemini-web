"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (inputValue.trim() === "") return;

    // 내 질문 화면에 띄우기
    const userMessage = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // AI의 빈 말풍선 미리 만들기
    setMessages((prev) => [...prev, { role: "model", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
      });

      if (!response.body) throw new Error("스트림을 지원하지 않습니다.");

      // 스트리밍 데이터 해독기
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <main className="flex h-screen flex-col bg-gray-50 max-w-2xl mx-auto shadow-xl border-x border-gray-200">
      <header className="bg-blue-600 p-4 text-white shadow-md text-center">
        <h1 className="text-xl font-bold">🏥 허리인사이드 전문가 상담</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="mt-20 text-center">
            <p className="text-5xl mb-6">🧘‍♂️</p>
            <p className="text-gray-500 font-medium text-lg">안녕하세요! 허리인사이드입니다.</p>
            <p className="text-blue-500 text-sm mt-2 font-semibold">✨ 실시간 스트리밍 모드 켜짐!</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-2xl rounded-tr-none"
                : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-white p-4 border-t border-gray-100 pb-8 md:pb-4">
        <div className="flex gap-2 max-w-xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="증상이나 궁금한 점을 입력하세요..."
            className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          />
          <button
            onClick={handleSend}
            className="rounded-full bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap"
          >
            전송
          </button>
        </div>
      </footer>
    </main>
  );
}