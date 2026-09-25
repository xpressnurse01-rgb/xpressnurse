import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, AlertTriangle, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isEmergency?: boolean;
}

interface AiAssistantProps {
  onOpenBooking: () => void;
  onOpenDoctorConsult: () => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Namaste! I am the official AI assistant for Xpress Nurse ("Care That Comes To You"). How may I assist you with home nursing or doctor consultation today?'
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const lower = query.toLowerCase();

      // Emergency protocol
      if (
        lower.includes('chest pain') ||
        lower.includes('heart attack') ||
        lower.includes('cannot breathe') ||
        lower.includes('breathing difficulty') ||
        lower.includes('heavy bleeding') ||
        lower.includes('unconscious')
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            isEmergency: true,
            text: 'EMERGENCY ADVICE: If you or your family member is experiencing severe chest pain, breathing difficulty, or unconsciousness, please call 108 immediately or visit the nearest emergency hospital.'
          }
        ]);
        return;
      }

      // Telugu support
      if (lower.includes('iv') && (lower.includes('కావాలి') || lower.includes('తెలుగు'))) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: 'నమస్కారం! ఎక్స్‌ప్రెస్ నర్స్ ద్వారా ఇంట్లోనే సెలైన్ మరియు నర్సింగ్ కేర్ పొందవచ్చు. పూర్తి వివరాలకు మా వాట్సాప్ 75696 57371 నంబర్‌ను సంప్రదించండి.'
          }
        ]);
        return;
      }

      // Prescription inquiry
      if (lower.includes('prescription') || lower.includes('no doctor') || lower.includes('dont have')) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: 'A valid prescription is MANDATORY for medical procedures (IV infusion, catheter care, Ryles tube, and suture removal). If you do not have one, you can connect with our Online Doctor Consultation service first so an experienced doctor can evaluate and issue an authorized prescription.'
          }
        ]);
        return;
      }

      // Default response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `We provide professional home nursing across all areas of Hyderabad. You can book directly through the platform or connect with our clinical coordinators on WhatsApp at 75696 57371.`
        }
      ]);
    }, 400);
  };

  return (
    <>
      {/* Floating Circular Action Button */}
      {!isOpen && (
        <button
          className="ai-fab-corporate"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Healthcare Assistant"
          title="24/7 AI Clinical Assistant"
        >
          <Bot size={22} />
        </button>
      )}

      {/* Corporate Chat Window */}
      {isOpen && (
        <div className="ai-chat-window" data-lenis-prevent="true">
          {/* Header */}
          <div className="ai-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={18} />
              <div>
                <h4 style={{ fontSize: '0.9rem', color: '#FFFFFF', fontWeight: 600 }}>Xpress Nurse AI</h4>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>24/7 Clinical Support</div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{ color: '#FFFFFF', opacity: 0.8 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages" data-lenis-prevent="true">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.sender} ${m.isEmergency ? 'emergency' : ''}`}
              >
                {m.isEmergency && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', color: '#DC2626', fontWeight: 700 }}>
                    <AlertTriangle size={14} />
                    <span>EMERGENCY ALERT</span>
                  </div>
                )}
                {m.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="ai-quick-replies">
            <button
              className="quick-reply-chip"
              onClick={() => handleSendMessage('Need IV saline at home')}
            >
              IV Saline Infusion
            </button>
            <button
              className="quick-reply-chip"
              onClick={() => handleSendMessage('Catheter care procedure')}
            >
              Catheter Care
            </button>
            <button
              className="quick-reply-chip"
              onClick={() => handleSendMessage("I don't have a prescription yet")}
            >
              Prescription Help
            </button>
          </div>

          {/* Input */}
          <form
            className="ai-chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              className="form-control"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              placeholder="Ask a question..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ padding: '0 0.85rem' }}
            >
              <Send size={13} />
            </button>
          </form>

          {/* Direct WhatsApp footer */}
          <div
            style={{
              padding: '0.4rem 0.75rem',
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem'
            }}
          >
            <a
              href="tel:+917569657371"
              style={{ color: 'var(--clinical-blue-600)', fontWeight: 600 }}
              title="Call Helpline"
            >
              Helpline: 75696 57371
            </a>
            <a
              href="https://wa.me/917569657371"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#128C7E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <MessageCircle size={12} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
};
