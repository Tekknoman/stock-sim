import React, { useState, useEffect } from 'react';
import { Stock, Position } from '../../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import usePositionStore from '../../store/positionStore';
import UserChip from '../users/UserChip';

interface StockCardProps {
  stock: Stock;
  onClick?: (stockId: number) => void;
  className?: string;
}

const StockCard: React.FC<StockCardProps> = ({ stock, onClick, className }) => {
  const [stockPositions, setStockPositions] = useState<Position[]>([]);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartData, setChartData] = useState<{ value: number }[]>([]);
  const { getPositionsForStock } = usePositionStore();

  // Simulate chart data (in real app, this would come from the API)
  useEffect(() => {
    const simulatedData = Array.from({ length: 20 }, (_, i) => ({
      value: stock.base_value * (1 + (Math.random() * 0.4 - 0.2))
    }));
    setChartData(simulatedData);
  }, [stock.base_value]);

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
  }, [stock.id, getPositionsForStock]);

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
    if (onClick) {
      onClick(stock.id);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div 
      className={"stock-card cursor-pointer" + (className || '')} 
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
          {getStatusIndicators().map((indicator, idx) => (
            <span key={idx} className="text-xl ml-1">{indicator}</span>
          ))}
        </div>
      </div>
      
      <div className="mini-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={priceChange.percent >= 0 ? '#10b981' : '#ef4444'} 
              fill={priceChange.percent >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
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
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex justify-between text-sm text-gray-300">
            <div>Volatility: {stock.volatility}</div>
            <div>Base value: ${stock.base_value.toFixed(2)}</div>
          </div>
          
          {stockPositions.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-400 mb-1">Top positions:</p>
              <div className="max-h-32 overflow-y-auto">
                {stockPositions.slice(0, 10).map(position => (
                  <div key={position.id} className="flex justify-between text-sm py-1">
                    <span>{position.user_name}</span>
                    <span className={position.profit_loss && position.profit_loss >= 0 ? 'text-stock-up' : 'text-stock-down'}>
                      {position.amount} shares | {position.profit_loss && position.profit_loss > 0 && '+'}{position.profit_loss?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockCard;