import React, { useState } from 'react'
import InvisibleChat from './components/InvisibleChat'
import ChatRoom from './components/ChatRoom'
import PlainChat from './components/PlainChat'
import './App.css'
import './components/Chat.css'

function App() {
  const [activeTab, setActiveTab] = useState('tool')
  const [soundEnabled] = useState(true)

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div className="app-tab-bar">
        <button
          className={`app-tab ${activeTab === 'tool' ? 'active' : ''}`}
          onClick={() => setActiveTab('tool')}
        >
          🔬 TOOL
        </button>
        <button
          className={`app-tab ${activeTab === 'stego' ? 'active' : ''}`}
          onClick={() => setActiveTab('stego')}
        >
          🔒 STEGO CHAT
        </button>
        <button
          className={`app-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 CHAT
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'tool' && <InvisibleChat />}
        {activeTab === 'stego' && <ChatRoom soundEnabled={soundEnabled} />}
        {activeTab === 'chat' && <PlainChat soundEnabled={soundEnabled} />}
      </div>
    </div>
  )
}

export default App
