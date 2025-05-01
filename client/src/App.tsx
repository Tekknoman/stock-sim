import React, { useState, useEffect } from "react";
import "./App.css";
import StockGrid from "./components/stocks/StockGrid";
import SimulationControl from "./components/layout/SimulationControl";
import PositionForm from "./components/positions/PositionForm";
import PositionList from "./components/positions/PositionList";
import Admin from "./components/layout/Admin";
import Modal from "./components/layout/Modal";
import useUserStore from "./store/userStore";
import usePositionStore from "./store/positionStore";
import socketService from "./services/socket";
import { User } from "./types";

function App() {
  const { users, selectedUser, selectUser, fetchUsers } = useUserStore();
  const { setupSocketListeners } = usePositionStore();
  const [tradingSidebarOpen, setTradingSidebarOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "positions">("buy");
  const [transactionHistory, setTransactionHistory] = useState<
    {
      message: string;
      timestamp: Date;
      type: "buy" | "sell";
    }[]
  >([]);

  // Ensure we have users loaded
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Initialize socket connection and set up listeners
  useEffect(() => {
    // Connect to WebSocket server
    socketService.connect();

    // Set up position update listeners
    const cleanupPositionListeners = setupSocketListeners();

    // Clean up on unmount
    return () => {
      socketService.disconnect();
      cleanupPositionListeners();
    };
  }, [setupSocketListeners]);

  // Function to add transaction to history
  const addTransaction = (message: string, type: "buy" | "sell") => {
    setTransactionHistory((prev) => [
      { message, timestamp: new Date(), type },
      ...prev.slice(0, 19), // Keep only the last 20 transactions
    ]);
  };

  return (
    <div className="min-h-screen bg-dark-500 flex flex-col">
      <header className="bg-dark-400 py-3 px-6 shadow-md">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-300">
              Virtual Trading Game
            </h1>

            <div className="flex items-center space-x-4">
              <select
                className="bg-dark-300 border border-dark-200 rounded px-3 py-1.5"
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const userId = Number(e.target.value);
                  selectUser(users.find((u) => u.id === userId) || null);
                }}
              >
                <option value="">Select Trader</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setTradingSidebarOpen(!tradingSidebarOpen)}
                className={`px-4 py-2 rounded-md ${
                  tradingSidebarOpen
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-primary-600 hover:bg-primary-500"
                } transition-colors flex items-center space-x-1`}
              >
                <span>
                  {tradingSidebarOpen
                    ? "Hide Trading Panel"
                    : "Show Trading Panel"}
                </span>
                <span>{tradingSidebarOpen ? "›" : "‹"}</span>
              </button>

              <button
                onClick={() => setShowAdminModal(true)}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded-md transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto py-4 px-6 flex-1 flex flex-col">
        <div className="mb-4">
          <SimulationControl />
        </div>

        <div className="flex flex-1 gap-4">
          <div className={`flex-1 ${tradingSidebarOpen ? "pr-4" : ""}`}>
            <StockGrid />
          </div>

          {tradingSidebarOpen && (
            <div className="w-80 bg-dark-400 rounded-lg shadow-lg overflow-hidden flex flex-col">
              {/* Trading panel header with tabs */}
              <div className="flex border-b border-dark-200">
                <button
                  className={`flex-1 py-3 font-medium text-center transition-colors ${
                    activeTab === "buy"
                      ? "bg-dark-300 text-primary-300"
                      : "hover:bg-dark-300/50"
                  }`}
                  onClick={() => setActiveTab("buy")}
                >
                  Buy Stocks
                </button>
                <button
                  className={`flex-1 py-3 font-medium text-center transition-colors ${
                    activeTab === "positions"
                      ? "bg-dark-300 text-primary-300"
                      : "hover:bg-dark-300/50"
                  }`}
                  onClick={() => setActiveTab("positions")}
                >
                  Positions
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === "buy" && (
                  <PositionForm
                    onComplete={(position) => {
                      // Refresh user positions and add to transaction history
                      if (selectedUser) {
                        selectUser(selectedUser);
                        addTransaction(
                          `Bought ${position.amount} shares of ${
                            position.stock_name
                          } at $${position.open_price.toFixed(2)}`,
                          "buy"
                        );
                      }
                    }}
                  />
                )}

                {activeTab === "positions" && selectedUser && (
                  <>
                    <h2 className="text-xl font-bold mb-4">
                      {selectedUser.name}'s Positions
                    </h2>
                    <PositionList
                      onlyOpen={true}
                      onSellPosition={(position, price) => {
                        addTransaction(
                          `Sold ${position.amount} shares of ${
                            position.stock_name
                          } at $${price.toFixed(2)}`,
                          "sell"
                        );
                      }}
                    />
                  </>
                )}

                {activeTab === "positions" && !selectedUser && (
                  <div className="bg-dark-300 p-6 rounded text-center">
                    <p className="text-gray-400">
                      Select a trader to view positions
                    </p>
                  </div>
                )}
              </div>

              {/* Transaction history */}
              <div className="border-t border-dark-200 p-2">
                <div className="text-xs font-medium text-gray-400 mb-1 flex justify-between items-center">
                  <span>Recent Transactions</span>
                  <button
                    onClick={() => setTransactionHistory([])}
                    className="text-xs text-primary-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {transactionHistory.length === 0 ? (
                    <p className="text-gray-500 italic">
                      No recent transactions
                    </p>
                  ) : (
                    transactionHistory.map((transaction, index) => (
                      <div
                        key={index}
                        className={`py-1 px-2 rounded ${
                          transaction.type === "buy"
                            ? "bg-blue-900/20"
                            : "bg-green-900/20"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{transaction.message}</span>
                          <span className="text-gray-500">
                            {transaction.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-dark-400 py-3 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          Virtual Trading Game &copy; {new Date().getFullYear()} - A stock
          market simulator for educational purposes
        </div>
      </footer>

      {/* Admin Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        maxWidth="max-w-7xl"
      >
        <Admin
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
        />
      </Modal>
    </div>
  );
}

export default App;
