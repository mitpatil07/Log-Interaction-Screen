import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { sendMessage, addLocalUserMessage, clearChat } from '../store/chatSlice';
import { Bot, Settings, Send, Sparkles, RotateCcw } from 'lucide-react';

export const ChatInterface: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { messages, isLoading } = useSelector((state: RootState) => state.chat);
  const [input, setInput] = useState('');
  const historyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll history container only (prevents viewport scrolling)
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTo({
        top: historyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input;
    setInput('');

    // Add user message locally
    dispatch(addLocalUserMessage(messageText));
    
    // Dispatch async agent message
    dispatch(sendMessage(messageText));
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  return (
    <div className="ai-assistant-card">
      {/* Header */}
      <div className="ai-assistant-header">
        <div className="ai-header-main">
          <Bot className="bot-icon-lucide" size={20} style={{ marginRight: '6px' }} />
          <h2>AI Assistant</h2>
          <span className="sentiment-badge-pill positive" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
            <Sparkles size={10} /> Online
          </span>
        </div>
        <p className="ai-subtitle">Log, schedule, and query interaction records seamlessly</p>
      </div>

      {/* Messages area */}
      <div ref={historyRef} className="ai-chat-history">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';
          
          // Determine special CSS class based on content (e.g., if it starts with welcome or success ✅)
          let bubbleClass = 'bubble-assistant-info';
          if (isUser) {
            bubbleClass = 'bubble-user-card';
          } else if (msg.content.includes('✅') || msg.content.includes('logged successfully')) {
            bubbleClass = 'bubble-assistant-success';
          }

          if (isSystem) {
            return (
              <div key={msg.id} className="chat-system-error" style={{ color: 'var(--text-danger)', fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'var(--bg-danger)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-danger)', margin: '0.5rem 0' }}>
                <p>{msg.content}</p>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`chat-row ${isUser ? 'row-user' : 'row-assistant'}`}>
              <div className={`chat-bubble ${bubbleClass}`}>
                <p className="chat-bubble-text">{msg.content}</p>
                
                 {/* Visualizer for tool calls */}
                {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="chat-tool-indicators">
                    {msg.tool_calls.map((tc: any, i: number) => (
                      <div key={i} className="chat-tool-item">
                        <Settings className="tool-gear spinning" size={12} />
                        <span>Tool Executed: <strong>{tc.name}</strong></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="chat-row row-assistant">
            <div className="chat-bubble bubble-assistant-info thinking-bubble">
              <span className="loader-dots">
                <span className="loader-dot" />
                <span className="loader-dot" />
                <span className="loader-dot" />
              </span>
              <span className="loader-text">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="ai-chat-footer">
        {/* Quick Suggestion Chips */}
        <div className="ai-quick-chips">
          <button
            type="button"
            className="quick-action-chip"
            onClick={() => handleQuickAction("Search previous interactions for Dr. Elena Rostova (HCP ID 3)")}
            disabled={isLoading}
          >
            🔍 Search Rostova History
          </button>
          <button
            type="button"
            className="quick-action-chip"
            onClick={() => handleQuickAction("I met with Dr. Jenkins today (HCP 1) and we had an in-person meeting. She was very interested in the new efficacy data for our cardiovascular drug.")}
            disabled={isLoading}
          >
            📝 Log Meeting
          </button>
          <button
            type="button"
            className="quick-action-chip"
            onClick={() => handleQuickAction("Schedule a follow-up with Dr. Carter (ID 2) for next Friday 2026-07-17 to send the oncology booklet")}
            disabled={isLoading}
          >
            📅 Schedule Follow-up
          </button>
        </div>

        <form onSubmit={handleSend} className="ai-chat-input-form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or select a quick action above..."
            rows={2}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="ai-log-btn" title="Send message to AI">
            <Send size={18} />
          </button>
        </form>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
          <button onClick={() => dispatch(clearChat())} className="reset-session-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <RotateCcw size={12} />
            <span>Reset Conversation Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};

