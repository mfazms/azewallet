import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { createTransaction } from './firebase/firestore';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Models to try in order (fallback chain)
const MODEL_CHAIN = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.7-flash'];

// We define a function schema for Gemini to call
const addTransactionFunctionDeclaration: FunctionDeclaration = {
  name: 'addTransaction',
  description: 'Add a new financial transaction (expense, income, transfer) based on user input.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      amount: {
        type: SchemaType.NUMBER,
        description: 'The amount of the transaction in IDR (Rupiah). Must be a positive number.',
      },
      type: {
        type: SchemaType.STRING,
        description: 'The type of transaction. Either "expense", "income", "transfer_out", or "transfer_in".',
        
      },
      merchant: {
        type: SchemaType.STRING,
        description: 'The name of the merchant, person, or place. e.g., "McDonalds", "BCA", "Gaji".',
      },
      category: {
        type: SchemaType.STRING,
        description: 'The category of the transaction. e.g., "Food & Beverage", "Transport", "Shopping", "Salary", "Others".',
      },
      note: {
        type: SchemaType.STRING,
        description: 'Optional note or description for the transaction.',
      },
    },
    required: ['amount', 'type', 'merchant', 'category'],
  },
};

const modelConfig = {
  tools: [
    {
      functionDeclarations: [addTransactionFunctionDeclaration],
    },
  ],
  systemInstruction: `You are Aze, a smart personal financial assistant for AzeWallet.
Your goal is to help users manage their money, give budgeting advice, and record transactions automatically.
If a user mentions spending, earning, or transferring money, you MUST use the 'addTransaction' function to record it for them.
Example 1: "aku habis jajan 50k pake gopay buat gofood" -> call addTransaction(amount: 50000, type: "expense", merchant: "GoFood", category: "Food & Beverage").
Example 2: "gajian bulan ini 10 juta masuk ke BCA" -> call addTransaction(amount: 10000000, type: "income", merchant: "Salary", category: "Salary").
Always respond in friendly, conversational Indonesian.`,
};

// Default export for backward compatibility
export const geminiModel = genAI.getGenerativeModel({
  model: MODEL_CHAIN[0],
  ...modelConfig,
});

// Retry-enabled send function with model fallback
export async function sendMessageWithRetry(
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  maxRetries = 2
) {
  for (const modelName of MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({ model: modelName, ...modelConfig });
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message);
        return result.response;
      } catch (error: any) {
        const status = error?.status || error?.message?.match(/\[(\d+)/)?.[1];
        
        // If 503 (overloaded) or 429 (rate limit), retry or try next model
        if (status == 503 || status == 429 || error?.message?.includes('high demand')) {
          if (attempt < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          // Exhausted retries for this model, try next
          break;
        }
        
        // For other errors (404, etc.), skip to next model immediately
        if (status == 404) break;
        
        // Unknown error, throw
        throw error;
      }
    }
  }
  
  throw new Error('All AI models are currently unavailable. Please try again in a moment.');
}
