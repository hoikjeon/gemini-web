"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  
  // ⭐ 로딩 상태를 관리하는 변수 추가
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (inputValue.trim() === "") return;

    const userMessage = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    
    // ⭐ 통신 시작: 로딩 켜고, AI 빈 말풍선 만들기
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
      alert("제미나이와 연결하는 중 문제가 발생했습니다. 무료 할당량을 확인해 주세요.");
    } finally {
      // ⭐ 통신 종료: 성공하든 에러가 나든 무조건 로딩 끄기
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 로딩 중이 아닐 때만 엔터키 작동
    if (e.key === "Enter" && !isLoading) handleSend();
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
            <p className="text-blue-500 text-sm mt-2 font-semibold">✨ 마크다운 UI & 로딩 기능 적용 완료!</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-2xl rounded-tr-none whitespace-pre-wrap"
                : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none overflow-hidden"
            }`}>
              {/* ⭐ AI의 답변일 경우에만 마크다운 디자인 적용 */}
             {msg.role === "model" ? (
  <div className="whitespace-pre-wrap break-words">
    <ReactMarkdown>
      {msg.content}
    </ReactMarkdown>
  </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        
        {/* ⭐ 로딩 중일 때 표시되는 스피너 영역 */}
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
            disabled={isLoading} // 로딩 중 입력 방지
            placeholder="증상이나 궁금한 점을 입력하세요..."
            className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isLoading} // 로딩 중 클릭 방지
            className="rounded-full bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </footer>
    </main>
  );
}