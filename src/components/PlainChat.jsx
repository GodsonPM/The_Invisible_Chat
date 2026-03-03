import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './Chat.css';
import './PlainChat.css';
import { sfxClick, sfxSuccess, sfxKeystroke } from '../hooks/useSoundEffects';

const SERVER_URL = ''; // Use Vite proxy → localhost:3001

/* ============================================================
   PlainChat — Normal real-time text chat (no steganography)
   ============================================================ */

/* --- Join Screen --- */
const JoinScreen = ({ onJoin }) => {
    const [username, setUsername] = useState('');
    const [room, setRoom] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (username.trim() && room.trim()) {
            sfxClick();
            onJoin(username.trim(), room.trim());
        }
    };

    return (
        <div className="plain-join-screen">
            <div className="plain-join-card">
                <div className="plain-join-logo">
                    <div className="plain-logo-icon">💬</div>
                    <h2>Chat</h2>
                    <p>Join a room and start talking</p>
                </div>
                <form className="plain-join-form" onSubmit={handleSubmit}>
                    <input
                        className="plain-input"
                        type="text"
                        placeholder="Your name"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={() => sfxKeystroke()}
                        maxLength={24}
                        autoFocus
                    />
                    <input
                        className="plain-input"
                        type="text"
                        placeholder="Room name"
                        value={room}
                        onChange={e => setRoom(e.target.value)}
                        onKeyDown={() => sfxKeystroke()}
                        maxLength={32}
                    />
                    <button
                        className="plain-join-btn"
                        type="submit"
                        disabled={!username.trim() || !room.trim()}
                    >
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ============================================================
   Main PlainChat Component
   ============================================================ */
const PlainChat = ({ soundEnabled }) => {
    const [joined, setJoined] = useState(false);
    const [username, setUsername] = useState('');
    const [roomName, setRoomName] = useState('');
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [onlineCount, setOnlineCount] = useState(0);
    const [inputText, setInputText] = useState('');
    const [status, setStatus] = useState('disconnected');

    const socketRef = useRef(null);
    const msgsEndRef = useRef(null);
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);

    const play = (sfx) => { if (soundEnabled) sfx(); };

    // Auto-scroll
    useEffect(() => {
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Sound on incoming
    useEffect(() => {
        const last = messages[messages.length - 1];
        if (last && last.isIncoming) play(sfxSuccess);
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleJoin = (uname, room) => {
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;
        setUsername(uname);
        setRoomName(room);
        setStatus('connecting');

        socket.on('connect', () => {
            socket.emit('join_room', { room, username: uname });
            setStatus('connected');
        });

        socket.on('reconnect', () => {
            socket.emit('join_room', { room, username: uname });
            setStatus('connected');
        });

        socket.on('reconnect_attempt', () => setStatus('connecting'));
        socket.on('reconnect_error', () => setStatus('error'));
        socket.on('reconnect_failed', () => setStatus('error'));

        socket.on('room_joined', ({ users }) => {
            setOnlineCount(users?.length || 1);
        });

        socket.on('users_updated', ({ users }) => {
            setOnlineCount(users?.length || 0);
        });

        socket.on('user_joined', ({ username: who, users }) => {
            setOnlineCount(users?.length || 0);
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `${who} joined` }]);
        });

        socket.on('user_left', ({ username: who, users }) => {
            setOnlineCount(users?.length || 0);
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `${who} left` }]);
        });

        socket.on('receive_plain_message', (data) => {
            play(sfxSuccess);
            setMessages(prev => [...prev, { ...data, isIncoming: true }]);
        });

        socket.on('user_typing', ({ sender, isTyping }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                if (isTyping) next.add(sender);
                else next.delete(sender);
                return next;
            });
        });

        socket.on('connect_error', () => setStatus('error'));
        socket.on('disconnect', () => setStatus('disconnected'));

        setJoined(true);
    };

    const handleLeave = () => {
        if (socketRef.current) socketRef.current.disconnect();
        setJoined(false);
        setMessages([]);
        setInputText('');
        setTypingUsers(new Set());
        setOnlineCount(0);
        play(sfxClick);
    };

    const handleRetry = () => {
        if (socketRef.current) socketRef.current.disconnect();
        setStatus('connecting');
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;
        socket.on('connect', () => {
            socket.emit('join_room', { room: roomName, username });
            setStatus('connected');
        });
        socket.on('connect_error', () => setStatus('error'));
        socket.on('disconnect', () => setStatus('disconnected'));
        socket.on('room_joined', ({ users }) => setOnlineCount(users?.length || 1));
        socket.on('users_updated', ({ users }) => setOnlineCount(users?.length || 0));
        socket.on('receive_plain_message', (data) => {
            play(sfxSuccess);
            setMessages(prev => [...prev, { ...data, isIncoming: true }]);
        });
        socket.on('user_joined', ({ username: who, users }) => {
            setOnlineCount(users?.length || 0);
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `${who} joined` }]);
        });
        socket.on('user_left', ({ username: who, users }) => {
            setOnlineCount(users?.length || 0);
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `${who} left` }]);
        });
        socket.on('user_typing', ({ sender, isTyping }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                if (isTyping) next.add(sender); else next.delete(sender);
                return next;
            });
        });
        socket.on('disconnect', () => setStatus('disconnected'));
    };

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !socketRef.current) return;

        // Add locally
        setMessages(prev => [...prev, {
            id: Date.now(),
            text,
            sender: username,
            timestamp: new Date().toISOString(),
            isIncoming: false,
        }]);

        // Send via socket
        socketRef.current.emit('send_plain_message', { room: roomName, text, sender: username });
        setInputText('');

        // Stop typing
        if (isTypingRef.current) {
            isTypingRef.current = false;
            socketRef.current.emit('typing_stop', { room: roomName, sender: username });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
            return;
        }

        play(sfxKeystroke);

        // Typing indicator
        if (!isTypingRef.current && socketRef.current) {
            isTypingRef.current = true;
            socketRef.current.emit('typing_start', { room: roomName, sender: username });
        }
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            isTypingRef.current = false;
            if (socketRef.current) socketRef.current.emit('typing_stop', { room: roomName, sender: username });
        }, 2000);
    };

    if (!joined) return <JoinScreen onJoin={handleJoin} />;

    const typingList = Array.from(typingUsers);
    const typingText = typingList.length === 1
        ? `${typingList[0]} is typing...`
        : typingList.length > 1
            ? `${typingList.slice(0, 2).join(', ')} are typing...`
            : null;

    return (
        <div className="plain-chat-room">
            {/* Header */}
            <div className="plain-header">
                <div className="plain-header-left">
                    <span className="plain-room-hash">#</span>
                    <span className="plain-room-name">{roomName}</span>
                    <span className={`plain-status-dot ${status}`} />
                    <span className={`plain-status-label ${status}`}>
                        {status === 'connected' ? 'connected'
                            : status === 'connecting' ? 'connecting…'
                                : status === 'error' ? 'server offline'
                                    : 'disconnected'}
                    </span>
                </div>
                <div className="plain-header-right">
                    <span className="plain-online-count">
                        <span className="plain-online-dot" />
                        {status === 'connected' ? `${onlineCount} online` : '—'}
                    </span>
                    <button className="plain-leave-btn" onClick={handleLeave}>Leave</button>
                </div>
            </div>

            {/* Server offline banner */}
            {(status === 'error' || status === 'disconnected') && (
                <div className="plain-offline-banner">
                    <span>⚠ Server unreachable — is the backend running?</span>
                    <button className="plain-retry-btn" onClick={handleRetry}>↺ Retry</button>
                </div>
            )}

            {/* Messages */}
            <div className="plain-messages">
                {messages.length === 0 && status === 'connected' && (
                    <div className="plain-empty">
                        <span>👋</span>
                        <p>You're in <strong>#{roomName}</strong></p>
                        <small>Say hi!</small>
                    </div>
                )}

                {messages.map((msg, i) => {
                    if (msg.type === 'system') {
                        return (
                            <div key={msg.id || i} className="plain-system-msg">{msg.text}</div>
                        );
                    }

                    const isOwn = !msg.isIncoming;
                    // Group: show avatar/name only if sender changes
                    const prev = messages[i - 1];
                    const showMeta = !prev || prev.type === 'system' || prev.sender !== msg.sender;

                    return (
                        <div key={msg.id || i} className={`plain-msg-group ${isOwn ? 'own' : 'other'} ${!showMeta ? 'continued' : ''}`}>
                            {showMeta && (
                                <div className="plain-msg-meta">
                                    <span className="plain-msg-avatar">
                                        {msg.sender.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="plain-msg-sender">{isOwn ? 'You' : msg.sender}</span>
                                    <span className="plain-msg-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                            <div className="plain-bubble-wrap">
                                {!showMeta && <div className="plain-avatar-spacer" />}
                                <div className={`plain-bubble ${isOwn ? 'own' : 'other'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {typingText && (
                    <div className="plain-typing-row">
                        <div className="plain-typing-indicator">
                            <span /><span /><span />
                        </div>
                        <span className="plain-typing-text">{typingText}</span>
                    </div>
                )}

                <div ref={msgsEndRef} />
            </div>

            {/* Input */}
            <div className="plain-input-area">
                <input
                    className="plain-msg-input"
                    type="text"
                    placeholder={status !== 'connected' ? 'Waiting for server…' : `Message #${roomName}`}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={status !== 'connected'}
                    autoFocus
                />
                <button
                    className="plain-send-btn"
                    onClick={handleSend}
                    disabled={!inputText.trim() || status !== 'connected'}
                >
                    ➤
                </button>
            </div>
        </div>
    );

};

export default PlainChat;
