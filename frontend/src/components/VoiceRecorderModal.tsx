import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateField, syncFormState } from '../store/interactionSlice';
import { X, Mic, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

interface VoiceRecorderModalProps {
  onClose: () => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ onClose }) => {
  const dispatch = useDispatch();
  const [consentGiven, setConsentGiven] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing' | 'done'>('idle');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev >= 6) {
            clearInterval(interval);
            setRecordingState('transcribing');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  useEffect(() => {
    if (recordingState === 'transcribing') {
      const timeout = setTimeout(() => {
        // Populate form state fields from simulation
        dispatch(
          syncFormState({
            hcpName: 'Dr. Sarah Jenkins',
            interactionType: 'Call',
            materialsShared: 'Cardiovascular Safety Brochure',
          })
        );
        dispatch(
          updateField({
            field: 'topicsDiscussed',
            value:
              'Dr. Sarah Jenkins called to discuss safety concerns regarding cardiovascular drug dosing efficacy in diabetic patients. She requested the clinical brochure.',
          })
        );
        setRecordingState('done');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [recordingState, dispatch]);

  const handleStartRecording = () => {
    if (!consentGiven) return;
    setRecordingState('recording');
    setTimer(0);
  };

  return (
    <div className="voice-modal-overlay animate-fade-in">
      <div className="voice-modal-card">
        {/* Header */}
        <div className="voice-modal-header">
          <div className="voice-title-group">
            <Mic className="voice-mic-icon" size={20} />
            <h3>Voice Interaction Log</h3>
          </div>
          <button onClick={onClose} className="voice-close-btn" title="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Body content based on state */}
        <div className="voice-modal-body">
          {recordingState === 'idle' && (
            <div className="voice-consent-panel">
              <div className="compliance-banner">
                <AlertTriangle size={18} className="warn-icon" />
                <span>Life Science Regulatory Compliance</span>
              </div>
              <p className="consent-text">
                Under healthcare compliance regulations (including HIPAA & PhRMA guidelines), you must obtain explicit oral consent from the Healthcare Professional (HCP) prior to capturing, recording, or transcribing voice data for CRM interactions.
              </p>
              
              <label className="consent-checkbox-label">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                />
                <span className="checkbox-custom-text">
                  <ShieldCheck size={16} className="shield-icon" />
                  I confirm that I have obtained necessary oral consent from the HCP.
                </span>
              </label>

              <button
                onClick={handleStartRecording}
                disabled={!consentGiven}
                className="voice-action-btn primary-glow"
              >
                <Mic size={16} />
                <span>Start Recording Simulation</span>
              </button>
            </div>
          )}

          {recordingState === 'recording' && (
            <div className="voice-recording-panel">
              <div className="pulse-recorder">
                <div className="pulse-inner-mic">
                  <Mic size={32} className="mic-animate" />
                </div>
              </div>
              <div className="recording-timer">
                Recording: 00:0{timer}
              </div>
              <p className="recording-hint">Speak now... Simulating liaison notes logging</p>

              {/* Bouncing audio waveform visualizer */}
              <div className="audio-wave">
                <span className="wave-bar bar-1"></span>
                <span className="wave-bar bar-2"></span>
                <span className="wave-bar bar-3"></span>
                <span className="wave-bar bar-4"></span>
                <span className="wave-bar bar-5"></span>
                <span className="wave-bar bar-6"></span>
              </div>
            </div>
          )}

          {recordingState === 'transcribing' && (
            <div className="voice-loading-panel">
              <div className="spinner-border animate-spin"></div>
              <p className="loading-txt">AI transcribing voice note...</p>
              <p className="loading-subtxt">Performing Clinical entity extraction & matching</p>
            </div>
          )}

          {recordingState === 'done' && (
            <div className="voice-done-panel">
              <div className="done-icon-wrapper">
                <Check size={28} className="done-check-icon" />
              </div>
              <h4 className="done-title">Transcription Successful!</h4>
              <p className="done-details">
                Interaction details mapped to form on left side. AI Summary & Sentiment extraction will run upon saving.
              </p>
              
              <div className="preview-transcription">
                <strong>Extracted HCP:</strong> Dr. Sarah Jenkins (Cardiology)<br />
                <strong>Discussion Notes:</strong> "Dr. Sarah Jenkins called to discuss safety concerns regarding cardiovascular drug dosing efficacy..."
              </div>

              <button onClick={onClose} className="voice-action-btn done-btn">
                Done & Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
