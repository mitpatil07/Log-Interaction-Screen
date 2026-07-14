import React, { useState, useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store/store';
import type { AppDispatch } from './store/store';
import { StructuredForm } from './components/StructuredForm';
import { ChatInterface } from './components/ChatInterface';
import { ThemeToggle } from './components/ThemeToggle';
import { DatabasePanel } from './components/DatabasePanel';
import { fetchHcps, fetchInteractions, fetchFollowups } from './store/interactionSlice';
import {
  Activity,
  Clipboard,
  MessageSquare,
  LayoutGrid,
} from 'lucide-react';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'chat' | 'split'>('split');
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchHcps());
    dispatch(fetchInteractions());
    dispatch(fetchFollowups());
  }, [dispatch]);

  return (
    <div className="app-container-header-layout">
      {/* Premium Top Floating Header */}
      <header className="main-header-bar-floating">
        <div className="header-brand-group">
          <div className="sidebar-logo">
            <Activity className="logo-icon" size={20} />
          </div>
          <div className="sidebar-brand-text">
            <h2 className="brand-name">AuraCRM</h2>
            <span className="brand-tagline">HCP Module</span>
          </div>
        </div>

        {/* Tab Controls directly in the Header */}
        <nav className="header-nav-tabs">
          <button
            onClick={() => setActiveTab('form')}
            className={`header-nav-item ${activeTab === 'form' ? 'active' : ''}`}
          >
            <Clipboard size={16} />
            <span>Structured Form</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`header-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <MessageSquare size={16} />
            <span>AI Chat Agent</span>
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`header-nav-item ${activeTab === 'split' ? 'active' : ''}`}
          >
            <LayoutGrid size={16} />
            <span>Dual Dashboard</span>
          </button>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="main-content-layout">
        <div className="dashboard-top-section">
          {activeTab === 'form' && (
            <div className="tab-panel single-view animate-fade-in">
              <StructuredForm />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="tab-panel single-view animate-fade-in">
              <ChatInterface />
            </div>
          )}

          {activeTab === 'split' && (
            <div className="tab-panel split-view-grid animate-fade-in">
              <div className="split-column">
                <StructuredForm />
              </div>
              <div className="split-column">
                <ChatInterface />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Database Records Section */}
        <div className="dashboard-bottom-section">
          <DatabasePanel />
        </div>
      </main>

      {/* Footer */}
      <footer className="main-footer-layout">
        <p className="footer-text">
          AuraCRM Life Sciences Platform &bull; Powered by LangGraph & Groq
        </p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
