import React, { useState } from 'react';

const NetworkPanel = ({ peerId, status, onConnect }) => {
    const [targetId, setTargetId] = useState('');

    const statusColors = {
        'offline': '#666',
        'connecting': '#ffaa00',
        'online': '#00ff41',
        'connected': '#00ff41',
        'error': '#ff3333'
    };

    return (
        <div style={{
            background: '#111',
            border: '1px solid #333',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px'
        }}>
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                SECURE LINK STATUS: <span style={{ color: statusColors[status] }}>{status.toUpperCase()}</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {peerId && (
                    <div style={{ fontSize: '0.9rem' }}>
                        <span style={{ opacity: 0.7 }}>MY ID:</span>
                        <code style={{
                            background: '#000',
                            padding: '2px 5px',
                            marginLeft: '5px',
                            border: '1px solid #333',
                            userSelect: 'all'
                        }}>{peerId}</code>
                    </div>
                )}

                {status !== 'connected' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            className="retro-input"
                            style={{ flex: 1, padding: '8px' }}
                            placeholder="Partner ID"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                        />
                        <button
                            className="action-btn"
                            style={{ padding: '8px 15px', fontSize: '0.9rem', marginTop: 0 }}
                            onClick={() => onConnect(targetId)}
                        >
                            CONNECT
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkPanel;
