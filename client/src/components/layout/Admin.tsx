import React, { useState } from 'react';
import StockForm from '../stocks/StockForm';
import Modal from './Modal';
import { Stock } from '../../types';
import useStockStore from '../../store/stockStore';

interface AdminProps {
  isOpen: boolean;
  onClose: () => void;
}

const Admin: React.FC<AdminProps> = ({ isOpen, onClose }) => {
  const { stocks, fetchStocks, deleteStock } = useStockStore();
  const [showAddStock, setShowAddStock] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Stock | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddStock = () => {
    setSelectedStock(null);
    setShowAddStock(true);
  };

  const handleEditStock = (stock: Stock) => {
    setSelectedStock(stock);
    setShowAddStock(true);
  };

  const handleDeleteConfirmation = (stock: Stock) => {
    setDeleteConfirmation(stock);
  };

  const handleDeleteStock = async () => {
    if (!deleteConfirmation) return;
    
    try {
      await deleteStock(deleteConfirmation.id);
      setSuccessMessage(`Successfully deleted ${deleteConfirmation.name}`);
      setDeleteConfirmation(null);
      fetchStocks(); // Refresh stocks list
    } catch (err) {
      console.error('Error deleting stock:', err);
      // Handle error
    }
  };

  const handleFormComplete = () => {
    setShowAddStock(false);
    fetchStocks(); // Refresh stocks after creating/editing
  };

  const closeDeleteModal = () => setDeleteConfirmation(null);
  const closeAddStockModal = () => setShowAddStock(false);

  if (!isOpen) return null;

  return (
    <div className="bg-dark-300 p-6 rounded-lg max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <button 
          onClick={onClose}
          className="px-3 py-1 bg-dark-100 hover:bg-dark-200 rounded"
        >
          Close
        </button>
      </div>

      {successMessage && (
        <div className="bg-green-900/30 border border-green-800 rounded p-3 mb-4 text-green-200">
          {successMessage}
          <button 
            onClick={() => setSuccessMessage(null)}
            className="float-right"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-6">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Stocks</h3>
            <button 
              onClick={handleAddStock}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded transition-colors"
            >
              Add New Stock
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-dark-100 text-left">
                <tr>
                  <th className="py-2 px-4">Icon</th>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Base Value</th>
                  <th className="py-2 px-4">Current Price</th>
                  <th className="py-2 px-4">Volatility</th>
                  <th className="py-2 px-4">Buff/Nerf</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(stock => (
                  <tr key={stock.id} className="border-b border-dark-100 hover:bg-dark-400">
                    <td className="py-2 px-4">
                      {stock.icon_url ? (
                        <img 
                          src={stock.icon_url} 
                          alt={stock.name} 
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-dark-100 rounded flex items-center justify-center">
                          <span className="text-xs">No icon</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">{stock.name}</td>
                    <td className="py-2 px-4">${stock.base_value.toFixed(2)}</td>
                    <td className="py-2 px-4">${stock.current_price.toFixed(2)}</td>
                    <td className="py-2 px-4">{stock.volatility}</td>
                    <td className="py-2 px-4">
                      <span className={stock.buff_value > 0 ? 'text-stock-up' : stock.buff_value < 0 ? 'text-stock-down' : ''}>
                        {stock.buff_value > 0 && '+'}{stock.buff_value.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditStock(stock)}
                          className="px-3 py-1 bg-blue-600/30 hover:bg-blue-500/30 rounded text-xs"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteConfirmation(stock)}
                          className="px-3 py-1 bg-red-600/30 hover:bg-red-500/30 rounded text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400">
                      No stocks found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* We could add more admin sections here like simulation settings */}
      </div>

      {/* Add/Edit Stock Modal */}
      <Modal
        isOpen={showAddStock}
        onClose={closeAddStockModal}
        title={selectedStock ? 'Edit Stock' : 'Create New Stock'}
        maxWidth="max-w-2xl"
      >
        <StockForm 
          existingStock={selectedStock || undefined} 
          onComplete={handleFormComplete} 
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={closeDeleteModal}
        title="Confirm Delete"
        maxWidth="max-w-md"
      >
        {deleteConfirmation && (
          <div className="space-y-4">
            <p>
              Are you sure you want to delete <strong>{deleteConfirmation.name}</strong>?
              This action cannot be undone and will remove all associated position data.
            </p>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-dark-100 hover:bg-dark-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStock}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
              >
                Delete Stock
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Admin;