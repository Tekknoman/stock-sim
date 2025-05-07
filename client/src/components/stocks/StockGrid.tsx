import React, { useEffect, useState } from 'react';
import StockCard from './StockCard';
import Stock from './Stock';
import Modal from '../layout/Modal';
import useStockStore from '../../store/stockStore';
import socketService from '../../services/socket';

const StockGrid: React.FC = () => {
  const { stocks, loading, error, fetchStocks, updateStockPrices } = useStockStore();
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Fetch all stocks on component mount
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);
  
  // Listen for real-time stock updates
  useEffect(() => {
    
    // Listen for stock price updates
    socketService.onPriceUpdate(updates => {
      updateStockPrices(updates);
    });
    
    // Listen for stock events
    socketService.onStockEvent(event => {
      // Optionally show a notification
      console.log(`Event on ${event.stock_name}: ${event.message}`);
      // Refresh stocks after events
      fetchStocks();
    });
    

  }, [updateStockPrices, fetchStocks]);
  
  const handleStockClick = (stockId: number) => {
    setSelectedStockId(stockId);
    setModalOpen(true);
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setSelectedStockId(null);
  };
  
  if (loading && stocks.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-80">
        <div className="animate-pulse text-primary-400 text-xl">Loading stocks...</div>
      </div>
    );
  }
  
  if (error && stocks.length === 0) {
    return (
      <div className="bg-red-900/50 p-4 rounded-lg text-center">
        <h3 className="text-red-300 font-bold mb-2">Error Loading Stocks</h3>
        <p>{error}</p>
        <button 
          className="mt-3 px-4 py-2 bg-primary-700 rounded hover:bg-primary-600 transition-colors"
          onClick={() => fetchStocks()}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stocks.map(stock => (
          <div key={stock.id} className="flex h-full">
            <StockCard 
              stock={stock}
              onClick={handleStockClick}
              className="w-full h-full"
            />
          </div>
        ))}
        
        {stocks.length === 0 && (
          <div className="col-span-full p-8 text-center bg-dark-300 rounded-lg">
            <h3 className="text-xl font-bold mb-2">No Stocks Found</h3>
            <p className="text-gray-400">Create some stocks to start the simulation</p>
          </div>
        )}
      </div>
      
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        maxWidth="max-w-5xl"
      >
        {selectedStockId && (
          <Stock stockId={selectedStockId} onClose={closeModal} />
        )}
      </Modal>
    </>
  );
};

export default StockGrid;