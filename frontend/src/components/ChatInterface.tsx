import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { sendMessage, addLocalUserMessage, clearChat } from '../store/chatSlice';
import { Bot, Settings } from 'lucide-react';

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

  return (
    <div className="ai-assistant-card">
      {/* Header */}
      <div className="ai-assistant-header">
        <div className="ai-header-main">
          <Bot className="sidebar-logo bot-icon-lucide" size={20} style={{ marginRight: '6px' }} />
          <h2>AI Assistant</h2>
        </div>
        <p className="ai-subtitle">Log Interaction details here via chat</p>
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
              <div key={msg.id} className="chat-system-error">
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
                        <span>Tool Executed: {tc.name}</span>
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
              <span className="loader-text">AI is processing interaction details...</span>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Panel */}
      <div className="ai-chat-footer">
        <form onSubmit={handleSend} className="ai-chat-input-form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe Interaction..."
            rows={2}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="ai-log-btn">
            <span className="ai-btn-top">AI</span>
            <span className="ai-btn-bottom">Log</span>
          </button>
        </form>
        <button onClick={() => dispatch(clearChat())} className="reset-session-link">
          Reset Conversation Session
        </button>
      </div>
    </div>
  );
};
