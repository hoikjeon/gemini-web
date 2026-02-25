import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash", // ⭐ 2.0 모델이 눈(Vision) 기능도 기가 막히게 수행합니다.
  systemInstruction: "당신은 연세척병원의 김동한 원장님을 보조하는 '허리인사이드' 유튜브 채널의 척추 및 관절 전문 AI 상담사입니다. 환자의 증상 질문에 친절하고 전문적인 의학 지식을 바탕으로 답변하세요. 단, 답변 마지막에는 항상 '정확한 진단과 치료를 위해 반드시 병원에 방문하여 전문의의 진료를 받아보시기를 권장합니다.'라는 문구를 포함하세요.",
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "메시지가 없습니다." }), { status: 400 });
    }

    // ⭐ 3. 메시지에 사진(image)이 있다면, 제미나이가 읽을 수 있게 해독해주는 헬퍼 함수
    const formatMessage = (msg: any) => {
      const parts: any[] = [{ text: msg.content || "사진을 보냈습니다." }];
      
      // 사진 암호(Base64)가 들어왔다면 쪼개서 제미나이 전용 렌즈(inlineData)에 끼워줌
      if (msg.image) {
        const mimeType = msg.image.split(';')[0].split(':')[1];
        const base64Data = msg.image.split(',')[1];
        parts.push({
          inlineData: { data: base64Data, mimeType }
        });
      }
      return parts;
    };

    // 과거 대화 기록에 포맷 함수 적용
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: formatMessage(msg),
    }));

    // 마지막으로 보낸 질문(또는 사진)에 포맷 함수 적용
    const lastMessageObj = messages[messages.length - 1];
    const lastMessageParts = formatMessage(lastMessageObj);

    // 채팅 시작 및 사진 전송!
    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessageParts);

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