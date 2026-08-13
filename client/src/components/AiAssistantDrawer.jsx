import React, { useState } from 'react';
import { Bot, Mic, Send, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../services/api';

export const AiAssistantDrawer = ({ isOpen, onClose, onRefreshData }) => {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Assalam-o-Alaikum! Main aapka digital khata assistant hoon. Aap mujh se Roman Urdu ya English mein pooch sakte hain.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text: queryText }]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ query: queryText })
      });

      const aiData = res.data;

      if (aiData.requiresConfirmation) {
        setPendingAction(aiData.actionPayload);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: aiData.reply,
            requiresConfirmation: true,
            prompt: aiData.confirmationPrompt
          }
        ]);
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: aiData.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (confirmed) => {
    if (!confirmed || !pendingAction) {
      setPendingAction(null);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Action cancelled.' }]);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/ai/confirm-action', {
        method: 'POST',
        body: JSON.stringify({ confirmed: true, actionPayload: pendingAction })
      });

      setMessages((prev) => [...prev, { sender: 'ai', text: res.data.reply }]);
      setPendingAction(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', text: `Action error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Micro-speech recognition trigger
  const handleVoiceListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK'; // Urdu / English mixed
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };
    recognition.start();
  };

  return (
    <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        className="card"
        style={{
          width: '420px',
          height: '100vh',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bot size={24} color="var(--accent-purple)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Khata Assistant</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Roman Urdu & Voice Enabled</span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.3rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Message History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: m.sender === 'user' ? 'var(--accent-emerald-dark)' : 'var(--bg-sidebar)',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                maxWidth: '85%',
                fontSize: '0.9rem',
                whiteSpace: 'pre-line',
                border: m.sender === 'ai' ? '1px solid var(--border-color)' : 'none'
              }}
            >
              {m.text}

              {m.requiresConfirmation && pendingAction && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleConfirmAction(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                    <CheckCircle size={14} />
                    Confirm Payment
                  </button>
                  <button onClick={() => handleConfirmAction(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI thinking...</div>}
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.75rem' }}>
          {['Ahmed ka khata kholo', 'Aaj ki total sales?', 'Ahmed ko 5000 receive'].map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSend(chip)}
              className="badge badge-blue"
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button onClick={handleVoiceListen} className="btn btn-secondary" title="Speech to Text (Mic)">
            <Mic size={18} color="var(--accent-rose)" />
          </button>
          <input
            type="text"
            className="input-field"
            style={{ flex: 1 }}
            placeholder="Poochien: 'Ahmed ka khata...'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={() => handleSend()} className="btn btn-primary">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
