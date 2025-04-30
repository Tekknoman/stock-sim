import React, { useState, useEffect } from 'react';
import { Stock, User, Position } from '../../types';
import useStockStore from '../../store/stockStore';
import useUserStore from '../../store/userStore';
import usePositionStore from '../../store/positionStore';

interface PositionFormProps {
  onComplete?: (position: Position) => void;
}

const PositionForm: React.FC<PositionFormProps> = ({ onComplete }) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get data from stores
  const { stocks, fetchStocks } = useStockStore();
  const { users, fetchUsers, createUser, selectedUser: currentUser } = useUserStore();
  const { createPosition, getPositionById } = usePositionStore();

  // Load stocks and users
  useEffect(() => {
    fetchStocks();
    fetchUsers();
  }, [fetchStocks, fetchUsers]);
  
  // Set selected user to current user when it changes
  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser);
    }
  }, [currentUser]);

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !selectedUser) {
      setError('Please select both a stock and a user');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const positionId = await createPosition(selectedStock.id, selectedUser.id, amount);
      if (positionId > 0) {
        setSuccess(`Successfully bought ${amount} shares of ${selectedStock.name}`);
        setAmount(1);
        
        // Get full position details for callback
        const position = await getPositionById(positionId);
        
        // Call onComplete callback if provided
        if (onComplete && position) {
          onComplete(position);
        }
      } else {
        setError('Failed to create position');
      }
    } catch (err) {
      setError('Error creating position');
      console.error('Position creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setError('User name cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = await createUser({ name: newUserName.trim() });
      if (userId > 0) {
        const newUser = users.find(u => u.id === userId) || { id: userId, name: newUserName, created_at: new Date().toISOString(), icon_url: '' };
        setSelectedUser(newUser);
        setIsCreatingUser(false);
        setNewUserName('');
      } else {
        setError('Failed to create user');
      }
    } catch (err) {
      setError('Error creating user');
      console.error('User creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-300 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Buy Stocks</h2>

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

      <form onSubmit={handleCreatePosition} className="space-y-4">
        {/* Stock Selection */}
        <div>
          <label htmlFor="stock" className="block mb-2 font-medium">Select Stock</label>
          <select
            id="stock"
            className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
            value={selectedStock?.id || ''}
            onChange={(e) => {
              const stockId = Number(e.target.value);
              const stock = stocks.find(s => s.id === stockId) || null;
              setSelectedStock(stock);
            }}
            disabled={loading}
          >
            <option value="">-- Select a Stock --</option>
            {stocks.map(stock => (
              <option key={stock.id} value={stock.id}>
                {stock.name} - ${stock.current_price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* User Selection or Creation */}
        {!isCreatingUser && !currentUser ? (
          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="user" className="font-medium">Select Trader</label>
              <button
                type="button"
                className="text-sm text-primary-400 hover:underline"
                onClick={() => setIsCreatingUser(true)}
              >
                Create New Trader
              </button>
            </div>
            <select
              id="user"
              className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const userId = Number(e.target.value);
                const user = users.find(u => u.id === userId) || null;
                setSelectedUser(user);
              }}
              disabled={loading || !!currentUser}
            >
              <option value="">-- Select a Trader --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        ) : isCreatingUser && !currentUser ? (
          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="newUser" className="font-medium">New Trader Name</label>
              <button
                type="button"
                className="text-sm text-primary-400 hover:underline"
                onClick={() => setIsCreatingUser(false)}
              >
                Select Existing Trader
              </button>
            </div>
            <div className="flex space-x-2">
              <input
                id="newUser"
                type="text"
                className="flex-1 p-2 bg-dark-400 border border-dark-100 rounded"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter trader name"
                disabled={loading}
              />
              <button
                type="button"
                className="px-3 py-2 bg-primary-700 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                onClick={handleCreateUser}
                disabled={loading || !newUserName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        ) : null}

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block mb-2 font-medium">Shares to Buy</label>
          <input
            id="amount"
            type="number"
            className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
            min="1"
            disabled={loading}
          />
        </div>

        {/* Summary */}
        {selectedStock && (
          <div className="bg-dark-200 p-3 rounded">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <div>Stock:</div>
              <div>{selectedStock.name}</div>
              <div>Price per Share:</div>
              <div>${selectedStock.current_price.toFixed(2)}</div>
              <div>Quantity:</div>
              <div>{amount}</div>
              <div className="font-bold">Total Cost:</div>
              <div className="font-bold">${(selectedStock.current_price * amount).toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors disabled:opacity-50"
          disabled={loading || !selectedStock || !selectedUser || amount <= 0}
        >
          {loading ? 'Processing...' : 'Buy Shares'}
        </button>
      </form>
    </div>
  );
};

export default PositionForm;