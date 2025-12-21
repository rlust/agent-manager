# Agent Manager Dashboard (Mission Control)

A professional-grade, high-end "Mission Control" interface for orchestrating, monitoring, and managing AI agents and workflows. Built with React and Vite, featuring a sleek dark-mode aesthetic with glassmorphism and real-time data visualization.

![Agent Manager Dashboard](/Users/randylust/.gemini/antigravity/brain/3abdaad1-4d56-45ca-b63e-9d7a09472b18/final_dashboard_test_1766336883389.png)

## 🚀 Features

- **Advanced Data Viz**: Real-time **Performance Trends** charts (using `recharts`) visualizing CPU and RAM utilization.
- **Interactive Control Center**: 
    - Full **Start/Stop** lifecycle management for agents.
    - **Live Console** with real-time logging and built-in **Search/Filter** capabilities.
    - **Toast Notifications** for status changes and system alerts.
- **Dynamic Workflow Integration**: 
    - **Import Button**: Upload n8n `.json` files directly.
    - **Drag & Drop**: Direct import into the agent grid via file drop.
- **Persistence Layer**: All imported agents and system logs are saved to `localStorage`, ensuring they persist across browser reloads.
- **Premium Aesthetics**: Sleek dark-mode UI with glassmorphism effects, tailored gradients, and smooth micro-animations.

## 🛠 Tech Stack

- **Core**: React 18, Vite
- **Visualization**: Recharts
- **Styling**: Vanilla CSS (Custom tokens)
- **Deployment/Source**: GitHub

## 📥 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rlust/agent-manager.git
   cd agent-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open the application**:
   Navigate to `http://localhost:5173/` (or the port shown in your terminal).

## 🖥 Usage

- **Adding Agents**: Click "Import JSON" or drag an n8n `.json` file anywhere on the dashboard.
- **Managing Agents**: Use the "Start/Stop" buttons to toggle agent status. Activity is logged automatically in the Live Console.
- **Monitoring Health**: Watch the Performance Trends chart and the System Health sidebar for real-time resource tracking.
- **Filtering Logs**: Use the search bar in the Live Console to find specific events by keyword or agent name.

## 📄 License

This project is open-source and available under the MIT License.
