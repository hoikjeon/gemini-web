import { GoogleGenerativeAI } from "@google/generative-ai";

// 환경변수에서 API 키 불러오기
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 제미나이 2.0 모델 및 페르소나 설정
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: "당신은 연세척병원의 김동한 원장님을 보조하는 '허리인사이드' 유튜브 채널의 척추 및 관절 전문 AI 상담사입니다. 환자의 증상 질문에 친절하고 전문적인 의학 지식을 바탕으로 답변하세요. 단, 답변 마지막에는 항상 '정확한 진단과 치료를 위해 반드시 병원에 방문하여 전문의의 진료를 받아보시기를 권장합니다.'라는 문구를 포함하세요.",
});

export async function POST(req: Request) {
  try {
    // 1. 프론트엔드에서 보낸 '전체 대화 기록(messages 배열)'을 통째로 받음
    const { messages } = await req.json();

    // 혹시 모를 에러 방지 (메시지가 없을 경우)
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "메시지가 없습니다." }), { status: 400 });
    }

    // 2. 가장 마지막 질문 (사용자가 방금 친 최신 질문) 빼내기
    const lastMessage = messages[messages.length - 1].content;

    // 3. 이전 대화 기록들만 추려서 제미나이가 알아듣는 history 형식으로 변환
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // 4. 제미나이에게 이전 기억(history)을 주입하며 채팅방 열기
    const chat = model.startChat({ history });

    // 5. 마지막 질문 전송 및 스트리밍 답변 요청
    const result = await chat.sendMessageStream(lastMessage);

    // 6. 프론트엔드로 잘게 쪼개서(스트리밍) 보내기
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(new TextEncoder().encode(chunkText));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("API Route 에러:", error);
    return new Response(JSON.stringify({ error: "서버 에러 발생" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}