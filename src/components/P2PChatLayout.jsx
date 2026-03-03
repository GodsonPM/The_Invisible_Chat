import React, { useState, useRef, useEffect } from 'react';
import './P2PChat.css';

const P2PChatLayout = ({ messages, onSend, myId, status, onConnect, onDecrypt }) => {
    const [text, setText] = useState('');
    const [targetIdValue, setTargetIdValue] = useState('');
    const [selectedCover, setSelectedCover] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const fileInputRef = useRef(null);
    const msgsEndRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedCover(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSend = () => {
        if (!text.trim()) return;
        if (!selectedCover) {
            alert("Please select a Cover Image to hide your message in!");
            return;
        }

        onSend(text, selectedCover);
        setText('');
        // Keep the cover image selected for next message? Or clear it?
        // Let's keep it for convenience, users might want to reuse same cover.
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="p2p-container">
            {/* Header: Status & Connection */}
            <div className="p2p-header">
                <div>
                    <strong style={{ marginRight: '10px' }}>STATUS:</strong>
                    <span style={{ color: status === 'connected' ? '#00ff41' : '#ffaa00' }}>
                        {status.toUpperCase()}
                    </span>
                    {myId && (
                        <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                            <span style={{ opacity: 0.7 }}>MY ID:</span>
                            <code style={{ background: '#003333', padding: '2px 5px', marginLeft: '5px', borderRadius: '3px' }}>{myId}</code>
                        </div>
                    )}
                </div>

                {status !== 'connected' && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                            className="retro-input"
                            style={{ padding: '5px', fontSize: '0.8rem', width: '120px' }}
                            placeholder="Friend ID"
                            value={targetIdValue}
                            onChange={(e) => setTargetIdValue(e.target.value)}
                        />
                        <button
                            className="action-btn"
                            style={{ padding: '5px 10px', fontSize: '0.8rem', marginTop: 0 }}
                            onClick={() => onConnect(targetIdValue)}
                        >
                            CONNECT
                        </button>
                    </div>
                )}
            </div>

            {/* Messages List */}
            <div className="p2p-messages">
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '50px' }}>
                        <p>No messages yet.</p>
                        <p>Connect with a friend and start chatting!</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`message-bubble ${msg.isIncoming ? 'incoming' : 'outgoing'}`}
                        onClick={() => onDecrypt(msg.content)}
                        title="Click to Decrypt"
                    >
                        <div className="message-meta">
                            <span>{msg.isIncoming ? 'FRIEND' : 'YOU'}</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <img
                            src={msg.content}
                            alt="Encrypted Message"
                            className="message-image"
                            style={{ maxWidth: '200px' }} // Thumbnail size in chat
                        />
                        <div className="message-label">🔒 ENCRYPTED IMAGE</div>
                    </div>
                ))}
                <div ref={msgsEndRef} />
            </div>

            {/* Input Area */}
            {status === 'connected' && (
                <div className="p2p-input-area">
                    <div style={{ position: 'relative' }}>
                        <button
                            className={`image-picker-btn ${selectedCover ? 'has-image' : ''}`}
                            onClick={() => fileInputRef.current.click()}
                            title="Select Cover Image"
                        >
                            📷
                        </button>
                        {coverPreview && (
                            <div className="preview-thumb">
                                <img src={coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    style={{ position: 'absolute', top: 0, right: 0, background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedCover(null); setCoverPreview(null); }}
                                >×</button>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/png, image/jpeg"
                            onChange={handleImageSelect}
                        />
                    </div>

                    <textarea
                        className="chat-input"
                        placeholder="Type secret message..."
                        rows="1"
                        style={{ resize: 'none' }}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />

                    <button className="send-btn" onClick={handleSend}>
                        SEND
                    </button>
                </div>
            )}
        </div>
    );
};

export default P2PChatLayout;
