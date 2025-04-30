import React, { useState } from 'react';
import './App.css';
import StockGrid from './components/stocks/StockGrid';
import SimulationControl from './components/layout/SimulationControl';
import PositionForm from './components/positions/PositionForm';
import PositionList from './components/positions/PositionList';
import Admin from './components/layout/Admin';
import Modal from './components/layout/Modal';
import useUserStore from './store/userStore';
import { User } from './types';

function App() {
  const { users, selectedUser, selectUser, fetchUsers } = useUserStore();
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  // Ensure we have users loaded
  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-400 py-4 px-6 shadow-md">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-300">Virtual Trading Game</h1>
            
            <div className="flex items-center space-x-4">
              <select 
                className="bg-dark-300 border border-dark-200 rounded px-3 py-1.5"
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const userId = Number(e.target.value);
                  selectUser(users.find(u => u.id === userId) || null);
                }}
              >
                <option value="">Select Trader</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowTradingPanel(!showTradingPanel)}
                className={`px-4 py-2 rounded-md ${
                  showTradingPanel 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-primary-600 hover:bg-primary-500'
                } transition-colors`}
              >
                {showTradingPanel ? 'Hide Trading Panel' : 'Show Trading Panel'}
              </button>
              
              <button 
                onClick={() => setShowAdminModal(true)}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded-md transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <SimulationControl />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className={`lg:col-span-${showTradingPanel ? '3' : '4'}`}>
            <StockGrid />
          </div>
          
          {showTradingPanel && (
            <div className="space-y-6">
              <PositionForm onComplete={() => {
                // Refresh user positions when a position is created
                if (selectedUser) {
                  selectUser(selectedUser);
                }
              }} />
              
              {selectedUser && (
                <div>
                  <h2 className="text-xl font-bold mb-4">{selectedUser.name}'s Positions</h2>
                  <PositionList onlyOpen={true} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="bg-dark-400 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          Virtual Trading Game &copy; {new Date().getFullYear()} - A stock market simulator for educational purposes
        </div>
      </footer>
      
      {/* Admin Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        maxWidth="max-w-7xl"
      >
        <Admin 
          isOpen={showAdminModal} 
          onClose={() => setShowAdminModal(false)} 
        />
      </Modal>
    </div>
  );
}

export default App;
