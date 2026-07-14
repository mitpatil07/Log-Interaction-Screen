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
  Menu,
} from 'lucide-react';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'chat' | 'split'>('split');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initial fetch of records on mount
    dispatch(fetchHcps());
    dispatch(fetchInteractions());
    dispatch(fetchFollowups());
  }, [dispatch]);

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* 1. Left Collapsible Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand-area">
          <div className="sidebar-logo">
            <Activity className="logo-icon" size={22} />
          </div>
          {!isSidebarCollapsed && (
            <div className="sidebar-brand-text">
              <h2 className="brand-name">AuraCRM</h2>
              <span className="brand-tagline">HCP Module</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveTab('form')}
            className={`sidebar-nav-item ${activeTab === 'form' ? 'active' : ''}`}
            title="Structured Form"
          >
            <Clipboard size={18} />
            {!isSidebarCollapsed && <span>Structured Form</span>}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`sidebar-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            title="Conversational Agent"
          >
            <MessageSquare size={18} />
            {!isSidebarCollapsed && <span>AI Chat Agent</span>}
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`sidebar-nav-item ${activeTab === 'split' ? 'active' : ''}`}
            title="Dual Dashboard"
          >
            <LayoutGrid size={18} />
            {!isSidebarCollapsed && <span>Dual Dashboard</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
          {!isSidebarCollapsed && <span className="theme-label">Theme Mode</span>}
        </div>
      </aside>

      {/* 2. Right Main Panel */}
      <div className="main-panel">
        {/* Top Floating Header Bar */}
        <header className="main-header-bar">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="sidebar-toggle-btn"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <Menu size={18} />
          </button>

          <div className="top-bar-title-group">
            <h1 className="top-bar-title">
              {activeTab === 'form' && 'HCP Interaction Form'}
              {activeTab === 'chat' && 'Conversational AI Assistant'}
              {activeTab === 'split' && 'Dual Interaction Dashboard'}
            </h1>
            <span className="top-bar-badge">Liaison Workspace</span>
          </div>

          <div className="top-bar-right-kpis">
            <span className="kpi-indicator">
              <span className="kpi-dot"></span>
              FastAPI: Connected
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
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

          {/* Bottom Database Viewer Section */}
          <div className="dashboard-bottom-section">
            <DatabasePanel />
          </div>
        </main>

        {/* Footer */}
        <footer className="main-footer">
          <p className="footer-text">
            AuraCRM Life Sciences Platform &bull; Powered by LangGraph & Groq
          </p>
        </footer>
      </div>
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
