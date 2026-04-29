// src/app/api/chat/route.ts
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const runtime = 'edge';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  image?: string;
}

export async function POST(req: Request) {
  try {
    const body: ChatRequest = await req.json();

    // Format messages (add image if present)
    const formattedMessages = body.messages.map((msg) => {
      if (msg.role === 'user' && body.image) {
        return {
          ...msg,
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: body.image } },
          ],
        };
      }
      return msg;
    });

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are LiteDoc AI, an expert assistant specialized in document understanding and visual question answering...`,
      messages: formattedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
