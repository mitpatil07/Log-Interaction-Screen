import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import {
  updateField,
  setSubmitting,
  setSubmissionStatus,
  setErrorMessage,
  resetForm,
  cancelEditing,
  fetchHcps,
  fetchInteractions,
  fetchFollowups,
} from '../store/interactionSlice';
import { CheckCircle, AlertCircle, X, User, Calendar, Clock, FileText, Package, Users } from 'lucide-react';

export const StructuredForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const {
    hcpName,
    interactionType,
    date,
    time,
    attendees,
    topicsDiscussed,
    materialsShared,
    isSubmitting,
    submissionStatus,
    errorMessage,
    editingInteractionId,
  } = useSelector((state: RootState) => state.interaction);

  // Submit the Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hcpName.trim()) {
      dispatch(setErrorMessage('HCP Name is required.'));
      return;
    }

    dispatch(setSubmitting(true));
    dispatch(setErrorMessage(null));
    dispatch(setSubmissionStatus('idle'));

    const isEditMode = editingInteractionId !== null;
    const url = isEditMode
      ? `${backendUrl}/api/interactions/${editingInteractionId}`
      : `${backendUrl}/api/interactions`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hcp_name: hcpName,
          interaction_type: interactionType,
          date,
          time,
          attendees,
          topics_discussed: topicsDiscussed,
          materials_shared: materialsShared,
        }),
      });

      if (!response.ok) {
        throw new Error(isEditMode ? 'Failed to update the interaction.' : 'Failed to log the interaction to database.');
      }

      dispatch(setSubmissionStatus('success'));
      
      // Refresh the database records instantly
      dispatch(fetchInteractions());
      dispatch(fetchFollowups());
      dispatch(fetchHcps());

      setTimeout(() => {
        dispatch(resetForm());
      }, 2500);

    } catch (err: any) {
      dispatch(setSubmissionStatus('failed'));
      dispatch(setErrorMessage(err.message || 'Submission error'));
    } finally {
      dispatch(setSubmitting(false));
    }
  };

  return (
    <div className="log-hcp-card">
      <div className="log-hcp-header">
        <h1>{editingInteractionId ? 'Edit HCP Interaction' : 'Log HCP Interaction'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="log-hcp-form">
        {/* Status Alerts */}
        {editingInteractionId && (
          <div className="alert alert-info">
            <div className="alert-content-row">
              <AlertCircle size={16} />
              <span>Editing Interaction ID: <strong>{editingInteractionId}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => dispatch(cancelEditing())}
              className="cancel-edit-pill-btn"
              title="Cancel editing"
            >
              <X size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Cancel Edit
            </button>
          </div>
        )}
        {submissionStatus === 'success' && (
          <div className="alert alert-success">
            <CheckCircle size={16} />
            <span>Interaction {editingInteractionId ? 'updated' : 'logged'} successfully!</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section: Interaction Details */}
        <div className="form-section-title">
          <FileText size={14} />
          <span>Interaction Details</span>
        </div>

        <div className="form-row">
          <div className="form-col">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={12} />
              HCP Name
            </label>
            <input
              type="text"
              value={hcpName}
              onChange={(e) => dispatch(updateField({ field: 'hcpName', value: e.target.value }))}
              placeholder="e.g. Dr. Smith"
              required
            />
          </div>
          <div className="form-col">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={12} />
              Interaction Type
            </label>
            <select
              value={interactionType}
              onChange={(e) => dispatch(updateField({ field: 'interactionType', value: e.target.value }))}
            >
              <option value="Meeting">Meeting</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Webinar">Webinar</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-col">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} />
              Date
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => dispatch(updateField({ field: 'date', value: e.target.value }))}
              placeholder="YYYY-MM-DD"
              required
            />
          </div>
          <div className="form-col">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} />
              Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => dispatch(updateField({ field: 'time', value: e.target.value }))}
              placeholder="e.g. 07:36 PM"
            />
          </div>
        </div>

        <div className="form-full-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={12} />
            Attendees
          </label>
          <input
            type="text"
            value={attendees}
            onChange={(e) => dispatch(updateField({ field: 'attendees', value: e.target.value }))}
            placeholder="Enter names or search..."
          />
        </div>

        <div className="form-full-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={12} />
            Topics Discussed
          </label>
          <textarea
            value={topicsDiscussed}
            onChange={(e) => dispatch(updateField({ field: 'topicsDiscussed', value: e.target.value }))}
            placeholder="Product efficacy, sentiments, etc."
            rows={4}
          />
        </div>

        {/* Section: Materials Shared */}
        <div className="form-section-title">
          <Package size={14} />
          <span>Materials Shared / Samples Distributed</span>
        </div>
        
        <div className="form-full-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={12} />
            Materials Shared
          </label>
          <input
            type="text"
            value={materialsShared}
            onChange={(e) => dispatch(updateField({ field: 'materialsShared', value: e.target.value }))}
            placeholder="Brochures, samples, etc."
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="form-submit-btn">
          {isSubmitting
            ? (editingInteractionId ? 'Updating...' : 'Logging...')
            : (editingInteractionId ? 'Save & Update Interaction' : 'Save & Log Interaction')}
        </button>
      </form>
    </div>
  );
};
