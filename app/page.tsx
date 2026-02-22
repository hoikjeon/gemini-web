"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = async () => {
    if (inputValue.trim() === "") return;

    // 1. 내 질문 화면에 띄우기
    const userMessage = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // 2. 백엔드로 질문 보내기 (제미나이 호출)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
      });

      const data = await response.json();

      // 3. 제미나이 답변 화면에 띄우기
      setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
    } catch (error) {
      console.error("오류 발생:", error);
      alert("제미나이와 연결하는 중 문제가 발생했습니다.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <header className="bg-blue-600 p-4 text-white shadow-md">
        <h1 className="text-2xl font-bold">허리인사이드 AI 채팅</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-gray-400">
            오늘도 파이팅입니다! 아래에 제미나이에게 할 질문을 입력해보세요.
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-5 py-3 max-w-[70%] text-left ${
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-2xl rounded-tr-sm"
                : "bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <footer className="bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="제미나이에게 물어볼 내용을 입력하세요..."
            className="flex-1 rounded-xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
          >
            전송
          </button>
        </div>
      </footer>
    </main>
  );
}