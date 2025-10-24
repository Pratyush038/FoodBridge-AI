import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { geminiChatbot, ChatMessage, ChatContext } from '@/lib/gemini-service';

// POST /api/chatbot - Generate a chatbot response
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context, history } = body as {
      message: string;
      context?: ChatContext;
      history?: ChatMessage[];
    };

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get session for context
    const session = await getServerSession();
    const chatContext: ChatContext = {
      ...context,
      userId: session?.user?.email || undefined,
      userName: session?.user?.name || undefined,
    };

    const response = await geminiChatbot.generateResponse(
      message,
      chatContext,
      history || []
    );

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in POST /api/chatbot:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/chatbot/suggestions - Get suggested questions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') as 'donor' | 'ngo' | 'admin' | null;

    const suggestions = geminiChatbot.getSuggestedQuestions(role || undefined);

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error in GET /api/chatbot/suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions', details: error.message },
      { status: 500 }
    );
  }
}
