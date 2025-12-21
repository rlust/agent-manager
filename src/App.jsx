import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import './index.css'

const initialAgents = [
  { id: 1, name: 'Stock Telegram Bot v3', status: 'Online', lastActive: '2 mins ago', type: 'Workflow', nodes: 12, origin: 'JSON', webhookPath: 'stock-update' },
  { id: 2, name: 'Market Sentiment Analyzer', status: 'Offline', lastActive: '1 hour ago', type: 'Agent', nodes: 5, origin: 'Manual' },
  { id: 3, name: 'Auto-Trading Module', status: 'Online', lastActive: 'Now', type: 'Action', nodes: 8, origin: 'Manual' },
]

const COLORS = ['#10b981', '#ef4444', '#f59e0b']

function App() {
  // Navigation & UI state
  const [activeView, setActiveView] = useState('Dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [toasts, setToasts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // n8n Integration State
  const [n8nStatus, setN8nStatus] = useState('Disconnected')
  const [n8nConfig, setN8nConfig] = useState(() => {
    const saved = localStorage.getItem('n8nConfig')
    return saved ? JSON.parse(saved) : {
      url: 'http://ubuntullm.tail1f233.ts.net:5678',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwOGI1NDI5YS0zNGM2LTQ2MDMtYmI1Yy03ZTZmODRlZTg4YmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MzM3OTg3LCJleHAiOjE3NzYyMjU2MDB9.ABncUi6RAQ--MmDKenVuv1oZGGaFUHuW4Gg6c-YqIGk'
    }
  })

  // Core Data
  const [agents, setAgents] = useState(() => {
    const saved = localStorage.getItem('agents')
    return saved ? JSON.parse(saved) : initialAgents
  })

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('logs')
    return saved ? JSON.parse(saved) : [{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'System initialized.' }]
  })

  // Execution & Results State
  const [executionResults, setExecutionResults] = useState({})
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState({ cpu: 12, mem: 45, uptime: '12h 4m' })
  const [chartData, setChartData] = useState([])

  // Persistence
  useEffect(() => localStorage.setItem('agents', JSON.stringify(agents)), [agents])
  useEffect(() => localStorage.setItem('logs', JSON.stringify(logs)), [logs])
  useEffect(() => localStorage.setItem('n8nConfig', JSON.stringify(n8nConfig)), [n8nConfig])

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const addLog = (message) => {
    setLogs(prev => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message }, ...prev.slice(0, 49)])
  }

  // n8n API Logic
  const syncN8n = useCallback(async () => {
    try {
      setN8nStatus('Connecting...')
      const response = await fetch('/n8n-api/workflows', {
        headers: { 'X-N8N-API-KEY': n8nConfig.apiKey }
      })
      if (!response.ok) throw new Error('Failed to fetch workflows')
      const data = await response.json()

      const n8nAgents = data.data.map(wf => ({
        id: `n8n-${wf.id}`,
        name: wf.name,
        status: wf.active ? 'Online' : 'Offline',
        lastActive: 'Synced',
        type: 'n8n Workflow',
        nodes: wf.nodes?.length || 0,
        origin: 'n8n',
        rawId: wf.id,
        webhookPath: wf.nodes?.find(n => n.type === 'n8n-nodes-base.webhook')?.parameters?.path
      }))

      setAgents(prev => {
        const nonN8n = prev.filter(a => a.origin !== 'n8n')
        const manual = prev.filter(a => a.origin === 'Manual')
        return [...nonN8n, ...n8nAgents]
      })

      setN8nStatus('Connected')
    } catch (err) {
      setN8nStatus('Error')
      addLog(`n8n Sync Error: ${err.message}`)
    }
  }, [n8nConfig])

  useEffect(() => {
    syncN8n()
    const int = setInterval(syncN8n, 60000)
    return () => clearInterval(int)
  }, [syncN8n])

  const fetchLatestExecution = async (agent) => {
    if (agent.origin !== 'n8n') return
    try {
      const resp = await fetch(`/n8n-api/executions?workflowId=${agent.rawId}&limit=1`, {
        headers: { 'X-N8N-API-KEY': n8nConfig.apiKey }
      })
      if (!resp.ok) return
      const data = await resp.json()
      if (data.data?.length > 0) {
        const executionId = data.data[0].id
        // Fetch full execution details if needed, for now just the basic data
        setExecutionResults(prev => ({ ...prev, [agent.id]: data.data[0] }))
      }
    } catch (err) {
      console.error('Failed to fetch execution', err)
    }
  }

  const executeWorkflow = async (agent) => {
    if (!agent.webhookPath) {
      addToast('No Webhook path configured for this agent', 'warning')
      return
    }

    setIsRunning(true)
    addLog(`Initiating workflow: ${agent.name}`)
    addToast(`Triggering ${agent.name}...`, 'info')

    try {
      const resp = await fetch(`/n8n-webhook/${agent.webhookPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredFrom: 'AgentDashboard', timestamp: new Date().toISOString() })
      })

      if (!resp.ok) throw new Error('Trigger failed')

      const result = await resp.json()
      addLog(`Workflow ${agent.name} executed successfully.`)
      addToast(`${agent.name} ran successfully`, 'success')

      // Wait a moment for n8n to process and then fetch the result from executions API
      setTimeout(() => fetchLatestExecution(agent), 2000)
    } catch (err) {
      addLog(`Execution Error: ${err.message}`)
      addToast(`Execution Failed: ${agent.name}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }

  const toggleAgent = async (id) => {
    const agent = agents.find(a => a.id === id)
    if (agent.origin === 'n8n') {
      const action = agent.status === 'Online' ? 'deactivate' : 'activate'
      try {
        const resp = await fetch(`/n8n-api/workflows/${agent.rawId}/${action}`, {
          method: 'POST',
          headers: { 'X-N8N-API-KEY': n8nConfig.apiKey }
        })
        if (!resp.ok) throw new Error(`Failed to ${action} workflow`)
        addToast(`${agent.name} ${action}d`, 'success')
        syncN8n()
      } catch (err) {
        addToast(`n8n Error: ${err.message}`, 'error')
      }
      return
    }
    setAgents(prev => prev.map(a => {
      if (a.id === id) {
        const newStatus = a.status === 'Online' ? 'Offline' : 'Online'
        addLog(`Agent "${a.name}" changed to ${newStatus}.`)
        addToast(`${a.name} is now ${newStatus}`, newStatus === 'Online' ? 'success' : 'warning')
        return { ...a, status: newStatus, lastActive: 'Now' }
      }
      return a
    }))
  }

  // Mock Stats
  useEffect(() => {
    const interval = setInterval(() => {
      const newCpu = Math.floor(Math.random() * 15) + 5
      const newMem = Math.floor(Math.random() * 5) + 40
      setStats(prev => ({ ...prev, cpu: newCpu, mem: newMem }))
      setChartData(prev => [...prev.slice(-9), { time: new Date().toLocaleTimeString().split(' ')[0].split(':')[1] + 's', cpu: newCpu, mem: newMem }])
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const DrillDownView = () => {
    if (!selectedAgent) return null
    const result = executionResults[selectedAgent.id]

    return (
      <div className="drilldown-overlay" onClick={() => setSelectedAgent(null)}>
        <div className="drilldown-modal card fade-in" onClick={e => e.stopPropagation()}>
          <div className="drilldown-header">
            <div>
              <span className="agent-type">{selectedAgent.type}</span>
              <h2>{selectedAgent.name}</h2>
            </div>
            <button className="btn-close" onClick={() => setSelectedAgent(null)}>✕</button>
          </div>

          <div className="drilldown-grid">
            <div className="drilldown-main">
              <div className="stats-row">
                <div className="stat-box">
                  <label>Health Score</label>
                  <div className="value" style={{ color: 'var(--status-online)' }}>98%</div>
                </div>
                <div className="stat-box">
                  <label>Status</label>
                  <div className={`value ${selectedAgent.status === 'Online' ? 'online' : 'offline'}`}>{selectedAgent.status}</div>
                </div>
                <div className="stat-box">
                  <label>Webhook</label>
                  <div className="value" style={{ fontSize: '0.9rem', opacity: 0.7 }}>{selectedAgent.webhookPath || 'None'}</div>
                </div>
              </div>

              <div className="results-section">
                <div className="section-header">
                  <h3>Latest Execution Results</h3>
                  <button className="btn btn-primary" disabled={isRunning} onClick={() => executeWorkflow(selectedAgent)}>
                    {isRunning ? 'Running...' : 'Execute Now'}
                  </button>
                </div>

                <div className="result-viewer">
                  {result ? (
                    <div className="json-container">
                      <div className="json-header">
                        <span>ID: {result.id}</span>
                        <span className={`status-text ${result.status}`}>{result.status}</span>
                        <span>{new Date(result.startedAt).toLocaleString()}</span>
                      </div>
                      <pre className="json-block">
                        {JSON.stringify(result.data || result, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="empty-results">
                      <p>No recent execution results found for this agent.</p>
                      <button className="btn-text" onClick={() => fetchLatestExecution(selectedAgent)}>Refresh Results</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="drilldown-sidebar">
              <h3>Agent Config</h3>
              <div className="config-item">
                <label>Origin</label>
                <span>{selectedAgent.origin}</span>
              </div>
              <div className="config-item">
                <label>Workflow ID</label>
                <span>{selectedAgent.rawId || 'N/A'}</span>
              </div>
              <div className="config-item">
                <label>Webhook Path</label>
                <input
                  type="text"
                  value={selectedAgent.webhookPath || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, webhookPath: val } : a))
                    setSelectedAgent(prev => ({ ...prev, webhookPath: val }))
                  }}
                  className="config-input"
                  placeholder="e.g. triggered-by-dashboard"
                />
              </div>
              <button className={`btn ${selectedAgent.status === 'Online' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleAgent(selectedAgent.id)}>
                {selectedAgent.status === 'Online' ? 'Stop Agent' : 'Start Agent'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const DashboardView = () => (
    <>
      <header className="main-header">
        <div>
          <h1>Mission Control</h1>
          <div className="n8n-badge">
            <div className={`status-dot ${n8nStatus === 'Connected' ? 'online' : 'error'}`} />
            n8n: {n8nStatus}
          </div>
        </div>
        <div className="header-actions">
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={(e) => {
            const files = Array.from(e.target.files)
            files.forEach(file => {
              const reader = new FileReader()
              reader.onload = (e) => {
                const json = JSON.parse(e.target.result)
                setAgents(prev => [...prev, { id: Date.now(), name: json.name || file.name, status: 'Offline', type: 'Workflow', nodes: json.nodes?.length || 0, origin: 'JSON' }])
                addToast(`Imported ${file.name}`, 'success')
              }
              reader.readAsText(file)
            })
          }} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>Import JSON</button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ New Agent</button>
        </div>
      </header>

      <section className="agent-grid">
        {agents.map((agent) => (
          <div key={agent.id} className="card agent-card fade-in" onClick={() => setSelectedAgent(agent)}>
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
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent) }}>Results</button>
              <button className={`btn-action ${agent.status === 'Online' ? 'stop' : 'start'}`} onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id) }}>
                {agent.status === 'Online' ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  )

  const ListView = (type) => {
    const list = agents.filter(a => type === 'Workflows' ? (a.origin === 'JSON' || a.origin === 'n8n') : a.origin === 'Manual')
    return (
      <div className="list-view fade-in">
        <h1>{type} Management</h1>
        <div className="list-container card">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Status</th><th>Type</th><th>Nodes</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} onClick={() => setSelectedAgent(a)} style={{ cursor: 'pointer' }}>
                  <td>{a.name}</td>
                  <td><span className={`status-text ${a.status.toLowerCase()}`}>{a.status}</span></td>
                  <td>{a.origin}</td>
                  <td>{a.nodes}</td>
                  <td><button className="btn-text" onClick={(e) => { e.stopPropagation(); toggleAgent(a.id) }}>Toggle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const SettingsView = () => (
    <div className="settings-view fade-in">
      <h1>Instance Configuration</h1>
      <div className="card settings-container">
        <div className="form-group">
          <label>n8n API Key</label>
          <input type="password" value={n8nConfig.apiKey} onChange={e => setN8nConfig(p => ({ ...p, apiKey: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>n8n Host URL</label>
          <input type="text" value={n8nConfig.url} onChange={e => setN8nConfig(p => ({ ...p, url: e.target.value }))} />
        </div>
        <button className="btn btn-primary" onClick={syncN8n}>Sync n8n Instance</button>
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast toast-${t.type} fade-in`}>{t.message}</div>)}</div>

      <aside className="sidebar">
        <div className="brand" onClick={() => setActiveView('Dashboard')} style={{ cursor: 'pointer' }}><div className="logo-icon" /><h2>Agent Manager</h2></div>
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h2>Create New Agent</h2>
            <form onSubmit={e => {
              e.preventDefault()
              const name = e.target.name.value
              setAgents(prev => [...prev, { id: Date.now(), name, status: 'Offline', lastActive: 'New', type: 'Agent', nodes: 0, origin: 'Manual' }])
              addToast(`Agent ${name} created`, 'success')
              setIsModalOpen(false)
            }}>
              <div className="form-group"><label>Agent Name</label><input name="name" type="text" autoFocus /></div>
              <div className="modal-actions"><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedAgent && DrillDownView()}
    </div>
  )
}

export default App
