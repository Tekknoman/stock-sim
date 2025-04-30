import React, { useEffect, useState } from 'react';
import useSimulationStore from '../../store/simulationStore';
import socketService from '../../services/socket';
import { PlayIcon, PauseIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const SimulationControl: React.FC = () => {
  const { 
    status, 
    fetchStatus, 
    startSimulation, 
    stopSimulation, 
    updateInterval
  } = useSimulationStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  
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

  const togglePanel = () => {
    setIsPanelVisible(!isPanelVisible);
  };
  
  return (
    <div className="bg-dark-400 rounded-lg shadow-lg overflow-hidden">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <h3 className="text-xl font-bold mr-4">Simulation Control</h3>
          {status.isRunning ? (
            <span className="text-green-400 text-sm flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Running
            </span>
          ) : (
            <span className="text-red-400 text-sm flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Paused
            </span>
          )}
        </div>
        
        <button
          onClick={togglePanel}
          className="text-gray-400 hover:text-white p-1"
          aria-label={isPanelVisible ? "Hide simulation controls" : "Show simulation controls"}
        >
          {isPanelVisible ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {isPanelVisible && (
        <div className="p-4 pt-0 border-t border-dark-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <button
                onClick={handleToggleSimulation}
                className={`flex-1 py-2 px-4 rounded flex items-center justify-center ${
                  status.isRunning
                    ? 'bg-red-700 hover:bg-red-600'
                    : 'bg-green-700 hover:bg-green-600'
                } transition-colors ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : status.isRunning ? (
                  <>
                    <PauseIcon className="h-5 w-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Start
                  </>
                )}
              </button>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex flex-col">
                <label htmlFor="updateInterval" className="mb-2 text-sm text-gray-300">
                  Update Interval:
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-xs">Fast</span>
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
                  <span className="text-xs">Slow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationControl;