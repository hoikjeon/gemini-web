import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // ⭐ 1.5가 아닌 최신 2.0 모델을 사용합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `
      너는 유튜브 채널 '허리인사이드'의 전문 상담가 AI야. 
      항상 친절하고 다정하게 허리 건강에 대한 전문 지식을 답변해줘.
      답변 끝에는 반드시 "더 궁금한 점은 허리인사이드 유튜브 채널을 확인해주세요!"라고 남겨줘.
    `;

    const result = await model.generateContent(systemPrompt + "\n\n질문: " + message);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("제미나이 통신 에러:", error);
    return NextResponse.json({ error: "답변을 가져오지 못했습니다." }, { status: 500 });
  }
}