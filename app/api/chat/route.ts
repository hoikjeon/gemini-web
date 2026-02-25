import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: "당신은 연세척병원 김동한 원장 보조 AI '허리인사이드'입니다. 환자에게 친절하고 전문적으로 상담하세요.",
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const formatMessage = (msg: any) => {
      const parts: any[] = [{ text: msg.content || "상담 내용" }];
      
      // ⭐ 철벽 방어: msg.image가 '존재'하고 '문자열'이며 '내용이 있을' 때만 실행
      if (msg && msg.image && typeof msg.image === 'string' && msg.image.length > 0) {
        try {
          // 데이터가 base64 형식(콤마 포함)인지 한 번 더 확인
          if (msg.image.includes(',')) {
            const mimeType = msg.image.split(';')[0].split(':')[1] || 'image/jpeg';
            const base64Data = msg.image.split(',')[1];
            if (base64Data) {
              parts.push({ inlineData: { data: base64Data, mimeType } });
            }
          }
        } catch (e) {
          console.error("이미지 데이터 처리 스킵 (형식 불일치)");
        }
      }
      return parts;
    };

    const history = (messages || []).slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: formatMessage(msg),
    }));

    const lastMsg = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(formatMessage(lastMsg));

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          controller.enqueue(new TextEncoder().encode(chunk.text()));
        }
        controller.close();
      },
    });

    return new Response(stream);
  } catch (error) {
    console.error("Critical API Error:", error);
    return new Response(JSON.stringify({ error: "서버 내부 데이터 처리 오류" }), { status: 500 });
  }
}