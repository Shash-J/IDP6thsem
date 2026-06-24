import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';

/**
 * Root Application Component
 * Manages layout with responsive sidebar and header.
 * Sidebar is overlay-only on all screen sizes to avoid content obstruction.
 */
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex min-h-screen">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'toast-custom',
          duration: 4000,
          style: {
            background: '#1a1f35',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
          },
        }}
      />

      {/* Sidebar — overlay on all screen sizes */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content — always full width */}
      <div className="flex-1 flex flex-col min-h-screen w-full">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {activeTab === 'dashboard' ? <Dashboard /> : <Predictions />}
        </main>
      </div>
    </div>
  );
}

export default App;
