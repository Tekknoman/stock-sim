import React, { useState, useEffect, useMemo } from "react";
import { Position } from "../../types";
import usePositionStore from "../../store/positionStore";
import useUserStore from "../../store/userStore";
import useStockStore from "../../store/stockStore";

interface PositionListProps {
  userId?: number;
  onlyOpen?: boolean;
  onSellPosition?: (position: Position, price: number) => void;
}

const PositionList: React.FC<PositionListProps> = ({
  userId,
  onlyOpen = true,
  onSellPosition,
}) => {
  const {
    positions: allPositions,
    closePosition,
    fetchPositions,
    loading: positionsLoading,
  } = usePositionStore();
  const { selectedUser } = useUserStore();
  const { stocks } = useStockStore();
  const [closingPositionId, setClosingPositionId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const targetUserId = userId || selectedUser?.id;

  const userPositions = useMemo(() => {
    if (!targetUserId) return [];
    return allPositions.filter((pos) => {
      if (pos.user_id !== targetUserId) return false;
      if (onlyOpen && !pos.is_open) return false;
      return true;
    });
  }, [allPositions, targetUserId, onlyOpen]);

  useEffect(() => {
    // If displaying for a specific user and their positions might not be in the initial allPositions load,
    // or if allPositions is empty, consider fetching.
    // However, App.tsx should ideally handle the initial population of allPositions.
    if (targetUserId && allPositions.length === 0 && !positionsLoading) {
      // fetchPositions(); // This fetches ALL positions.
      // If userStore had a fetchUserPositions that updates allPositions or a dedicated user-specific list, that might be better.
      // For now, relying on App.tsx or a parent component to have called fetchPositions.
    }
  }, [targetUserId, allPositions.length, fetchPositions, positionsLoading]);

  const handleClosePosition = async (position: Position) => {
    if (!position.is_open) return;

    setClosingPositionId(position.id);
    setError(null);
    setSuccess(null);

    try {
      await closePosition(position.id); // This will trigger WebSocket update handled by positionStore

      const stock = stocks.find((s) => s.id === position.stock_id);
      const currentPrice = stock?.current_price || position.close_price || 0;

      setSuccess(
        `Successfully sold ${position.amount} shares of ${position.stock_name}`
      );
      setTimeout(() => setSuccess(null), 3000); // Clear success message

      if (onSellPosition) {
        onSellPosition(position, currentPrice);
      }
    } catch (err) {
      console.error("Error closing position:", err);
      setError("Failed to close position. Please try again.");
      setTimeout(() => setError(null), 3000); // Clear error message
    } finally {
      setClosingPositionId(null);
    }
  };

  if (positionsLoading && userPositions.length === 0) {
    return <div className="text-center p-4">Loading positions...</div>;
  }

  if (!targetUserId) {
    return (
      <div className="bg-dark-300 p-6 rounded text-center">
        <p className="text-gray-400">
          Select a trader to view their positions.
        </p>
      </div>
    );
  }

  if (userPositions.length === 0) {
    return (
      <div className="bg-dark-300 p-6 rounded text-center">
        <p className="text-gray-400">No positions to display.</p>
        <button
          onClick={() => {
            fetchPositions();
          }}
          className="text-xs bg-dark-100 hover:bg-dark-200 px-2 py-1 rounded mt-2"
          disabled={positionsLoading}
        >
          {positionsLoading ? "Refreshing..." : "Refresh Positions"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-red-500 text-sm text-center p-2 bg-red-900/30 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="text-green-500 text-sm text-center p-2 bg-green-900/30 rounded">
          {success}
        </div>
      )}
      {userPositions.map((position) => {
        const stock = stocks.find((s) => s.id === position.stock_id);
        const currentPrice = position.is_open
          ? stock?.current_price || position.open_price
          : position.close_price || position.open_price;

        // Calculate profit/loss based on position status
        const profitLoss = position.is_open
          ? (currentPrice - position.open_price) * position.amount // Live P/L for open positions
          : ((position.close_price || position.open_price) -
              position.open_price) *
            position.amount; // Realized P/L for closed positions

        const profitLossPercent =
          position.open_price !== 0
            ? (profitLoss / (position.open_price * position.amount)) * 100
            : 0;

        return (
          <div
            key={position.id}
            className={`p-3 rounded-lg shadow transition-all duration-300 ease-in-out ${
              position.is_open ? "bg-dark-200" : "bg-dark-100 opacity-60"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-primary-300">
                {position.stock_name || stock?.name || "Unknown Stock"}
              </span>
              <span className="text-xs text-gray-400">
                {position.amount} shares
              </span>
            </div>
            <div className="text-xs grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
              <span>Avg. Open Price:</span>
              <span className="text-right">
                ${position.open_price.toFixed(2)}
              </span>

              {position.is_open ? (
                // Open position shows current market price
                <>
                  <span>Current Price:</span>
                  <span className="text-right">${currentPrice.toFixed(2)}</span>
                </>
              ) : (
                // Closed position shows actual close price
                <>
                  <span>Sold Price:</span>
                  <span className="text-right">
                    ${(position.close_price || position.open_price).toFixed(2)}
                  </span>
                </>
              )}

              <span className="font-medium">
                {position.is_open ? "Unrealized P/L:" : "Realized P/L:"}
              </span>
              <span
                className={`text-right font-medium ${
                  profitLoss >= 0 ? "text-stock-up" : "text-stock-down"
                }`}
              >
                {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(2)} (
                {profitLossPercent.toFixed(2)}%)
              </span>
            </div>
            {position.is_open && (
              <button
                onClick={() => handleClosePosition(position)}
                disabled={closingPositionId === position.id}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 rounded transition-colors disabled:opacity-50"
              >
                {closingPositionId === position.id
                  ? "Selling..."
                  : "Sell Position"}
              </button>
            )}
            {!position.is_open && position.close_price && (
              <div className="text-xs mt-1 border-t border-dark-100 pt-1 flex justify-between">
                <span>Sold at: ${position.close_price.toFixed(2)}</span>
                <span
                  className={
                    profitLoss >= 0 ? "text-stock-up" : "text-stock-down"
                  }
                >
                  Total payout: $
                  {(position.amount * (position.close_price || 0)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        );
      })}
      <button
        onClick={() => {
          fetchPositions();
        }}
        className="w-full text-xs bg-dark-100 hover:bg-dark-200 px-2 py-1 rounded mt-2"
        disabled={positionsLoading}
      >
        {positionsLoading ? "Refreshing..." : "Refresh All Positions"}
      </button>
    </div>
  );
};

export default PositionList;
