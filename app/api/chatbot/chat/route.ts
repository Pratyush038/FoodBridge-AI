import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { geminiChatbot, ChatMessage, ChatContext } from '@/lib/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      userId,
      userRole,
      userName
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build context for the chatbot
    const context: ChatContext = {
      userId: userId || session.user.email,
      userRole: userRole || 'donor',
      userName: userName || session.user.name || 'User'
    };

    // Convert conversation history to the right format
    const history: ChatMessage[] = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    // Generate response using Gemini
    const response = await geminiChatbot.generateResponse(
      message,
      context,
      history
    );

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
