import React, { useEffect, useState } from 'react';
import useSimulationStore from '../../store/simulationStore';
import socketService from '../../services/socket';

const SimulationControl: React.FC = () => {
  const { 
    status, 
    fetchStatus, 
    startSimulation, 
    stopSimulation, 
    updateInterval
  } = useSimulationStore();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch simulation status on component mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);
  
  // Listen for simulation state changes via socket
  useEffect(() => {
    socketService.connect();
    
    socketService.onSimulationState(state => {
      // Update local state when the simulation state changes
      fetchStatus();
    });
    
    return () => {
      // No need to disconnect here as other components might still need the socket
    };
  }, [fetchStatus]);
  
  const handleIntervalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newInterval = parseInt(e.target.value, 10);
    setIsUpdating(true);
    await updateInterval(newInterval);
    setIsUpdating(false);
  };
  
  const handleToggleSimulation = async () => {
    setIsUpdating(true);
    if (status.isRunning) {
      await stopSimulation();
    } else {
      await startSimulation();
    }
    setIsUpdating(false);
  };
  
  return (
    <div className="bg-dark-300 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-primary-300">Simulation Control</h2>
      
      <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6">
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <div 
              className={`w-3 h-3 rounded-full mr-2 ${status.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            />
            <span>Status: {status.isRunning ? 'Running' : 'Stopped'}</span>
          </div>
          
          <button
            className={`px-4 py-2 rounded transition-colors ${
              status.isRunning 
                ? 'bg-red-700 hover:bg-red-600' 
                : 'bg-green-700 hover:bg-green-600'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleToggleSimulation}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : status.isRunning ? 'Stop' : 'Start'} Simulation
          </button>
        </div>
        
        <div className="flex items-center">
          <label htmlFor="interval" className="mr-2">Update Interval:</label>
          <select
            id="interval"
            className="bg-dark-200 border border-dark-100 rounded px-3 py-2"
            value={status.interval}
            onChange={handleIntervalChange}
            disabled={isUpdating}
          >
            <option value="1000">1 second</option>
            <option value="2000">2 seconds</option>
            <option value="3000">3 seconds</option>
            <option value="5000">5 seconds</option>
            <option value="10000">10 seconds</option>
            <option value="30000">30 seconds</option>
            <option value="60000">1 minute</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SimulationControl;