export async function generateResponse(
  systemInstruction: string,
  prompt: string
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const chat = model.startChat({
    systemInstruction,
  });

  const result = await chat.sendMessage(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}
