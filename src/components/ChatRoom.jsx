import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';
import { useSocket } from '../hooks/useSocket';
import { sfxClick, sfxSuccess, sfxError, sfxKeystroke, sfxProcessStart } from '../hooks/useSoundEffects';

/* ============================================================
   ChatRoom — Full steganographic real-time chat hell yeah!!!
   ============================================================ */

// Lightbox for viewing full stego image
const Lightbox = ({ src, onClose }) => (
    <div className="img-lightbox" onClick={onClose}>
        <img src={src} alt="Cover image" />
    </div>
);

// Typing indicator bubble
const TypingIndicator = ({ users }) => {
    const names = Array.from(users);
    if (names.length === 0) return null;
    const label = names.length === 1
        ? `${names[0]} is typing`
        : `${names.slice(0, 2).join(', ')} are typing`;
    return (
        <div className="typing-indicator">
            <div className="typing-dots"><span /><span /><span /></div>
            <span>{label}</span>
        </div>
    );
};

/* --- Join Screen --- */
const JoinScreen = ({ onJoin }) => {
    const [uname, setUname] = useState('');
    const [room, setRoom] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false); // eslint-disable-line no-unused-vars

    const handleSubmit = (e) => {
        e.preventDefault();
        if (uname.trim() && room.trim()) {
            sfxClick();
            onJoin(uname.trim(), room.trim(), password);
        }
    };

    return (
        <div className="join-screen">
            <div className="join-card">
                <div className="join-logo">
                    <h2>💬 Secure Channel</h2>
                    <small>STEGANOGRAPHIC END-TO-END CHAT</small>
                </div>
                <form className="join-form" onSubmit={handleSubmit}>
                    <div className="input-wrap">
                        <label>Callsign (Username)</label>
                        <input
                            className="retro-input"
                            type="text"
                            placeholder="e.g. Ghost_01"
                            value={uname}
                            onChange={e => setUname(e.target.value)}
                            onKeyDown={() => sfxKeystroke()}
                            maxLength={24}
                            autoFocus
                        />
                    </div>
                    <div className="input-wrap">
                        <label>Room ID</label>
                        <input
                            className="retro-input"
                            type="text"
                            placeholder="e.g. secret-bunker"
                            value={room}
                            onChange={e => setRoom(e.target.value)}
                            onKeyDown={() => sfxKeystroke()}
                            maxLength={32}
                        />
                    </div>
                    <div className="input-wrap">
                        <label>Room Password (optional — AES encryption)</label>
                        <input
                            className="retro-input"
                            type={showPass ? 'text' : 'password'}
                            placeholder="Leave blank for plaintext stego"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        className="join-btn"
                        type="submit"
                        disabled={!uname.trim() || !room.trim()}
                    >
                        ESTABLISH LINK
                    </button>
                </form>
            </div>
            <p style={{ color: '#333', fontSize: '0.7rem', marginTop: '20px', letterSpacing: '1px' }}>
                ⚠ MESSAGES ARE HIDDEN INSIDE IMAGES USING LSB STEGANOGRAPHY
            </p>
        </div>
    );
};

