import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import {
  fetchHcps,
  fetchInteractions,
  fetchFollowups,
  loadInteractionIntoForm,
  updateField,
} from '../store/interactionSlice';
import {
  Users,
  MessageSquare,
  Calendar,
  RefreshCw,
  Clock,
  User,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const DatabasePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<'hcps' | 'interactions' | 'followups'>('hcps');

  const {
    hcpsList,
    interactionsList,
    followupsList,
    isLoadingLists,
  } = useSelector((state: RootState) => state.interaction);

  const handleRefresh = () => {
    dispatch(fetchHcps());
    dispatch(fetchInteractions());
    dispatch(fetchFollowups());
  };

  const handleHcpClick = (name: string) => {
    dispatch(updateField({ field: 'hcpName', value: name }));
  };

  return (
    <div className="db-panel-card animate-fade-in">

      <div className="db-panel-header">
        <div className="db-title-group">
          <FileSpreadsheet className="db-header-icon" size={20} />
          <h2>CRM Database Records</h2>
        </div>
        <button
          onClick={handleRefresh}
          className={`db-refresh-btn ${isLoadingLists ? 'spinning' : ''}`}
          disabled={isLoadingLists}
          title="Refresh database records"
        >
          <RefreshCw size={16} />
          <span>Sync DB</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="db-tabs">
        <button
          onClick={() => setActiveTab('hcps')}
          className={`db-tab-btn ${activeTab === 'hcps' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Registered HCPs ({hcpsList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('interactions')}
          className={`db-tab-btn ${activeTab === 'interactions' ? 'active' : ''}`}
        >
          <MessageSquare size={16} />
          <span>Recent Interactions ({interactionsList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`db-tab-btn ${activeTab === 'followups' ? 'active' : ''}`}
        >
          <Calendar size={16} />
          <span>Scheduled Follow-ups ({followupsList.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="db-panel-content">
        {isLoadingLists && (
          <div className="db-loading-overlay">
            <RefreshCw className="spinning text-muted" size={24} />
            <p>Syncing records from database...</p>
          </div>
        )}

        {/* 1. HCPs List */}
        {activeTab === 'hcps' && (
          <div className="db-list-grid">
            {hcpsList.length === 0 ? (
              <p className="no-records-text">No HCP records found. Click Sync DB or check backend.</p>
            ) : (
              hcpsList.map((hcp) => (
                <div
                  key={hcp.id}
                  onClick={() => handleHcpClick(hcp.name)}
                  className="db-item-card hcp-card hover-glow"
                  title="Click to select this doctor for the form"
                >
                  <div className="hcp-card-header">
                    <User className="hcp-icon" size={18} />
                    <h3>{hcp.name}</h3>
                  </div>
                  <div className="hcp-card-body">
                    <p><strong>Specialty:</strong> {hcp.specialty}</p>
                    <p><strong>NPI:</strong> <code>{hcp.npi_number}</code></p>
                    <p><strong>Email:</strong> {hcp.email}</p>
                  </div>
                  <div className="hcp-card-footer">
                    <span>Click to auto-populate form</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. Interactions List */}
        {activeTab === 'interactions' && (
          <div className="db-timeline-list">
            {interactionsList.length === 0 ? (
              <p className="no-records-text">No interactions logged yet. Log one using the form or AI assistant!</p>
            ) : (
              interactionsList.map((inter) => (
                <div key={inter.id} className="db-timeline-item hover-glow">
                  <div className="db-timeline-marker">
                    <span className="badge-type">{inter.interaction_type}</span>
                  </div>
                  <div className="db-timeline-details">
                    <div className="db-timeline-header">
                      <div>
                        <div className="db-hcp-title-row">
                          <h3>{inter.hcp_name || 'Unknown HCP'}</h3>
                          {inter.sentiment && (
                            <span className={`sentiment-badge-pill ${inter.sentiment.toLowerCase()}`}>
                              {inter.sentiment === 'Positive' && '😊 Positive'}
                              {inter.sentiment === 'Negative' && '😟 Negative'}
                              {inter.sentiment === 'Neutral' && '😐 Neutral'}
                            </span>
                          )}
                        </div>
                        <span className="text-muted text-xs">
                          <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          {inter.date} {inter.time || ''}
                        </span>
                      </div>
                      <button
                        onClick={() => dispatch(loadInteractionIntoForm(inter))}
                        className="db-edit-btn"
                        title="Load into structured form for editing"
                      >
                        Edit in Form
                      </button>
                    </div>
                    {inter.topics_discussed && (
                      <div className="db-timeline-desc">
                        <strong>Discussion Notes:</strong>
                        <p>{inter.topics_discussed}</p>
                      </div>
                    )}
                    {inter.materials_shared && (
                      <div className="db-timeline-materials">
                        <strong>Shared Materials:</strong> {inter.materials_shared}
                      </div>
                    )}
                    {inter.extracted_topics && (
                      <div className="db-timeline-topics">
                        <strong>Extracted Key Topics:</strong>
                        <div className="topics-pill-container">
                          {inter.extracted_topics.split(',').map((topic, i) => (
                            <span key={i} className="topic-pill">
                              {topic.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {inter.summary && (
                      <div className="db-timeline-summary">
                        <div className="summary-title-bar">
                          <BookOpen size={12} />
                          <span>AI Clinical Summary</span>
                        </div>
                        <p className="summary-text">{inter.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. Followups List */}
        {activeTab === 'followups' && (
          <div className="db-list-grid">
            {followupsList.length === 0 ? (
              <p className="no-records-text">No follow-ups scheduled yet. Tell the AI assistant to schedule one!</p>
            ) : (
              followupsList.map((fup) => (
                <div key={fup.id} className="db-item-card followup-card hover-glow">
                  <div className="fup-card-header">
                    <Calendar className="fup-icon" size={18} />
                    <h3>{fup.hcp_name || 'General Followup'}</h3>
                    <span className={`status-badge ${fup.status.toLowerCase()}`}>
                      <CheckCircle2 size={12} />
                      {fup.status}
                    </span>
                  </div>
                  <div className="fup-card-body">
                    <p><strong>Due Date:</strong> {fup.followup_date}</p>
                    <p className="fup-task-desc"><strong>Task:</strong> {fup.task_description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
