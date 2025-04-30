import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Stock as StockType, PriceHistoryPoint } from '../../types';
import useStockStore from '../../store/stockStore';

interface StockViewProps {
  stockId: number;
  onClose?: () => void;
}

const Stock: React.FC<StockViewProps> = ({ stockId, onClose }) => {
  const { stocks } = useStockStore();
  const stock = stocks.find(s => s.id === stockId);
  const { getStockHistory } = useStockStore();
  
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch price history for the stock
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const history = await getStockHistory(stockId, 100);
        setPriceHistory(history);
      } catch (err) {
        console.error('Error fetching stock history:', err);
        setError('Failed to load price history');
      } finally {
        setLoading(false);
      }
    };

    if (stockId) {
      fetchHistory();
    }
  }, [stockId, getStockHistory]);

  if (!stock) {
    return (
      <div className="bg-dark-300 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Stock not found</h2>
        <button 
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-500"
          onClick={onClose}
        >
          Back to Stocks
        </button>
      </div>
    );
  }

  // Transform data for chart
  const chartData = priceHistory.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString(),
    price: point.price
  })).reverse();

  return (
    <div className="bg-dark-300 p-6 rounded-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center">
            {stock.icon_url && (
              <img 
                src={stock.icon_url} 
                alt={stock.name} 
                className="w-10 h-10 mr-3 rounded"
              />
            )}
            <h2 className="text-2xl font-bold">{stock.name}</h2>
          </div>
          
          <div className="mt-2 text-xl">
            <span className="font-semibold">${stock.current_price.toFixed(2)}</span>
            <span className={`ml-2 ${stock.current_price >= stock.base_value ? 'text-stock-up' : 'text-stock-down'}`}>
              {stock.current_price >= stock.base_value ? '+' : ''}
              {(stock.current_price - stock.base_value).toFixed(2)} 
              ({((stock.current_price - stock.base_value) / stock.base_value * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <button 
          className="px-3 py-1 bg-dark-100 hover:bg-dark-200 rounded"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <div>Volatility: {stock.volatility}</div>
          <div>Base value: ${stock.base_value.toFixed(2)}</div>
        </div>
        
        <div className="h-80 bg-dark-400 rounded-lg p-4">
          {loading ? (
            <div className="h-full flex justify-center items-center">
              <div className="animate-pulse text-primary-400">Loading chart data...</div>
            </div>
          ) : error ? (
            <div className="h-full flex justify-center items-center text-red-400">
              {error}
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#4B5563' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#4B5563' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    borderColor: '#374151',
                    color: 'white'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke={stock.color || '#0EA5E9'} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex justify-center items-center text-gray-400">
              No price history available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-400 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Stock Information</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-gray-400">Base Value:</td>
                <td className="py-1">${stock.base_value.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Current Price:</td>
                <td className="py-1">${stock.current_price.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Volatility:</td>
                <td className="py-1">{stock.volatility}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Color Theme:</td>
                <td className="py-1">
                  <div 
                    className="w-4 h-4 inline-block rounded-full mr-2"
                    style={{ backgroundColor: stock.color || '#6b7280' }}
                  ></div>
                  {stock.color}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Buff/Nerf:</td>
                <td className={`py-1 ${stock.buff_value > 0 ? 'text-stock-up' : stock.buff_value < 0 ? 'text-stock-down' : ''}`}>
                  {stock.buff_value > 0 && '+'}
                  {stock.buff_value.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-dark-400 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Market Activity</h3>
          <p className="text-gray-300">
            Trading activity affects this stock's price. Higher demand will increase the price over time.
          </p>
          
          <div className="mt-4 pt-4 border-t border-dark-300">
            <div className="text-sm text-gray-400">
              Created on: {new Date(stock.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stock;