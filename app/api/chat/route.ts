import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `
      너는 유튜브 채널 '허리인사이드'의 전문 상담가 AI야. 
      항상 친절하고 다정하게 허리 건강에 대한 전문 지식을 답변해줘.
      답변 끝에는 반드시 "더 궁금한 점은 허리인사이드 유튜브 채널을 확인해주세요!"라고 남겨줘.
    `;

    // ⭐ 1. generateContent 대신 generateContentStream 사용 (실시간 생성)
    const result = await model.generateContentStream(systemPrompt + "\n\n질문: " + message);
    
    // ⭐ 2. 생성되는 글자를 조각내서 계속 흘려보내는(Streaming) 파이프라인 구축
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          // 글자 조각을 컴퓨터가 읽을 수 있게 변환해서 쏴줍니다.
          controller.enqueue(new TextEncoder().encode(chunkText));
        }
        controller.close();
      },
    });

    // 기존의 NextResponse.json() 대신 텍스트 스트림 자체를 반환합니다.
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("제미나이 스트리밍 에러:", error);
    return new Response("답변을 가져오는 중 에러가 발생했습니다.", { status: 500 });
  }
}