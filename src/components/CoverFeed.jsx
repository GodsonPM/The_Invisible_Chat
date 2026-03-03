import React from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars

const CoverFeed = ({ messages }) => {
    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 overflow-y-auto h-full">
            {messages.length === 0 && (
                <div className="col-span-full text-center text-gray-500 mt-20">
                    No snaps yet. Be the first!
                </div>
            )}

            {messages.map((msg, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all shadow-lg"
                >
                    <img
                        src={msg.image}
                        alt="Snap"
                        className="w-full h-64 object-cover"
                    />
                    <div className="p-3">
                        <div className="flex justify-between items-center text-sm text-gray-400">
                            <span>{msg.sender}</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default CoverFeed;
