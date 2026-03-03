import React, { useState, useRef, useEffect } from 'react';
import './InvisibleChat.css';
import { encodeMessage, decodeMessage, getImageData } from '../utils/steganography';
import { fullAnalysis } from '../utils/steganalysis';
import { sfxClick, sfxFileLoad, sfxProcessStart, sfxSuccess, sfxError, sfxScan, sfxReset, sfxKeystroke } from '../hooks/useSoundEffects';
import { getHistory, addHistoryEntry, clearHistory } from '../hooks/useHistory';

const InvisibleChat = () => {
    const [mode, setMode] = useState('encode');
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const fileInputRef = useRef(null);

    // Load history on mount
    useEffect(() => {
        setHistory(getHistory());
    }, []);

    // Sound wrapper
    const play = (sfx) => { if (soundEnabled) sfx(); };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Revoke the previous ObjectURL to prevent memory leaks
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setResult(null);
            setScanResult(null);
            setError(null);
            play(sfxFileLoad);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreviewUrl(null);
        setMessage('');
        setPassword('');
        setResult(null);
        setScanResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        play(sfxReset);
    };

    const handleModeSwitch = (newMode) => {
        setMode(newMode);
        setResult(null);
        setScanResult(null);
        setError(null);
        play(sfxClick);
    };

    const handleProcess = async () => {
        if (!file) {
            setError("Please select an image first.");
            play(sfxError);
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setScanResult(null);
        play(sfxProcessStart);

        try {
            if (mode === 'encode') {
                if (!message) throw new Error("Please enter a message.");
                const encodedImageUrl = await encodeMessage(file, message, password);
                setResult({ type: 'image', content: encodedImageUrl });
                addHistoryEntry('encode', {
                    message,
                    encrypted: !!password,
                    result: 'Image generated'
                });
                play(sfxSuccess);
            } else if (mode === 'decode') {
                const decodedMessage = await decodeMessage(file, password);
                setResult({ type: 'text', content: decodedMessage });
                addHistoryEntry('decode', {
                    encrypted: !!password,
                    result: decodedMessage.substring(0, 80)
                });
                play(sfxSuccess);
            } else if (mode === 'scan') {
                const { data, width, height } = await getImageData(file);
                const analysis = fullAnalysis(data, width, height);
                setScanResult(analysis);
                addHistoryEntry('scan', {
                    scanScore: analysis.overallScore,
                    result: analysis.overallVerdict
                });
                play(sfxScan);
            }
            setHistory(getHistory());
        } catch (err) {
            console.error(err);
            setError(err.message);
            play(sfxError);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = () => {
        clearHistory();
        setHistory([]);
        play(sfxReset);
    };

    return (
        <div className="invisible-chat">
            <header className="chat-header">
                <div>
                    <h1>Ghost Protocol</h1>
                    <small>Steganography & Steganalysis Tool</small>
                </div>
                <div className="header-actions">
                    <button
                        className={`icon-btn ${showHistory ? 'active' : ''}`}
                        onClick={() => { setShowHistory(!showHistory); play(sfxClick); }}
                        title="History"
                    >
                        📋 {history.length > 0 && <span className="badge">{history.length}</span>}
                    </button>
                    <button
                        className={`icon-btn ${soundEnabled ? '' : 'muted'}`}
                        onClick={() => { setSoundEnabled(!soundEnabled); }}
                        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                    >
                        {soundEnabled ? '🔊' : '🔇'}
                    </button>
                    <button
                        onClick={handleReset}
                        className="reset-btn"
                    >
                        RESET
                    </button>
                </div>
            </header>

            <div className="chat-content">
                {/* --- LEFT PANEL: IMAGE PREVIEW --- */}
                <div className="left-panel">
                    <div
                        className="file-drop-zone"
                        onClick={() => fileInputRef.current.click()}
                    >
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="preview-image" />
                        ) : (
                            <div className="drop-message">
                                <span className="drop-icon">📂</span>
                                <p>DRAG & DROP IMAGE HERE</p>
                                <small style={{ opacity: 0.5 }}>or click to browse</small>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/png, image/jpeg"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* LSB Visualization */}
                    {scanResult && (
                        <div className="lsb-preview">
                            <h4 style={{ margin: '10px 0 5px', fontSize: '0.8rem', color: '#888' }}>LSB VISUAL ATTACK</h4>
                            <img src={scanResult.lsbImage} alt="LSB Plane" className="lsb-image" />
                        </div>
                    )}
                </div>

                {/* --- RIGHT PANEL: CONTROLS or HISTORY --- */}
                <div className="right-panel">
                    {showHistory ? (
                        /* --- HISTORY VIEW --- */
                        <div className="history-panel">
                            <div className="history-header">
                                <h3>Operation History</h3>
                                {history.length > 0 && (
                                    <button className="clear-btn" onClick={handleClearHistory}>CLEAR ALL</button>
                                )}
                            </div>
                            {history.length === 0 ? (
                                <div className="history-empty">
                                    <p>No operations recorded yet.</p>
                                    <small>Encode, decode, or scan an image to start building history.</small>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {history.map((entry) => (
                                        <div key={entry.id} className={`history-entry ${entry.action}`}>
                                            <div className="entry-icon">
                                                {entry.action === 'encode' ? '🔒' : entry.action === 'decode' ? '🔓' : '🔍'}
                                            </div>
                                            <div className="entry-details">
                                                <div className="entry-action">
                                                    {entry.action.toUpperCase()}
                                                    {entry.encrypted && <span className="enc-badge">AES</span>}
                                                    {entry.scanScore !== undefined && (
                                                        <span className={`score-badge ${entry.scanScore > 70 ? 'high' : entry.scanScore > 40 ? 'medium' : 'low'}`}>
                                                            {entry.scanScore}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="entry-result">{entry.result || entry.message || '—'}</div>
                                                <div className="entry-time">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* --- CONTROLS VIEW --- */
                        <>
                            {mode === 'encode' && (
                                <div className="warning-box">
                                    <span className="warning-icon">⚠️</span>
                                    <div>
                                        <strong>DATA LOSS WARNING</strong>
                                        <br />
                                        If sending via WhatsApp, Telegram, or Messenger, you MUST send the image as a <strong>DOCUMENT / FILE</strong>.
                                        <br />
                                        <small>Standard image sending compresses the file and destroys the hidden message.</small>
                                    </div>
                                </div>
                            )}

                            <div className="chat-controls">
                                <button
                                    className={`mode-btn ${mode === 'encode' ? 'active' : ''}`}
                                    onClick={() => handleModeSwitch('encode')}
                                >
                                    ENCRYPT
                                </button>
                                <button
                                    className={`mode-btn ${mode === 'decode' ? 'active' : ''}`}
                                    onClick={() => handleModeSwitch('decode')}
                                >
                                    DECRYPT
                                </button>
                                <button
                                    className={`mode-btn scan-btn ${mode === 'scan' ? 'active' : ''}`}
                                    onClick={() => handleModeSwitch('scan')}
                                >
                                    🔍 SCAN
                                </button>
                            </div>

                            {mode === 'encode' && (
                                <div className="input-group">
                                    <label>SECRET MESSAGE</label>
                                    <textarea
                                        className="retro-textarea"
                                        rows="6"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={() => play(sfxKeystroke)}
                                        placeholder="Type your hidden message..."
                                    />
                                </div>
                            )}

                            {mode !== 'scan' && (
                                <div className="input-group">
                                    <label>{mode === 'encode' ? 'ENCRYPTION KEY (Optional)' : 'DECRYPTION KEY'}</label>
                                    <input
                                        type="password"
                                        className="retro-input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password..."
                                    />
                                </div>
                            )}

                            {mode === 'scan' && (
                                <div className="scan-info">
                                    <p>Drop an image and click <strong>ANALYZE</strong> to detect hidden data.</p>
                                    <ul>
                                        <li>Chi-Square Analysis (LSB pair distribution)</li>
                                        <li>Entropy Analysis (bit randomness)</li>
                                        <li>LSB Visual Attack (bit plane extraction)</li>
                                    </ul>
                                </div>
                            )}

                            <button
                                className="action-btn"
                                onClick={handleProcess}
                                disabled={loading}
                            >
                                {loading ? "PROCESSING..." : (
                                    mode === 'encode' ? "CONCEAL DATA" :
                                        mode === 'decode' ? "EXTRACT DATA" :
                                            "ANALYZE IMAGE"
                                )}
                            </button>

                            {error && <div className="error-msg">ERROR: {error}</div>}

                            {result && (
                                <div className="result-area">
                                    <h4>RESULT</h4>
                                    {result.type === 'text' ? (
                                        <div className="retro-textarea" style={{ minHeight: '100px' }}>{result.content}</div>
                                    ) : (
                                        <div>
                                            <p style={{ color: '#888', marginBottom: '10px' }}>Data successfully hidden in image.</p>
                                            <a
                                                href={result.content}
                                                download={`ghost_msg_${Date.now()}.png`}
                                                className="download-link"
                                            >
                                                ⬇ DOWNLOAD ENCODED IMAGE
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {scanResult && (
                                <div className="scan-results">
                                    <div className={`scan-verdict ${scanResult.overallScore > 70 ? 'high' : scanResult.overallScore > 40 ? 'medium' : 'low'}`}>
                                        <div className="score-circle">
                                            <span className="score-number">{scanResult.overallScore}</span>
                                            <span className="score-label">/ 100</span>
                                        </div>
                                        <p>{scanResult.overallVerdict}</p>
                                    </div>

                                    <div className="scan-detail">
                                        <h5>Chi-Square Analysis</h5>
                                        <div className="detail-bar">
                                            <div className="bar-fill" style={{ width: `${scanResult.chiSquare.score}%` }}></div>
                                        </div>
                                        <small>Score: {scanResult.chiSquare.score}/100 — {scanResult.chiSquare.verdict}</small>
                                    </div>

                                    <div className="scan-detail">
                                        <h5>LSB Entropy</h5>
                                        <div className="detail-bar">
                                            <div className="bar-fill entropy" style={{ width: `${scanResult.entropy.ratio}%` }}></div>
                                        </div>
                                        <small>
                                            Entropy: {scanResult.entropy.entropy} / {scanResult.entropy.maxEntropy} ({scanResult.entropy.ratio}%)
                                            <br />
                                            Bits: {scanResult.entropy.zeroBits.toLocaleString()} zeros, {scanResult.entropy.oneBits.toLocaleString()} ones
                                        </small>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvisibleChat;
