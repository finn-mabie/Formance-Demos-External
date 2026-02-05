'use client';

import { useState, useRef, useEffect } from 'react';
import { useDemoStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function GibonChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { config, currentStep, substituteVariables } = useDemoStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Build demo context for the AI
  const getDemoContext = () => {
    if (!config) return '';

    const step = currentStep >= 0 && currentStep < config.transactionSteps.length
      ? config.transactionSteps[currentStep]
      : null;

    let context = `\n\n## Current Demo Context\n`;
    context += `**Demo:** ${config.name}\n`;
    context += `**Description:** ${config.description}\n\n`;

    context += `**Accounts in this demo:**\n`;
    for (const acc of config.accounts) {
      const address = substituteVariables(acc.address);
      context += `- ${address}: ${acc.description}\n`;
    }

    context += `\n**Variables:**\n`;
    for (const [key, value] of Object.entries(config.variables)) {
      context += `- ${key}: ${value}\n`;
    }

    context += `\n**Transaction Steps (${config.transactionSteps.length} total):**\n`;
    for (let i = 0; i < config.transactionSteps.length; i++) {
      const s = config.transactionSteps[i];
      const isCurrent = i === currentStep;
      context += `${isCurrent ? '→ ' : '  '}${i + 1}. ${s.label} (${s.txType})${isCurrent ? ' [CURRENT STEP]' : ''}\n`;
      if (isCurrent && s.description) {
        context += `     ${s.description}\n`;
      }
    }

    if (step) {
      context += `\n**Current Step Numscript:**\n\`\`\`numscript\n${substituteVariables(step.numscript)}\n\`\`\`\n`;
    }

    return context;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Always include demo context for better answers
      const demoContext = getDemoContext();
      const contextualMessage = demoContext
        ? `${userMessage}\n\n[Context about the current demo the user is viewing:${demoContext}]`
        : userMessage;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: contextualMessage },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please make sure the Gemini API key is configured and try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    'What is Numscript?',
    'Explain this demo flow',
    'Why are accounts structured this way?',
    'How does @world work?',
  ];

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full shadow-lg hover:from-violet-500 hover:to-purple-500 transition-all ${isOpen ? 'hidden' : ''}`}
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-medium">Ask Gibon</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'bottom-4 right-4 w-[700px] h-[80vh] max-h-[800px]'
              : 'bottom-6 right-6 w-96 h-[500px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Gibon</h3>
                <p className="text-xs text-white/80">Formance Expert</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-violet-500 mx-auto mb-3" />
                <p className="text-foreground font-medium mb-2">Hi, I'm Gibon!</p>
                <p className="text-sm text-muted-foreground mb-4">
                  I can help you understand Formance, Numscript, and this demo.
                </p>
                <div className="space-y-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left text-sm px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:mt-2 [&_h4]:mb-1 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_pre]:bg-slate-800 [&_pre]:text-slate-100 [&_pre]:text-xs [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:my-2 [&_code]:text-xs [&_code]:bg-slate-200 [&_code]:dark:bg-slate-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-md">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Formance..."
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
