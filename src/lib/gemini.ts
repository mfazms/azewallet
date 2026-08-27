import { GoogleGenerativeAI, FunctionDeclaration, Schema, SchemaType } from '@google/generative-ai';
import { createTransaction } from './firebase/firestore';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
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
});
