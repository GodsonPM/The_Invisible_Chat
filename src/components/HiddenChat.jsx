import React, { useState, useRef, useEffect } from 'react';
import { encryptMessage } from '../utils/crypto';
import { encodeMessageIntoImage } from '../utils/steganography';
import { Send, Image as ImageIcon, Loader } from 'lucide-react';

const HiddenChat = ({ messages, sendMessage, secretKey, username, typingUsers, socket, room }) => {
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]); // Scroll when typing changes too

    const handleInputChange = (e) => {
        setInputText(e.target.value);

        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing_start', { room, sender: username });
        }

        // Debounce stop typing
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('typing_stop', { room, sender: username });
        }, 2000);
    };

    const handleImageSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Basic validation (size < 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("File too large. Max 5MB.");
                return;
            }
            setSelectedImage(file);
        }
    };

    const handleSend = async () => {
        if (!inputText || !selectedImage) return;

        setIsProcessing(true);
        try {
            // Stop typing indicator immediately
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setIsTyping(false);
            socket.emit('typing_stop', { room, sender: username });

            // 1. Encrypt
            const encrypted = encryptMessage(inputText, secretKey);

            // 2. Encode
            const encodedImage = await encodeMessageIntoImage(selectedImage, encrypted);

            // 3. Send
            sendMessage(encodedImage);

            // Cleanup
            setInputText('');
            setSelectedImage(null);
        } catch (err) {
            console.error("Failed to encode:", err);
            alert("Failed to encode message into image.");
        } finally {
            setIsProcessing(false);
        }
    };

    const chatMessages = messages.filter(m => m.decryptedContent || (m.sender === username && m.image));

    // Format typing users text
    const typingSources = Array.from(typingUsers);
    const typingText = typingSources.length > 0
        ? `${typingSources.join(', ')} is typing...`
        : null;

    return (
        <div className="flex flex-col h-full bg-matrix-black text-[#00FF41] font-mono p-4">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 border border-green-500/30 p-4 rounded bg-black/50">
                {chatMessages.length === 0 && (
                    <div className="text-center opacity-50 mt-10">
                        -- SECURE CHANNEL ESTABLISHED --
                        <br />Waiting for encrypted transmission...
                    </div>
                )}

                {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded border ${msg.sender === username ? 'border-green-500 bg-green-500/10' : 'border-gray-500 bg-gray-500/10'
                            }`}>
                            <div className="text-xs opacity-50 mb-1 flex justify-between gap-4">
                                <span>{msg.sender}</span>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {msg.decryptedContent ? (
                                <div>{msg.decryptedContent}</div>
                            ) : (
                                <div className="italic opacity-50 text-xs flex items-center gap-2">
                                    <ImageIcon size={12} /> Image containing hidden data (or just an image)
                                    <br />[Click to view Cover]
                                </div>
                            )}
                            {/* Thumbnail of cover */}
                            <img src={msg.image} className="w-16 h-16 object-cover mt-2 opacity-50 hover:opacity-100 transition-opacity rounded cursor-pointer" onClick={() => window.open(msg.image)} />
                        </div>
                    </div>
                ))}

                {typingText && (
                    <div className="text-green-500/50 text-xs italic animate-pulse">
                        &gt; {typingText}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-green-500/50 pt-4">
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-3 py-1 text-sm border ${selectedImage ? 'border-green-500 text-green-500' : 'border-gray-500 text-gray-500'} rounded hover:bg-white/5`}
                    >
                        <ImageIcon size={16} />
                        {selectedImage ? selectedImage.name.substring(0, 15) + '...' : "Select Host Image"}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    <span className="text-xs text-gray-500">
                        {selectedImage ? "Ready to hide message" : "Select an image to hide your text in"}
                    </span>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder="Type secret message..."
                        className="flex-1 bg-black border border-green-500/50 p-3 outline-none focus:border-green-400 font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isProcessing || !inputText || !selectedImage}
                        className="bg-green-600 text-black px-6 py-2 font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                    >
                        {isProcessing ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HiddenChat;