/* --- Message Bubble --- */
const MessageBubble = ({ msg, onImageClick }) => {
    if (msg.type === 'system') {
        return (
            <div className="system-msg">— {msg.text} —</div>
        );
    }

    return (
        <div className={`msg-wrapper ${msg.isIncoming ? 'incoming' : 'outgoing'}`}>
            <div className="msg-bubble">
                <div className="msg-sender">
                    {msg.isIncoming ? msg.sender : 'YOU'}
                </div>
                {msg.text ? (
                    <div className="msg-text">{msg.text}</div>
                ) : msg.decodeError ? (
                    <div className="msg-decode-error">🔒 {msg.decodeError}</div>
                ) : (
                    <div className="msg-decode-error">⏳ Decoding…</div>
                )}
                {msg.image && (
                    <>
                        <img
                            className="msg-image-thumb"
                            src={msg.image}
                            alt="Cover"
                            onClick={() => onImageClick(msg.image)}
                            title="Click to view full cover image"
                        />
                        <div className="msg-stego-label">🖼 COVER IMAGE</div>
                    </>
                )}
            </div>
            <div className="msg-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

/* ============================================================
   Main ChatRoom Component (-_-)||
   ============================================================ */
const ChatRoom = ({ soundEnabled }) => {
    const {
        status, messages, typingUsers, onlineUsers,
        roomName, username, roomPassword,
        joinRoom, sendMessage, handleTyping, leaveRoom
    } = useSocket();

    const [inputText, setInputText] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [joined, setJoined] = useState(false);

    const fileInputRef = useRef(null);
    const msgsEndRef = useRef(null);

    const play = (sfx) => { if (soundEnabled) sfx(); };

    // Auto-scroll
    useEffect(() => {
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Play sound on new incoming message
    useEffect(() => {
        const last = messages[messages.length - 1];
        if (last && last.isIncoming && last.type !== 'system') sfxSuccess();
    }, [messages]);

    const handleJoin = (uname, room, password) => {
        joinRoom(uname, room, password);
        setJoined(true);
    };

    const handleLeave = () => {
        leaveRoom();
        setJoined(false);
        setCoverFile(null);
        setCoverPreview(null);
        setInputText('');
        play(sfxClick);
    };

    const handleRetry = () => {
        leaveRoom();
        // Small delay so socket fully disconnects before reconnecting
        setTimeout(() => joinRoom(username, roomName, roomPassword), 300);
    };

    const handleCoverSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverFile(file);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(URL.createObjectURL(file));
        play(sfxClick);
        // Reset file input
        e.target.value = '';
    };

    const handleRemoveCover = () => {
        setCoverFile(null);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(null);
    };

    const handleSend = async () => {
        if (!inputText.trim() || !coverFile || isSending) return;

        play(sfxProcessStart);
        setIsSending(true);
        try {
            await sendMessage(inputText.trim(), coverFile, roomPassword, username, roomName);
            setInputText('');
            handleRemoveCover();
            play(sfxSuccess);
        } catch (err) {
            console.error(err);
            play(sfxError);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else {
            play(sfxKeystroke);
            handleTyping(username, roomName);
        }
    };

    // --- Join screen ---
    if (!joined) {
        return <JoinScreen onJoin={handleJoin} />;
    }

    const statusLabel = {
        disconnected: 'OFFLINE',
        connecting: 'CONNECTING...',
        online: 'JOINING ROOM...',
        connected: 'CONNECTED',
        error: 'ERROR',
    }[status] || status.toUpperCase();

    const canSend = !!inputText.trim() && !!coverFile && !isSending && status === 'connected';

    return (
        <div className="chat-room">
            {/* Room Header */}
            <div className="room-header">
                <div className="room-info">
                    <div className="room-name">#{roomName}</div>
                    <div className="room-meta">
                        <span className={`status-dot ${status}`} />
                        <span className={status === 'error' ? 'status-error-text' : ''}>{statusLabel}</span>
                        <span>
                            · {status === 'connected' && onlineUsers.length > 0
                                ? `${onlineUsers.length} online`
                                : status === 'connected' ? '1 online' : '—'}
                        </span>
                    </div>
                </div>
                <div className="room-actions">
                    {roomPassword && <span className="enc-indicator">🔒 AES</span>}
                    {status === 'error' && (
                        <button className="retry-btn" onClick={handleRetry}>↺ RETRY</button>
                    )}
                    <button className="leave-btn" onClick={handleLeave}>LEAVE</button>
                </div>
            </div>

            {/* Server offline banner */}
            {status === 'error' && (
                <div className="chat-offline-banner">
                    ⚠ Cannot reach server — make sure the backend is running on port 3001, then click RETRY
                </div>
            )}

            {/* Messages */}
            <div className="messages-area">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <div className="empty-icon">👻</div>
                        <p>CHANNEL CLEAR</p>
                        <small>Select a cover image, type a message, and transmit</small>
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id || msg.timestamp}
                        msg={msg}
                        onImageClick={setLightboxSrc}
                    />
                ))}
                <TypingIndicator users={typingUsers} />
                <div ref={msgsEndRef} />
            </div>

            {/* Input Area */}
            <div className="chat-input-area">
                <div className="cover-picker-row">
                    <button
                        className={`cover-pick-btn ${coverFile ? 'has-cover' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        title="Select cover image"
                    >
                        📷
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg"
                        onChange={handleCoverSelect}
                    />

                    {coverPreview ? (
                        <div className="cover-preview-chip">
                            <img src={coverPreview} alt="cover" />
                            <span>Cover selected</span>
                            <button className="cover-remove-btn" onClick={handleRemoveCover}>×</button>
                        </div>
                    ) : (
                        <span className="cover-hint">
                            SELECT A COVER IMAGE TO HIDE YOUR MESSAGE IN
                        </span>
                    )}
                </div>

                <div className="input-row">
                    <input
                        className="chat-text-input"
                        type="text"
                        placeholder={status !== 'connected' ? 'Connecting...' : 'TYPE SECRET MESSAGE...'}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={status !== 'connected'}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSend}
                        disabled={!canSend}
                    >
                        {isSending
                            ? <span className="send-spinner" />
                            : <>SEND</>
                        }
                    </button>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxSrc && (
                <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )}
        </div>
    );
};

export default ChatRoom;
