import React, { useEffect, useState } from 'react';
import useSimulationStore from '../../store/simulationStore';
import socketService from '../../services/socket';
import { PlayIcon, PauseIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const SimulationControl: React.FC = () => {
  const { 
    status, 
    settings,
    fetchStatus, 
    fetchSettings,
    startSimulation, 
    stopSimulation, 
    updateInterval,
    updateSettings
  } = useSimulationStore();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    demand_impact_weight: '0.1',
    random_event_chance: '0.05',
    random_event_impact: '0.1',
    volume_decay_rate: '0.002',
    volume_decay_threshold: '24'
  });
  
  // Fetch simulation status on component mount
  useEffect(() => {
    fetchStatus();
    fetchSettings();
  }, [fetchStatus, fetchSettings]);
  
  // Update local settings when fetched from store
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        demand_impact_weight: settings.demand_impact_weight || '0.1',
        random_event_chance: settings.random_event_chance || '0.05',
        random_event_impact: settings.random_event_impact || '0.1',
        volume_decay_rate: settings.volume_decay_rate || '0.002',
        volume_decay_threshold: settings.volume_decay_threshold || '24'
      });
    }
  }, [settings]);
  
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
  
  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveSettings = async () => {
    setIsUpdating(true);
    await updateSettings(localSettings);
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
  
  const toggleAdvanced = () => {
    setIsAdvancedVisible(!isAdvancedVisible);
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

          <div className="mt-4">
            <button 
              onClick={toggleAdvanced}
              className="text-sm text-gray-400 hover:text-white flex items-center"
            >
              {isAdvancedVisible ? (
                <ChevronUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 mr-1" />
              )}
              Advanced Settings
            </button>
            
            {isAdvancedVisible && (
              <div className="mt-3 space-y-4 bg-dark-300 p-4 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Trading Volume Decay Settings */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold border-b border-dark-200 pb-1">Trading Volume Decay</h4>
                    
                    <div>
                      <label htmlFor="volume_decay_rate" className="block text-xs text-gray-400 mb-1">
                        Decay Rate (0.001 - 0.01)
                      </label>
                      <input
                        type="number"
                        id="volume_decay_rate"
                        name="volume_decay_rate"
                        min="0.001"
                        max="0.01"
                        step="0.001"
                        value={localSettings.volume_decay_rate}
                        onChange={handleSettingChange}
                        className="w-full bg-dark-200 border border-dark-100 rounded py-1 px-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Higher values cause inactive stocks to decline faster
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="volume_decay_threshold" className="block text-xs text-gray-400 mb-1">
                        Decay Threshold (hours: 1-72)
                      </label>
                      <input
                        type="number"
                        id="volume_decay_threshold"
                        name="volume_decay_threshold"
                        min="1"
                        max="72"
                        step="1"
                        value={localSettings.volume_decay_threshold}
                        onChange={handleSettingChange}
                        className="w-full bg-dark-200 border border-dark-100 rounded py-1 px-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Hours of inactivity before a stock starts to decay
                      </p>
                    </div>
                  </div>
                  
                  {/* Other Market Settings */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold border-b border-dark-200 pb-1">Market Factors</h4>
                    
                    <div>
                      <label htmlFor="demand_impact_weight" className="block text-xs text-gray-400 mb-1">
                        Demand Impact (0.01 - 0.5)
                      </label>
                      <input
                        type="number"
                        id="demand_impact_weight"
                        name="demand_impact_weight"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={localSettings.demand_impact_weight}
                        onChange={handleSettingChange}
                        className="w-full bg-dark-200 border border-dark-100 rounded py-1 px-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="random_event_chance" className="block text-xs text-gray-400 mb-1">
                        Random Event Chance (0 - 0.2)
                      </label>
                      <input
                        type="number"
                        id="random_event_chance"
                        name="random_event_chance"
                        min="0"
                        max="0.2"
                        step="0.01"
                        value={localSettings.random_event_chance}
                        onChange={handleSettingChange}
                        className="w-full bg-dark-200 border border-dark-100 rounded py-1 px-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="random_event_impact" className="block text-xs text-gray-400 mb-1">
                        Random Event Impact (0 - 0.5)
                      </label>
                      <input
                        type="number"
                        id="random_event_impact"
                        name="random_event_impact"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={localSettings.random_event_impact}
                        onChange={handleSettingChange}
                        className="w-full bg-dark-200 border border-dark-100 rounded py-1 px-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    className={`py-1 px-4 bg-primary-600 hover:bg-primary-500 rounded text-sm ${
                      isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationControl;