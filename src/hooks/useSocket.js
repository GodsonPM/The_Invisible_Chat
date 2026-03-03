import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { encodeMessage, decodeMessage } from '../utils/steganography';

const SERVER_URL = ''; // Use Vite proxy → localhost:3001

export const useSocket = () => {
    const [status, setStatus] = useState('disconnected'); // disconnected | connecting | online | connected
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [username, setUsername] = useState('');
    const [roomPassword, setRoomPassword] = useState('');

    const socketRef = useRef(null);
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const joinRoom = useCallback((uname, room, password = '') => {
        if (socketRef.current) socketRef.current.disconnect();

        setUsername(uname);
        setRoomName(room);
        setRoomPassword(password);
        setMessages([]);
        setOnlineUsers([]);
        setTypingUsers(new Set());
        setStatus('connecting');

        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setStatus('online');
            socket.emit('join_room', { room, username: uname });
        });

        socket.on('connect_error', () => {
            setStatus('error');
        });

        socket.on('room_joined', ({ users }) => {
            setOnlineUsers(users || []);
            setStatus('connected');
        });

        socket.on('reconnect_attempt', () => {
            setStatus('connecting');
        });

        socket.on('reconnect_error', () => {
            setStatus('error');
        });

        socket.on('reconnect_failed', () => {
            setStatus('error');
        });

        socket.on('users_updated', ({ users }) => {
            setOnlineUsers(users || []);
        });

        socket.on('receive_message', async (data) => {
            // Auto-decode the steganographic image
            let decodedText = null;
            let decodeError = null;
            try {
                decodedText = await decodeMessage(data.image, password);
            } catch (err) {
                decodeError = err.message;
            }

            setMessages(prev => [...prev, {
                id: data.id,
                sender: data.sender,
                image: data.image,
                text: decodedText,
                decodeError,
                timestamp: data.timestamp,
                isIncoming: true,
            }]);
        });

        socket.on('user_typing', ({ sender, isTyping }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                if (isTyping) next.add(sender);
                else next.delete(sender);
                return next;
            });
        });

        socket.on('user_joined', ({ username: joinedUser, users }) => {
            setOnlineUsers(users || []);
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'system',
                text: `${joinedUser} joined the room`,
                timestamp: new Date().toISOString(),
            }]);
        });

        socket.on('user_left', ({ username: leftUser, users }) => {
            setOnlineUsers(users || []);
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'system',
                text: `${leftUser} left the room`,
                timestamp: new Date().toISOString(),
            }]);
        });

        socket.on('disconnect', () => {
            setStatus('disconnected');
        });
    }, []);

    const stopTyping = useCallback((uname, room) => {
        if (!socketRef.current || !isTypingRef.current) return;
        isTypingRef.current = false;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        socketRef.current.emit('typing_stop', { room, sender: uname });
    }, []);

    const startTyping = useCallback((uname, room) => {
        if (!socketRef.current || isTypingRef.current) return;
        isTypingRef.current = true;
        socketRef.current.emit('typing_start', { room, sender: uname });
    }, []);

    const sendMessage = useCallback(async (text, coverImageFile, password, uname, room) => {
        if (!socketRef.current || !text.trim() || !coverImageFile) return;

        // Stop typing indicator
        stopTyping(uname, room);

        // Encode message into image
        const encodedImageDataUrl = await encodeMessage(coverImageFile, text, password);

        const msgData = {
            room,
            sender: uname,
            image: encodedImageDataUrl,
        };

        socketRef.current.emit('send_message', msgData);

        // Add to own messages immediately
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender: uname,
            image: encodedImageDataUrl,
            text,
            timestamp: new Date().toISOString(),
            isIncoming: false,
        }]);
    }, [stopTyping]);

    const handleTyping = useCallback((uname, room) => {
        startTyping(uname, room);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => stopTyping(uname, room), 2000);
    }, [startTyping, stopTyping]);

    const leaveRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setStatus('disconnected');
        setMessages([]);
        setOnlineUsers([]);
        setTypingUsers(new Set());
    }, []);

    return {
        status,
        messages,
        typingUsers,
        onlineUsers,
        roomName,
        username,
        roomPassword,
        joinRoom,
        sendMessage,
        handleTyping,
        leaveRoom,
    };
};
