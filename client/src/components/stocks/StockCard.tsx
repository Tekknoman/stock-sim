import React, { useState, useEffect } from 'react';
import { Stock, Position } from '../../types';
import { AreaChart, Area, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import usePositionStore from '../../store/positionStore';
import useStockStore from '../../store/stockStore';
import useUserStore from '../../store/userStore';
import socketService from '../../services/socket';
import UserChip from '../users/UserChip';

interface StockCardProps {
  stock: Stock;
  onClick?: (stockId: number) => void;
  className?: string;
}

const StockCard: React.FC<StockCardProps> = ({ stock, onClick, className }) => {
  const [stockPositions, setStockPositions] = useState<Position[]>([]);
  const [userPositions, setUserPositions] = useState<Position[]>([]);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPositionsOnGraph, setShowPositionsOnGraph] = useState(false);
  const [chartData, setChartData] = useState<{ value: number, timestamp: string }[]>([]);
  const [sellingPosition, setSellingPosition] = useState<Position | null>(null);
  const [sellConfirmOpen, setSellConfirmOpen] = useState(false);
  const [sellSuccess, setSellSuccess] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  
  const { getPositionsForStock, closePosition } = usePositionStore();
  const { getStockHistory } = useStockStore();
  const { selectedUser, userPositions: allUserPositions } = useUserStore();

  // Load real chart data instead of simulated data
  useEffect(() => {
    const loadChartData = async () => {
      setIsChartLoading(true);
      try {
        // Get the last 20 price points
        const history = await getStockHistory(stock.id, 20);
        if (history && history.length > 0) {
          const formattedData = history
            .map(point => ({
              value: point.price,
              timestamp: new Date(point.timestamp).toISOString(),
              formattedTime: new Date(point.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          setChartData(formattedData);
        } else {
          // Fallback to simulated data if API returns empty
          const simulatedData = Array.from({ length: 20 }, (_, i) => {
            const date = new Date();
            date.setMinutes(date.getMinutes() - (20 - i));
            return {
              value: stock.base_value * (1 + (Math.random() * 0.4 - 0.2)),
              timestamp: date.toISOString(),
              formattedTime: date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            };
          });
          setChartData(simulatedData);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        // Fallback to simulated data on error
        const simulatedData = Array.from({ length: 20 }, () => ({
          value: stock.base_value * (1 + (Math.random() * 0.4 - 0.2)),
          timestamp: new Date().toISOString(),
          formattedTime: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }));
        setChartData(simulatedData);
      } finally {
        setIsChartLoading(false);
      }
    };

    loadChartData();

    // Subscribe to real-time updates
    socketService.connect();
    const handlePriceUpdate = (updates: any[]) => {
      const stockUpdate = updates.find(update => update.id === stock.id);
      if (stockUpdate) {
        // Update chart with new price point
        const now = new Date();
        setChartData(prev => {
          // Add new price point
          const newPoint = {
            value: stockUpdate.current_price,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString([], {
              hour: '2-digit', 
              minute: '2-digit'
            })
          };
          
          // Keep only the last 20 points
          const updated = [...prev, newPoint].slice(-20);
          return updated;
        });
      }
    };
    socketService.onPriceUpdate(handlePriceUpdate);

    // Cleanup
    return () => {
      socketService.removeListener('prices:update', handlePriceUpdate);
    };
  }, [stock.id, stock.base_value, getStockHistory]);

  // Calculate price change
  useEffect(() => {
    const change = stock.current_price - stock.base_value;
    const percentChange = (change / stock.base_value) * 100;
    setPriceChange({ value: change, percent: percentChange });
  }, [stock.current_price, stock.base_value]);

  // Load positions for this stock
  useEffect(() => {
    const loadPositions = async () => {
      const positions = await getPositionsForStock(stock.id);
      setStockPositions(positions);
    };
    loadPositions();

    // Subscribe to position changes
    const positionUpdateInterval = setInterval(loadPositions, 10000);
    
    return () => {
      clearInterval(positionUpdateInterval);
    };
  }, [stock.id, getPositionsForStock]);

  // Filter user positions for this stock
  useEffect(() => {
    if (selectedUser) {
      const positions = allUserPositions.filter(
        p => p.stock_id === stock.id && p.is_open
      );
      setUserPositions(positions);
    } else {
      setUserPositions([]);
    }
  }, [selectedUser, allUserPositions, stock.id]);

  // Get trend indicator
  const getTrendIndicator = () => {
    if (priceChange.percent > 0) return "📈";
    if (priceChange.percent < 0) return "📉";
    return "";
  };

  // Get any special status indicators
  const getStatusIndicators = () => {
    const indicators = [];
    
    // High demand indicator
    if (stockPositions.length > 5) {
      indicators.push("🧲");
    }
    
    // Buff/nerf active indicator
    if (stock.buff_value !== 0) {
      indicators.push("🔧");
    }
    
    return indicators;
  };

  const handleClick = () => {
    if (onClick && !sellConfirmOpen) {
      onClick(stock.id);
    } else {
      setIsExpanded(!isExpanded);
    }
  };
  
  const handleSellClick = (position: Position, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion/click
    setSellingPosition(position);
    setSellConfirmOpen(true);
  };
  
  const handleConfirmSell = async () => {
    if (!sellingPosition) return;
    
    try {
      await closePosition(sellingPosition.id);
      const profit = (stock.current_price - sellingPosition.open_price) * sellingPosition.amount;
      setSellSuccess(`Sold ${sellingPosition.amount} shares for ${profit.toFixed(2)} profit`);
      
      // Force refresh positions after selling
      const updatedPositions = await getPositionsForStock(stock.id);
      setStockPositions(updatedPositions);
      
      // Update user positions
      if (selectedUser) {
        const positions = allUserPositions.filter(
          p => p.stock_id === stock.id && p.is_open && p.id !== sellingPosition.id
        );
        setUserPositions(positions);
      }
      
      setTimeout(() => setSellSuccess(null), 3000);
    } catch (err) {
      console.error('Error selling position:', err);
    } finally {
      setSellConfirmOpen(false);
      setSellingPosition(null);
    }
  };
  
  const handleCancelSell = () => {
    setSellConfirmOpen(false);
    setSellingPosition(null);
  };

  // Custom tooltip for the chart that shows position values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-400 p-2 border border-dark-100 rounded shadow-md">
          <p className="text-xs">${payload[0].value.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{payload[0].payload.formattedTime}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={`stock-card cursor-pointer bg-dark-300 p-4 rounded-lg ${className || ''}`} 
      style={{ borderLeft: `4px solid ${stock.color || '#6b7280'}` }}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            {stock.icon_url && (
              <img 
                src={stock.icon_url} 
                alt={stock.name} 
                className="w-8 h-8 mr-2 rounded"
              />
            )}
            <h3 className="text-lg font-bold">{stock.name}</h3>
          </div>
          
          <div className="flex items-baseline mt-1">
            <span className="text-xl font-semibold">
              ${stock.current_price.toFixed(2)}
            </span>
            <span className={`ml-2 text-sm ${priceChange.percent >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
              {priceChange.value > 0 && '+'}{priceChange.value.toFixed(2)} ({priceChange.percent > 0 && '+'}{priceChange.percent.toFixed(2)}%)
              <span className="trend-icon">{getTrendIndicator()}</span>
            </span>
          </div>
        </div>
        
        <div className="flex">
          {getStatusIndicators().map((indicator, index) => (
            <span key={index} className="text-xl ml-1">{indicator}</span>
          ))}
          
          {userPositions.length > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPositionsOnGraph(!showPositionsOnGraph);
              }}
              className={`ml-2 px-2 py-1 text-xs rounded ${showPositionsOnGraph ? 'bg-primary-600' : 'bg-dark-100'}`}
              title="Toggle position values on graph"
            >
              👁️
            </button>
          )}
        </div>
      </div>
      
      {/* Sell confirmation modal */}
      {sellConfirmOpen && sellingPosition && (
        <div className="absolute inset-0 bg-dark-400/90 z-10 flex items-center justify-center" onClick={handleCancelSell}>
          <div className="bg-dark-300 p-4 rounded-lg shadow-lg max-w-sm mx-auto" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-3">Confirm Sale</h4>
            <p className="mb-3">
              Sell {sellingPosition.amount} shares of {stock.name} at ${stock.current_price.toFixed(2)}?
            </p>
            <div className="bg-dark-400 p-2 rounded mb-3 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span>Purchase price:</span>
                <span>${sellingPosition.open_price.toFixed(2)}</span>
                <span>Current price:</span>
                <span>${stock.current_price.toFixed(2)}</span>
                <span>Shares:</span>
                <span>{sellingPosition.amount}</span>
                <span className="font-bold">Profit/Loss:</span>
                <span className={`font-bold ${stock.current_price > sellingPosition.open_price ? 'text-stock-up' : 'text-stock-down'}`}>
                  ${((stock.current_price - sellingPosition.open_price) * sellingPosition.amount).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-3 py-1 bg-dark-100 rounded hover:bg-dark-200" 
                onClick={handleCancelSell}
              >
                Cancel
              </button>
              <button 
                className="px-3 py-1 bg-primary-600 rounded hover:bg-primary-500" 
                onClick={handleConfirmSell}
              >
                Confirm Sell
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success notification */}
      {sellSuccess && (
        <div className="absolute top-2 right-2 bg-green-900/80 text-green-100 p-2 rounded z-20 animate-fade-in-out">
          {sellSuccess}
        </div>
      )}
      
      <div className="mini-chart h-24 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          {isChartLoading ? (
            <div className="flex justify-center items-center h-full w-full bg-dark-400/50 rounded">
              <div className="text-xs text-gray-300">Loading chart...</div>
            </div>
          ) : (
            <AreaChart data={chartData}>
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={priceChange.percent >= 0 ? '#10b981' : '#ef4444'} 
                fill={priceChange.percent >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 
                strokeWidth={1.5}
              />
              
              {/* Show user position values on graph if toggle is active */}
              {showPositionsOnGraph && userPositions.map((position) => (
                <ReferenceLine 
                  key={position.id}
                  y={position.open_price} 
                  stroke="#60a5fa" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `${position.amount} @ $${position.open_price.toFixed(2)}`,
                    position: 'insideBottomRight',
                    fill: '#60a5fa',
                    fontSize: 10
                  }} 
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {/* User positions with sell buttons */}
      {userPositions.length > 0 && (
        <div className="mt-3 border-t border-dark-100 pt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Your Positions</span>
            <span className="text-xs text-gray-400">{userPositions.length} position(s)</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {userPositions.map(position => {
              const profit = (stock.current_price - position.open_price) * position.amount;
              const profitPercent = ((stock.current_price - position.open_price) / position.open_price) * 100;
              return (
                <div key={position.id} className="flex justify-between items-center text-xs py-1 px-2 bg-dark-200 rounded">
                  <div>
                    <div>{position.amount} shares @ ${position.open_price.toFixed(2)}</div>
                    <div className={profit >= 0 ? 'text-stock-up' : 'text-stock-down'}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(2)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleSellClick(position, e)}
                    className="ml-2 px-2 py-1 bg-dark-100 hover:bg-dark-100/60 rounded transition-colors"
                  >
                    Sell
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Other users' positions */}
      {stockPositions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {stockPositions.slice(0, 5).map(position => (
            <UserChip 
              key={position.id} 
              name={position.user_name || ''} 
              iconUrl={position.user_icon || undefined}
              tooltipContent={`${position.amount} shares @ $${position.open_price.toFixed(2)}`}
            />
          ))}
          {stockPositions.length > 5 && (
            <span className="text-xs text-gray-400 self-center ml-1">
              +{stockPositions.length - 5} more
            </span>
          )}
        </div>
      )}
      
      {isExpanded && !onClick && (
        <div className="mt-2 pt-2 border-t border-dark-100">
          <div className="flex justify-between text-sm text-gray-300">
            <div>Volatility: {stock.volatility}</div>
            <div>Base value: ${stock.base_value.toFixed(2)}</div>
          </div>
          
          {stockPositions.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-400 mb-1">Top positions:</p>
              <div className="max-h-32 overflow-y-auto">
                {stockPositions.slice(0, 10).map(position => {
                  const positionPL = typeof position.profit_loss === 'number' ? position.profit_loss : 0;
                  return (
                    <div key={position.id} className="flex justify-between text-sm py-1">
                      <span>{position.user_name}</span>
                      <span className={positionPL >= 0 ? 'text-stock-up' : 'text-stock-down'}>
                        {position.amount} shares | {positionPL > 0 && '+'}{positionPL.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* <div className="mt-2 flex justify-end">
            <button 
              className="px-3 py-1 bg-primary-700 text-sm rounded hover:bg-primary-600"
              onClick={(e) => {
                e.stopPropagation();
                onClick && onClick(stock.id);
              }}
            >
              View Details
            </button>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default StockCard;