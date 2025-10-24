import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseService } from './supabase-service';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  userRole?: 'donor' | 'ngo' | 'admin';
  userId?: string;
  userName?: string;
}

class GeminiChatbotService {
  private model: any;
  private systemPrompt = `You are FoodBridge AI Assistant, a helpful chatbot for a food donation platform that connects donors with NGOs and food banks to reduce food waste and fight hunger.

Your capabilities include:
1. Answering questions about the platform and how it works
2. Helping donors understand how to donate food
3. Helping NGOs/food banks find available donations
4. Providing information about food items and requests
5. Explaining the AI matching system
6. Guiding users through the donation and request process
7. Providing statistics and insights about donations

Important guidelines:
- Be friendly, helpful, and encouraging
- Keep responses concise and clear
- Use minimal emojis and appropriately to make conversations engaging, don't overuse them
- Format the response correctly
- Be professional and empathetic
- Do not use ** to bold text, it does not render properly in the chat interface. Do not use markdown formatting.
- When users ask about specific donations or requests, provide accurate data from the database
- Encourage food donation and highlight the positive impact
- If you don't know something, admit it and suggest contacting support
- Always maintain a professional and empathetic tone

When providing data:
- Format lists clearly with bullet points
- Include relevant details (quantity, location, urgency)
- Suggest actions users can take
- Highlight time-sensitive requests`;

  constructor() {
    this.initializeModel();
  }

  private initializeModel() {
    try {
      this.model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });
      console.log('✅ Gemini 2.0 Flash Thinking model initialized');
    } catch (error) {
      console.error('Error initializing Gemini model:', error);
    }
  }

  // Generate a response from the chatbot
  async generateResponse(
    userMessage: string,
    context: ChatContext = {},
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key') {
        return "I'm sorry, the AI chatbot is not configured yet. Please set up the Gemini API key in your environment variables.";
      }

      // Build context from database if user is authenticated
      const contextData = await this.buildContext(userMessage, context);

      // Build the full prompt
      const fullPrompt = this.buildPrompt(
        userMessage,
        context,
        contextData,
        conversationHistory
      );

      // Generate response
      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      return "I'm sorry, I encountered an error. Please try again or contact support.";
    }
  }

  // Build context from the database based on user query
  private async buildContext(
    userMessage: string,
    context: ChatContext
  ): Promise<string> {
    const lowerMessage = userMessage.toLowerCase();
    let contextData = '';

    try {
      // Check if user is asking about available donations
      if (
        lowerMessage.includes('donation') ||
        lowerMessage.includes('food available') ||
        lowerMessage.includes('what food') ||
        lowerMessage.includes('show me')
      ) {
        const availableFoodItems = await supabaseService.foodItem.getAvailable();
        if (availableFoodItems.length > 0) {
          contextData += '\n\n📦 Available Food Items:\n';
          availableFoodItems.slice(0, 10).forEach((item, index) => {
            const expiryDate = new Date(item.expiry_date);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            contextData += `${index + 1}. ${item.food_type} - ${item.quantity} ${item.unit} (Expires in ${daysUntilExpiry} days, Location: ${item.pickup_address})\n`;
          });
          if (availableFoodItems.length > 10) {
            contextData += `\n... and ${availableFoodItems.length - 10} more items available.\n`;
          }
        } else {
          contextData += '\n\nCurrently, there are no available food donations.';
        }
      }

      // Check if user is asking about requests
      if (
        lowerMessage.includes('request') ||
        lowerMessage.includes('need') ||
        lowerMessage.includes('ngo') ||
        lowerMessage.includes('who needs')
      ) {
        const activeRequests = await supabaseService.request.getActive();
        if (activeRequests.length > 0) {
          contextData += '\n\n🏢 Active Requests from NGOs:\n';
          activeRequests.slice(0, 10).forEach((req, index) => {
            const neededBy = new Date(req.needed_by);
            const daysUntilNeeded = Math.ceil((neededBy.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            contextData += `${index + 1}. ${req.title} - ${req.quantity} ${req.unit} of ${req.food_type} (Urgency: ${req.urgency}, Needed in ${daysUntilNeeded} days, Location: ${req.delivery_address})\n`;
          });
          if (activeRequests.length > 10) {
            contextData += `\n... and ${activeRequests.length - 10} more requests.\n`;
          }
        } else {
          contextData += '\n\nCurrently, there are no active food requests.';
        }
      }

      // Check if user is asking about statistics
      if (
        lowerMessage.includes('stat') ||
        lowerMessage.includes('how many') ||
        lowerMessage.includes('total') ||
        lowerMessage.includes('impact') ||
        lowerMessage.includes('platform') ||
        lowerMessage.includes('complete') ||
        lowerMessage.includes('donated')
      ) {
        const stats = await supabaseService.analytics.getDashboardStats();
        const completedCount = stats.completedTransactions || 0;
        const totalDonated = stats.totalQuantityDonated || 0;
        
        contextData += `\n\n📊 Platform Statistics:
- Total Donors: ${stats.totalDonors}
- Total NGOs: ${stats.totalNGOs}
- Total Food Items Listed: ${stats.totalFoodItems}
- Active Requests: ${stats.activeRequests}
- Completed Donations: ${completedCount} ${completedCount > 0 ? '✅' : '(No completed donations yet)'}
- Total Food Donated: ${totalDonated.toFixed(2)} units ${totalDonated > 0 ? '🎉' : '(Waiting for first completion)'}
- Impact: ${completedCount > 0 ? `${completedCount} successful food transfers helping communities!` : 'Ready to make an impact - complete your first donation!'}\n`;
      }

      // Check if user is asking about nearby items
      if (
        lowerMessage.includes('near') ||
        lowerMessage.includes('close') ||
        lowerMessage.includes('location') ||
        lowerMessage.includes('distance')
      ) {
        contextData += '\n\n📍 Location-based matching is available through our AI matching system. You can view items on a map in the donor or receiver dashboard.\n';
      }

      // Check if user is asking about how to donate
      if (
        lowerMessage.includes('how to donate') ||
        lowerMessage.includes('how do i donate') ||
        lowerMessage.includes('donate food')
      ) {
        contextData += '\n\n📝 How to Donate Food:\n1. Go to the Donor Dashboard\n2. Click "Upload Food" button\n3. Fill in food details (type, quantity, expiry date)\n4. Add pickup location and time\n5. Submit - our AI will match you with NGOs in need!\n';
      }

      // Check if user is asking about how to request
      if (
        lowerMessage.includes('how to request') ||
        lowerMessage.includes('how do i request') ||
        lowerMessage.includes('request food')
      ) {
        contextData += '\n\n📋 How to Request Food:\n1. Go to the Receiver Dashboard\n2. Click "Create Requirement" button\n3. Fill in your needs (food type, quantity, urgency)\n4. Add delivery location and deadline\n5. Submit - our AI will match you with available donations!\n';
      }

      // If user is a donor, provide their data
      if (context.userId && context.userRole === 'donor') {
        const donor = await supabaseService.donor.getByUserId(context.userId);
        if (donor) {
          const donorFoodItems = await supabaseService.foodItem.getByDonor(donor.id);
          const completedItems = donorFoodItems.filter(f => f.status === 'collected').length;
          const activeItems = donorFoodItems.filter(f => f.status === 'available').length;
          
          // Calculate total quantity donated from completed items
          const totalQuantityDonated = donorFoodItems
            .filter(f => f.status === 'collected')
            .reduce((sum, item) => sum + (item.quantity || 0), 0);
          
          contextData += `\n\n👤 Your Donor Profile:
- Name: ${donor.name}
- Total Donations Posted: ${donorFoodItems.length}
- Completed Donations: ${completedItems} ✅
- Active Listings: ${activeItems}
- Total Food Donated: ${totalQuantityDonated.toFixed(2)} units
- Keep up the great work! 🌟\n`;
        }
      }

      // If user is an NGO, provide their data
      if (context.userId && context.userRole === 'ngo') {
        const ngo = await supabaseService.ngo.getByUserId(context.userId);
        if (ngo) {
          const ngoRequests = await supabaseService.request.getByNGO(ngo.id);
          const activeRequests = ngoRequests.filter(r => r.status === 'active').length;
          const fulfilledRequests = ngoRequests.filter(r => r.status === 'fulfilled').length;
          
          // Calculate total quantity received from fulfilled requests
          const totalQuantityReceived = ngoRequests
            .filter(r => r.status === 'fulfilled')
            .reduce((sum, req) => sum + (req.quantity || 0), 0);
          
          contextData += `\n\n🏢 Your NGO Profile:
- Organization: ${ngo.name}
- Total Requests Made: ${ngoRequests.length}
- Fulfilled Requests: ${fulfilledRequests} ✅
- Active Requests: ${activeRequests}
- Total Food Received: ${totalQuantityReceived.toFixed(2)} units
- Thank you for your service! 💚\n`;
        }
      }
    } catch (error) {
      console.error('Error building context:', error);
    }

    return contextData;
  }

  // Build the complete prompt
  private buildPrompt(
    userMessage: string,
    context: ChatContext,
    contextData: string,
    conversationHistory: ChatMessage[]
  ): string {
    let prompt = this.systemPrompt;

    // Add user context if available
    if (context.userRole) {
      prompt += `\n\nUser Role: ${context.userRole}`;
    }
    if (context.userName) {
      prompt += `\nUser Name: ${context.userName}`;
    }

    // Add database context
    if (contextData) {
      prompt += `\n\n=== Current Database Context ===\n${contextData}`;
    }

    // Add conversation history (last 5 messages)
    if (conversationHistory.length > 0) {
      prompt += '\n\n=== Conversation History ===\n';
      conversationHistory.slice(-5).forEach((msg) => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    // Add current user message
    prompt += `\n\n=== Current Question ===\nUser: ${userMessage}\n\nAssistant:`;

    return prompt;
  }

  // Query-specific helpers
  async answerDonationQuery(query: string, userId?: string): Promise<string> {
    const context: ChatContext = {
      userRole: 'donor',
      userId,
    };

    return this.generateResponse(query, context);
  }

  async answerRequestQuery(query: string, userId?: string): Promise<string> {
    const context: ChatContext = {
      userRole: 'ngo',
      userId,
    };

    return this.generateResponse(query, context);
  }

  async answerMatchingQuery(query: string): Promise<string> {
    const enhancedQuery = `${query}\n\nNote: Our AI matching system uses machine learning to connect donations with requests based on:
- Food type compatibility
- Geographic proximity
- Quantity matching
- Urgency levels
- Donor and NGO history`;

    return this.generateResponse(enhancedQuery);
  }

  // Get suggested questions based on user role
  getSuggestedQuestions(userRole?: 'donor' | 'ngo' | 'admin'): string[] {
    const commonQuestions = [
      "What is FoodBridge AI?",
      "How does the AI matching work?",
      "What are the platform statistics?",
    ];

    const donorQuestions = [
      "How do I donate food?",
      "What food can I donate?",
      "What are the active requests near me?",
      "What is my donor tier?",
    ];

    const ngoQuestions = [
      "How do I request food?",
      "What donations are available?",
      "How do I get matched with donors?",
      "How is my NGO rated?",
    ];

    if (userRole === 'donor') {
      return [...donorQuestions, ...commonQuestions];
    } else if (userRole === 'ngo') {
      return [...ngoQuestions, ...commonQuestions];
    }

    return commonQuestions;
  }
}

export const geminiChatbot = new GeminiChatbotService();
