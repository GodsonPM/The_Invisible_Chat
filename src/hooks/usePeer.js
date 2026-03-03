import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { encodeMessage, decodeMessage } from '../utils/steganography';

export const usePeer = () => {
    const [peerId, setPeerId] = useState('');
    const [connection, setConnection] = useState(null);
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState('offline'); // offline | connecting | online | connected | error
    const [peerError, setPeerError] = useState(null);
    const peerRef = useRef(null);
    const passwordRef = useRef('');

    // setupConnection is declared BEFORE useEffect to avoid the
    // "accessed before declaration" ESLint error.
    const setupConnection = useCallback((conn) => {
        setConnection(conn);
        setStatus('connected');
        setPeerError(null);

        conn.on('data', async (data) => {
            // Auto-decode the steganographic image
            let decodedText = null;
            let decodeError = null;
            try {
                decodedText = await decodeMessage(data.content, passwordRef.current);
            } catch (err) {
                decodeError = err.message;
            }

            setMessages((prev) => [...prev, {
                ...data,
                decodedText,
                decodeError,
                timestamp: Date.now(),
                isIncoming: true,
            }]);
        });

        conn.on('close', () => {
            setConnection(null);
            setStatus('online');
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'system',
                text: 'Peer disconnected',
                timestamp: Date.now(),
            }]);
        });

        conn.on('error', (err) => {
            setPeerError(err.message);
        });
    }, []);

    useEffect(() => {
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            setPeerId(id);
            setStatus('online');
        });

        peer.on('connection', (conn) => {
            setupConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            setPeerError(err.message || 'Connection error');
            setStatus('error');
        });

        return () => {
            if (peerRef.current) peerRef.current.destroy();
        };
    }, [setupConnection]);

    const connectToPeer = (targetId) => {
        if (!peerRef.current) return;
        setStatus('connecting');
        const conn = peerRef.current.connect(targetId, { reliable: true });
        setupConnection(conn);
    };

    const sendMessage = async (text, coverImageFile, password) => {
        if (!connection || !text.trim() || !coverImageFile) return;

        // Encode message into cover image
        const encodedImageUrl = await encodeMessage(coverImageFile, text, password);

        const msg = {
            type: 'image',
            content: encodedImageUrl,
            timestamp: Date.now(),
        };
        connection.send(msg);

        setMessages((prev) => [...prev, {
            ...msg,
            decodedText: text, // We know what we sent
            isIncoming: false,
        }]);
    };

    const setPassword = (pw) => {
        passwordRef.current = pw;
    };

    const disconnect = () => {
        if (connection) connection.close();
        setConnection(null);
        setStatus('online');
        setMessages([]);
    };

    return {
        peerId,
        connection,
        status,
        messages,
        peerError,
        connectToPeer,
        sendMessage,
        setPassword,
        disconnect,
    };
};
