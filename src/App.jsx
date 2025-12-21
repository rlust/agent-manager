import { useState, useEffect, useRef, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import './index.css'

const initialAgents = [
  { id: 1, name: 'Stock Telegram Bot v3', status: 'Online', lastActive: '2 mins ago', type: 'Workflow', nodes: 12 },
  { id: 2, name: 'Market Sentiment Analyzer', status: 'Offline', lastActive: '1 hour ago', type: 'Agent', nodes: 5 },
  { id: 3, name: 'Auto-Trading Module', status: 'Online', lastActive: 'Now', type: 'Action', nodes: 8 },
]

function App() {
  // Persistence Loading
  const [agents, setAgents] = useState(() => {
    const saved = localStorage.getItem('agents')
    return saved ? JSON.parse(saved) : initialAgents
  })

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('logs')
    return saved ? JSON.parse(saved) : [{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'System initialized.' }]
  })

  const [toasts, setToasts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ cpu: 12, mem: 45, uptime: '12h 4m' })
  const [chartData, setChartData] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Persistence Saving
  useEffect(() => {
    localStorage.setItem('agents', JSON.stringify(agents))
  }, [agents])

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs))
  }, [logs])

  // Mock dynamic stats & Chart Data
  useEffect(() => {
    const interval = setInterval(() => {
      const newCpu = Math.floor(Math.random() * 20) + 5
      const newMem = Math.floor(Math.random() * 10) + 40
      setStats(prev => ({ ...prev, cpu: newCpu, mem: newMem }))

      setChartData(prev => {
        const newData = [...prev, { time: new Date().toLocaleTimeString().split(' ')[0], cpu: newCpu, mem: newMem }]
        return newData.slice(-10) // Keep last 10 points
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const addLog = (message) => {
    setLogs(prev => [
      { id: Date.now(), timestamp: new Date().toLocaleTimeString(), message },
      ...prev.slice(0, 49) // Keep last 50 logs
    ])
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
      if (file.type === "application/json" || file.name.endsWith('.json')) {
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
              nodes: json.nodes ? json.nodes.length : 0
            }
            setAgents(prev => [...prev, newAgent])
            addLog(`Successfully imported workflow: ${newAgent.name}`)
            addToast(`Imported ${newAgent.name}`, 'success')
          } catch (err) {
            addLog(`Error parsing JSON from ${file.name}`)
            addToast(`Import failed: ${file.name}`, 'error')
          }
        }
        reader.readAsText(file)
      }
    })
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.timestamp.includes(searchQuery)
    )
  }, [logs, searchQuery])

  return (
    <div
      className={`dashboard-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFileUpload(e.dataTransfer.files)
      }}
    >
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type} fade-in`}>
            {toast.message}
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="brand">
          <div className="logo-icon" />
          <h2>Agent Manager</h2>
        </div>

        <nav>
          <ul className="nav-links">
            <li className="active">Dashboard</li>
            <li>Workflows</li>
            <li>Agents</li>
            <li>Settings</li>
          </ul>
        </nav>

        <div className="system-health">
          <h3>System Health</h3>
          <div className="stat-row">
            <span>CPU</span>
            <div className="progress-bar"><div className="progress" style={{ width: `${stats.cpu}%` }} /></div>
            <span>{stats.cpu}%</span>
          </div>
          <div className="stat-row">
            <span>RAM</span>
            <div className="progress-bar"><div className="progress" style={{ width: `${stats.mem}%`, background: 'var(--accent-secondary)' }} /></div>
            <span>{stats.mem}%</span>
          </div>
          <p className="uptime">Uptime: {stats.uptime}</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div>
            <h1>Mission Control</h1>
            <p className="subtitle">Managing {agents.length} active processes</p>
          </div>
          <div className="header-actions">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>Import JSON</button>
            <button className="btn btn-primary">+ New Agent</button>
          </div>
        </header>

        {/* Charts Section */}
        <section className="charts-section">
          <div className="card chart-card">
            <div className="chart-header">
              <h3>Performance Trends</h3>
              <div className="chart-legend">
                <span className="legend-item"><span className="dot dot-cpu" /> CPU</span>
                <span className="legend-item"><span className="dot dot-mem" /> RAM</span>
              </div>
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: '#121217', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorCpu)" />
                  <Area type="monotone" dataKey="mem" stroke="var(--accent-secondary)" fillOpacity={1} fill="url(#colorMem)" />
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
                  <div className="status-dot" />
                  {agent.status}
                </div>
              </div>
              <div className="card-body">
                <h3>{agent.name}</h3>
                <div className="metadata">
                  <span>{agent.nodes} Nodes</span>
                  <span className="dot" />
                  <span>{agent.lastActive}</span>
                </div>
              </div>
              <div className="card-actions">
                <button className="btn-icon">Logs</button>
                <button
                  className={`btn-action ${agent.status === 'Online' ? 'stop' : 'start'}`}
                  onClick={() => toggleAgent(agent.id)}
                >
                  {agent.status === 'Online' ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          ))}

          <div className="card upload-placeholder" onClick={() => fileInputRef.current.click()}>
            <div className="upload-icon">+</div>
            <p>Drop JSON to import workflow</p>
          </div>
        </section>

        <section className="logs-section">
          <div className="section-header">
            <h2>Live Console</h2>
            <div className="console-controls">
              <input
                type="text"
                placeholder="Search logs..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn-text" onClick={() => setLogs([])}>Clear</button>
            </div>
          </div>
          <div className="log-viewer">
            {filteredLogs.map((log) => (
              <div key={log.id} className="log-entry">
                <span className="log-timestamp">[{log.timestamp}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            {filteredLogs.length === 0 && searchQuery && (
              <div className="log-message" style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.5 }}>
                No matches found for "{searchQuery}"
              </div>
            )}
          </div>
        </section>
      </main>

      {isDragging && <div className="drop-overlay">Drop files to import</div>}
    </div>
  )
}

export default App
