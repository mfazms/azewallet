'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/stores';
import { getChatHistory, saveChatMessage, createTransaction } from '@/lib/firebase/firestore';
import { sendMessageWithRetry } from '@/lib/gemini';
import type { ChatMessage } from '@/lib/firebase/firestore';

export default function AIPage() {
  const { user } = useAuthStore();
  const { accounts, addTransaction, showToast } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getChatHistory(user.uid).then(msgs => {
      if (msgs.length === 0) {
        // Add welcome message
        const welcome: ChatMessage = {
          id: 'welcome',
          role: 'model',
          parts: [{ text: 'Halo! Saya Aze, asisten keuangan pribadi kamu. Ada yang bisa saya bantu catat hari ini? (Misal: "Tadi siang aku habis jajan seblak 20k pake gopay")' }],
          timestamp: new Date().toISOString()
        };
        setMessages([welcome]);
      } else {
        setMessages(msgs);
      }
    });
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !user || isTyping) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ text: input.trim() }],
      timestamp: new Date().toISOString(),
    };
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // Save to firestore asynchronously
    saveChatMessage(user.uid, userMsg);

    try {
      // Build history for Gemini (excluding the system prompt and our custom welcome if it wasn't saved)
      const history = newMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: m.parts
        }));

      const response = await sendMessageWithRetry(history.slice(0, -1), userMsg.parts[0].text);
      
      let botText = response.text() || '';

      // Check for function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'addTransaction') {
            const args = call.args as any;
            
            // Try to find the account based on user's accounts, or fallback to default
            let accId = accounts.length > 0 ? accounts[0].id : 'default';
            let accName = accounts.length > 0 ? accounts[0].name : 'Default Account';
            
            // Basic matching for account name if mentioned (e.g. BCA, gopay)
            const mentionedAcc = accounts.find(a => a.name.toLowerCase().includes((args.merchant || '').toLowerCase()));
            if (mentionedAcc) {
              accId = mentionedAcc.id;
              accName = mentionedAcc.name;
            }

            const txId = await createTransaction(user.uid, {
              amount: args.amount,
              currency: 'IDR',
              type: args.type,
              category: args.category,
              categoryIcon: '🤖', // Robot icon for AI auto entries
              accountId: accId,
              accountName: accName,
              merchant: args.merchant,
              note: args.note || 'Added by AI Assistant',
              imageUrl: null,
              createdAtUTC: new Date().toISOString(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
              deletedAt: null,
            });

            addTransaction({
              id: txId,
              amount: args.amount,
              currency: 'IDR',
              type: args.type,
              category: args.category,
              categoryIcon: '🤖',
              accountId: accId,
              accountName: accName,
              merchant: args.merchant,
              note: args.note || 'Added by AI Assistant',
              imageUrl: null,
              createdAtUTC: new Date().toISOString(),
              timezone: 'Asia/Jakarta',
              deletedAt: null,
              updatedAt: new Date().toISOString()
            });

            botText += `\n\n✅ Transaksi berhasil dicatat! (${args.type === 'expense' ? '-' : '+'}Rp${args.amount.toLocaleString('id-ID')} untuk ${args.merchant})`;
            showToast('Transaction added by AI');
          }
        }
      }

      if (!botText) {
        botText = 'Maaf, saya tidak mengerti.';
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        parts: [{ text: botText }],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
      saveChatMessage(user.uid, botMsg);

    } catch (error) {
      console.error('Error generating AI response:', error);
      showToast('Error connecting to AI');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="act-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-glass-border)' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/chatbot-logo.png" alt="Aze Intelligence" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          Aze Intelligence
        </h1>
      </header>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          paddingBottom: '120px' // For tab bar and input
        }}
      >
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '85%' }}>
                {m.role === 'model' && (
                  <img src="/chatbot-logo.png" alt="Aze" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
                )}
                <div
                  className={`chat-bubble ${m.role === 'user' ? 'chat-user' : 'chat-model'}`}
                  style={{
                    background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                    padding: '12px 16px',
                    borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    border: m.role === 'user' ? 'none' : '1px solid var(--color-glass-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    lineHeight: 1.5,
                    fontSize: '0.9375rem'
                  }}
                >
                  {m.parts[0].text}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--color-surface)',
                padding: '12px 16px',
                borderRadius: '20px 20px 20px 4px',
                border: '1px solid var(--color-glass-border)',
                display: 'flex',
                gap: '4px'
              }}
            >
              <div className="typing-dot" />
              <div className="typing-dot" style={{ animationDelay: '0.2s' }} />
              <div className="typing-dot" style={{ animationDelay: '0.4s' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--tab-bar-height) + 1rem)',
        left: '1rem',
        right: '1rem',
        background: 'var(--color-glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--color-glass-border)',
        borderRadius: '100px',
        padding: '6px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 10
      }}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything or record an expense..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '8px 12px',
            color: 'var(--color-text)',
            fontSize: '0.9375rem'
          }}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          style={{
            background: input.trim() ? 'var(--color-accent)' : 'var(--color-input-bg)',
            color: '#fff',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s'
          }}
        >
          <Send size={18} style={{ transform: 'translateX(-1px)' }} />
        </button>
      </div>

      <style jsx global>{`
        .typing-dot {
          width: 6px;
          height: 6px;
          background: var(--color-text-secondary);
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out both;
        }
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
