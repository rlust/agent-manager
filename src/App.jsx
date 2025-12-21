import { useState, useEffect, useRef, useMemo } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import './index.css'

const initialAgents = [
  { id: 1, name: 'Stock Telegram Bot v3', status: 'Online', lastActive: '2 mins ago', type: 'Workflow', nodes: 12, origin: 'JSON' },
  { id: 2, name: 'Market Sentiment Analyzer', status: 'Offline', lastActive: '1 hour ago', type: 'Agent', nodes: 5, origin: 'Manual' },
  { id: 3, name: 'Auto-Trading Module', status: 'Online', lastActive: 'Now', type: 'Action', nodes: 8, origin: 'Manual' },
]

function App() {
  // Navigation State
  const [activeView, setActiveView] = useState('Dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Data State
  const [agents, setAgents] = useState(() => {
    const saved = localStorage.getItem('agents')
    return saved ? JSON.parse(saved) : initialAgents
  })

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('logs')
    return saved ? JSON.parse(saved) : [{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'System initialized.' }]
  })

  // UI State
  const [toasts, setToasts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ cpu: 12, mem: 45, uptime: '12h 4m' })
  const [chartData, setChartData] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Persistence
  useEffect(() => {
    localStorage.setItem('agents', JSON.stringify(agents))
  }, [agents])

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs))
  }, [logs])

  // Mock Stats Interval
  useEffect(() => {
    const interval = setInterval(() => {
      const newCpu = Math.floor(Math.random() * 20) + 5
      const newMem = Math.floor(Math.random() * 10) + 40
      setStats(prev => ({ ...prev, cpu: newCpu, mem: newMem }))
      setChartData(prev => [...prev.slice(-9), { time: new Date().toLocaleTimeString().split(' ')[0], cpu: newCpu, mem: newMem }])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const addLog = (message) => {
    setLogs(prev => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message }, ...prev.slice(0, 49)])
  }

  const toggleAgent = (id) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        const newStatus = agent.status === 'Online' ? 'Offline' : 'Online'
        addLog(`Agent "${agent.name}" status changed to ${newStatus}.`)
        addToast(`${agent.name} is now ${newStatus}`, newStatus === 'Online' ? 'success' : 'warning')
        return { ...agent, status: newStatus, lastActive: 'Now' }
      }
      return agent
    }))
  }

  const handleFileUpload = (files) => {
    Array.from(files).forEach(file => {
      if (file.name.endsWith('.json')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result)
            const newAgent = {
              id: Date.now() + Math.random(),
              name: json.name || file.name.replace('.json', ''),
              status: 'Offline',
              lastActive: 'Just now',
              type: 'Workflow',
              nodes: json.nodes ? json.nodes.length : 0,
              origin: 'JSON'
            }
            setAgents(prev => [...prev, newAgent])
            addLog(`Successfully imported: ${newAgent.name}`)
            addToast(`Imported ${newAgent.name}`, 'success')
          } catch (err) {
            addToast(`Import failed: ${file.name}`, 'error')
          }
        }
        reader.readAsText(file)
      }
    })
  }

  // Views Logic
  const DashboardView = () => (
    <>
      <header className="main-header">
        <div>
          <h1>Mission Control</h1>
          <p className="subtitle">Managing {agents.length} active processes</p>
        </div>
        <div className="header-actions">
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={(e) => handleFileUpload(e.target.files)} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>Import JSON</button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ New Agent</button>
        </div>
      </header>

      <section className="charts-section">
        <div className="card chart-card">
          <div className="chart-header">
            <h3>Performance Trends</h3>
            <div className="chart-legend">
              <span className="legend-item"><span className="dot dot-cpu" /> CPU</span>
              <span className="legend-item"><span className="dot dot-mem" /> RAM</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <Tooltip contentStyle={{ background: '#121217', borderColor: 'var(--glass-border)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="cpu" stroke="var(--accent-primary)" fillOpacity={0.2} fill="var(--accent-primary)" />
                <Area type="monotone" dataKey="mem" stroke="var(--accent-secondary)" fillOpacity={0.2} fill="var(--accent-secondary)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="agent-grid">
        {agents.map((agent) => (
          <div key={agent.id} className="card agent-card fade-in">
            <div className="card-header">
              <span className="agent-type">{agent.type}</span>
              <div className={`status-badge ${agent.status === 'Online' ? 'status-online' : 'status-offline'}`}>
                <div className="status-dot" /> {agent.status}
              </div>
            </div>
            <h3>{agent.name}</h3>
            <div className="metadata">
              <span>{agent.nodes} Nodes</span> <span className="dot" /> <span>{agent.lastActive}</span>
            </div>
            <div className="card-actions">
              <button className="btn-icon">Logs</button>
              <button className={`btn-action ${agent.status === 'Online' ? 'stop' : 'start'}`} onClick={() => toggleAgent(agent.id)}>
                {agent.status === 'Online' ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        ))}
        <div className="card upload-placeholder" onClick={() => fileInputRef.current.click()}>
          <div className="upload-icon">+</div>
          <p>Drop JSON to import</p>
        </div>
      </section>
    </>
  )

  const ListView = (type) => {
    const list = agents.filter(a => type === 'Workflows' ? a.origin === 'JSON' : a.origin !== 'JSON')
    return (
      <div className="list-view fade-in">
        <h1>{type}</h1>
        <div className="list-container card">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Status</th><th>Nodes</th><th>Last Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td><span className={`status-text ${a.status.toLowerCase()}`}>{a.status}</span></td>
                  <td>{a.nodes}</td>
                  <td>{a.lastActive}</td>
                  <td><button className="btn-text" onClick={() => toggleAgent(a.id)}>Toggle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="empty-msg">No {type.toLowerCase()} found.</p>}
        </div>
      </div>
    )
  }

  const SettingsView = () => (
    <div className="settings-view fade-in">
      <h1>Settings</h1>
      <div className="card settings-container">
        <div className="setting-item">
          <div><h3>Persistence</h3><p>Save state to localStorage</p></div>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="setting-item">
          <div><h3>Notifications</h3><p>Show toast alerts on status changes</p></div>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="setting-item">
          <div><h3>Auto-Refresh</h3><p>Update system health stats every 3s</p></div>
          <input type="checkbox" defaultChecked />
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={`dashboard-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files) }}
    >
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type} fade-in`}>{t.message}</div>)}
      </div>

      <aside className="sidebar">
        <div className="brand"><div className="logo-icon" /><h2>Agent Manager</h2></div>
        <nav><ul className="nav-links">
          {['Dashboard', 'Workflows', 'Agents', 'Settings'].map(view => (
            <li key={view} className={activeView === view ? 'active' : ''} onClick={() => setActiveView(view)}>{view}</li>
          ))}
        </ul></nav>
        <div className="system-health">
          <h3>Health</h3>
          <div className="stat-row"><span>CPU</span><div className="progress-bar"><div className="progress" style={{ width: `${stats.cpu}%` }} /></div><span>{stats.cpu}%</span></div>
          <div className="stat-row"><span>RAM</span><div className="progress-bar"><div className="progress" style={{ width: `${stats.mem}%`, background: 'var(--accent-secondary)' }} /></div><span>{stats.mem}%</span></div>
        </div>
      </aside>

      <main className="main-content">
        {activeView === 'Dashboard' && DashboardView()}
        {(activeView === 'Workflows' || activeView === 'Agents') && ListView(activeView)}
        {activeView === 'Settings' && SettingsView()}

        {activeView === 'Dashboard' && (
          <section className="logs-section">
            <div className="section-header"><h2>Live Console</h2>
              <div className="console-controls">
                <input type="text" placeholder="Search..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button className="btn-text" onClick={() => setLogs([])}>Clear</button>
              </div>
            </div>
            <div className="log-viewer">
              {logs.filter(l => l.message.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                <div key={l.id} className="log-entry"><span className="log-timestamp">[{l.timestamp}]</span><span>{l.message}</span></div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* New Agent Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal card fade-in" onClick={e => e.stopPropagation()}>
            <h2>Create New Agent</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const name = e.target.name.value
              if (name) {
                setAgents(prev => [...prev, { id: Date.now(), name, status: 'Offline', lastActive: 'New', type: 'Agent', nodes: 0, origin: 'Manual' }])
                addToast(`Agent ${name} created`, 'success')
                setIsModalOpen(false)
              }
            }}>
              <div className="form-group">
                <label>Agent Name</label>
                <input name="name" type="text" placeholder="Enter name..." autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDragging && <div className="drop-overlay">Drop JSON here</div>}
    </div>
  )
}

export default App
