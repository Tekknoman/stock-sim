import React, { useState } from 'react';
import { Position } from '../../types';
import usePositionStore from '../../store/positionStore';
import useUserStore from '../../store/userStore';
import useStockStore from '../../store/stockStore';

interface PositionListProps {
  userId?: number;
  onlyOpen?: boolean;
  onSellPosition?: (position: Position, price: number) => void;
}

const PositionList: React.FC<PositionListProps> = ({ userId, onlyOpen = true, onSellPosition }) => {
  const { userPositions } = useUserStore();
  const { stocks } = useStockStore();
  const { closePosition } = usePositionStore();
  const [closingPositionId, setClosingPositionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter positions based on props
  const positions = userPositions.filter(pos => {
    if (onlyOpen && !pos.is_open) return false;
    return true;
  });

  const handleClosePosition = async (position: Position) => {
    if (!position.is_open) return;

    setClosingPositionId(position.id);
    setError(null);
    setSuccess(null);

    try {
      await closePosition(position.id);
      
      // Get current price from stocks
      const stock = stocks.find(s => s.id === position.stock_id);
      const currentPrice = stock?.current_price || position.close_price || 0;
      
      setSuccess(`Successfully sold ${position.amount} shares of ${position.stock_name}`);
      
      // Call callback if provided
      if (onSellPosition) {
        onSellPosition(position, currentPrice);
      }
    } catch (err) {
      console.error('Error closing position:', err);
      setError('Failed to close position');
    } finally {
      setClosingPositionId(null);
    }
  };

  if (positions.length === 0) {
    return (
      <div className="bg-dark-300 p-6 rounded-lg text-center">
        <p className="text-gray-400">No positions found</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-300 p-6 rounded-lg">
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded p-3 mb-4 text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-800 rounded p-3 mb-4 text-green-200">
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-dark-100">
            <tr>
              <th className="pb-2 text-left">Stock</th>
              <th className="pb-2 text-right">Shares</th>
              <th className="pb-2 text-right">Bought At</th>
              <th className="pb-2 text-right">Current</th>
              <th className="pb-2 text-right">P/L</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map(position => {
              const currentPrice = position.current_price || 0;
              const boughtPrice = position.open_price;
              const profitLoss = position.profit_loss || (currentPrice - boughtPrice) * position.amount;
              const profitLossPercent = ((currentPrice - boughtPrice) / boughtPrice) * 100;
              
              const isPositive = profitLoss >= 0;
              
              return (
                <tr key={position.id} className="border-b border-dark-100 hover:bg-dark-200">
                  <td className="py-3 text-left">
                    <div className="font-medium">{position.stock_name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(position.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 text-right">{position.amount}</td>
                  <td className="py-3 text-right">${boughtPrice.toFixed(2)}</td>
                  <td className="py-3 text-right">${currentPrice.toFixed(2)}</td>
                  <td className={`py-3 text-right ${isPositive ? 'text-stock-up' : 'text-stock-down'}`}>
                    <div>{isPositive && '+'}{profitLoss.toFixed(2)}</div>
                    <div className="text-xs">({isPositive && '+'}{profitLossPercent.toFixed(2)}%)</div>
                  </td>
                  <td className="py-3 text-right">
                    {position.is_open ? (
                      <button
                        className="bg-dark-100 hover:bg-dark-100/60 px-3 py-1 rounded text-sm transition-colors"
                        onClick={() => handleClosePosition(position)}
                        disabled={closingPositionId === position.id}
                      >
                        {closingPositionId === position.id ? 'Selling...' : 'Sell'}
                      </button>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-dark-400 rounded">Closed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PositionList;