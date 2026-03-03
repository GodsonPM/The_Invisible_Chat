import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';
import { usePeer } from '../hooks/usePeer';
import { sfxClick, sfxSuccess, sfxError, sfxKeystroke, sfxProcessStart } from '../hooks/useSoundEffects';

/* ============================================================
   DirectChat — Peer-to-peer steganographic direct messaging
   Uses PeerJS for signaling & data transfer (no server needed)
   ============================================================ */

// Copy-to-clipboard helper
const CopyBtn = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button className="copy-id-btn" onClick={handleCopy} title="Copy ID">
            {copied ? '✅ COPIED' : '📋 COPY'}
        </button>
    );
};

// Image Lightbox
const Lightbox = ({ src, onClose }) => (
    <div className="img-lightbox" onClick={onClose}>
        <img src={src} alt="Cover" />
    </div>
);

/* --- Setup Screen (before connecting) --- */
const SetupScreen = ({ peerId, status, peerError, onConnect }) => {
    const [targetId, setTargetId] = useState('');
    const [password, setPassword] = useState('');

    const handleConnect = (e) => {
        e.preventDefault();
        if (targetId.trim()) {
            sfxClick();
            onConnect(targetId.trim(), password);
        }
    };

    return (
        <div className="join-screen">
            <div className="join-card">
                <div className="join-logo">
                    <h2>📡 Direct Link</h2>
                    <small>PEER-TO-PEER STEGANOGRAPHIC MESSAGING</small>
                </div>

                {/* My ID */}
                <div className="my-peer-id-box">
                    <div className="my-peer-label">YOUR PEER ID</div>
                    {status === 'offline' || !peerId ? (
                        <div className="peer-id-loading">
                            <span className="peer-id-spinner" /> GENERATING...
                        </div>
                    ) : (
                        <div className="peer-id-display">
                            <code className="peer-id-code">{peerId}</code>
                            <CopyBtn text={peerId} />
                        </div>
                    )}
                    <small className="peer-id-hint">Share this with your contact so they can connect to you</small>
                </div>

                <div className="join-divider">— OR CONNECT TO A PEER —</div>

                <form className="join-form" onSubmit={handleConnect}>
                    <div className="input-wrap">
                        <label>Friend's Peer ID</label>
                        <input
                            className="retro-input"
                            type="text"
                            placeholder="Paste their peer ID"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            onKeyDown={() => sfxKeystroke()}
                        />
                    </div>
                    <div className="input-wrap">
                        <label>Shared Secret (optional — AES encryption)</label>
                        <input
                            className="retro-input"
                            type="password"
                            placeholder="Both peers must use the same password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {peerError && (
                        <div style={{ color: '#ff4444', fontSize: '0.75rem', background: 'rgba(255,68,68,0.08)', border: '1px solid #ff4444', padding: '8px 12px', borderRadius: '4px' }}>
                            ⚠ {peerError}
                        </div>
                    )}
                    <button
                        className="join-btn"
                        type="submit"
                        disabled={!targetId.trim() || status === 'offline' || status === 'connecting'}
                    >
                        {status === 'connecting' ? 'CONNECTING...' : 'CONNECT'}
                    </button>
                </form>

                <p style={{ color: '#333', fontSize: '0.7rem', marginTop: '16px', textAlign: 'center', letterSpacing: '1px' }}>
                    ⚡ NO SERVER — DIRECT BROWSER-TO-BROWSER VIA PEERJS
                </p>
            </div>
        </div>
    );
};

/* --- Message Bubble --- */
const DirectBubble = ({ msg, onImageClick }) => {
    if (msg.type === 'system') {
        return <div className="system-msg">— {msg.text} —</div>;
    }
    return (
        <div className={`msg-wrapper ${msg.isIncoming ? 'incoming' : 'outgoing'}`}>
            <div className="msg-bubble">
                <div className="msg-sender">{msg.isIncoming ? 'PEER' : 'YOU'}</div>
                {msg.decodedText ? (
                    <div className="msg-text">{msg.decodedText}</div>
                ) : msg.decodeError ? (
                    <div className="msg-decode-error">🔒 {msg.decodeError}</div>
                ) : (
                    <div className="msg-decode-error">⏳ Decoding...</div>
                )}
                {msg.content && (
                    <>
                        <img
                            className="msg-image-thumb"
                            src={msg.content}
                            alt="Cover"
                            onClick={() => onImageClick(msg.content)}
                            title="Click to view cover image"
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
   Main DirectChat Component
   ============================================================ */
const DirectChat = ({ soundEnabled }) => {
    const {
        peerId, status, messages, peerError,
        connectToPeer, sendMessage, setPassword, disconnect,
    } = usePeer();

    const [inputText, setInputText] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [sharedPassword, setSharedPassword] = useState('');

    const fileInputRef = useRef(null);
    const msgsEndRef = useRef(null);

    const play = (sfx) => { if (soundEnabled) sfx(); };

    // Auto-scroll
    useEffect(() => {
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sound on incoming message
    useEffect(() => {
        const last = messages[messages.length - 1];
        if (last && last.isIncoming && last.type !== 'system') play(sfxSuccess);
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConnect = (targetId, password) => {
        setSharedPassword(password);
        setPassword(password);
        connectToPeer(targetId);
    };

    const handleCoverSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverFile(file);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(URL.createObjectURL(file));
        play(sfxClick);
        e.target.value = '';
    };

    const handleRemoveCover = () => {
        setCoverFile(null);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(null);
    };

    const handleSend = async () => {
        if (!inputText.trim() || !coverFile || isSending || status !== 'connected') return;
        play(sfxProcessStart);
        setIsSending(true);
        try {
            await sendMessage(inputText.trim(), coverFile, sharedPassword);
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
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setInputText('');
        handleRemoveCover();
        setSharedPassword('');
        play(sfxClick);
    };

    // Show setup screen unless connected
    if (status !== 'connected') {
        return (
            <SetupScreen
                peerId={peerId}
                status={status}
                peerError={peerError}
                onConnect={handleConnect}
            />
        );
    }

    const canSend = !!inputText.trim() && !!coverFile && !isSending;

    return (
        <div className="chat-room">
            {/* Header */}
            <div className="room-header">
                <div className="room-info">
                    <div className="room-name">📡 DIRECT LINK</div>
                    <div className="room-meta">
                        <span className="status-dot connected" />
                        <span>CONNECTED</span>
                    </div>
                </div>
                <div className="room-actions">
                    {sharedPassword && <span className="enc-indicator">🔒 AES</span>}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '1px' }}>YOUR ID</span>
                        <code style={{ fontSize: '0.7rem', color: '#555', background: '#111', padding: '2px 6px', borderRadius: '3px' }}>
                            {peerId.slice(0, 16)}…
                        </code>
                    </div>
                    <button className="leave-btn" onClick={handleDisconnect}>DISCONNECT</button>
                </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <div className="empty-icon">📡</div>
                        <p>DIRECT LINK ACTIVE</p>
                        <small>Select a cover image and send your first hidden message</small>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <DirectBubble
                        key={msg.id || msg.timestamp || i}
                        msg={msg}
                        onImageClick={setLightboxSrc}
                    />
                ))}
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
                        <span className="cover-hint">SELECT A COVER IMAGE TO HIDE YOUR MESSAGE IN</span>
                    )}
                </div>

                <div className="input-row">
                    <input
                        className="chat-text-input"
                        type="text"
                        placeholder="TYPE SECRET MESSAGE..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSend}
                        disabled={!canSend}
                    >
                        {isSending ? <span className="send-spinner" /> : 'SEND'}
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

export default DirectChat;
