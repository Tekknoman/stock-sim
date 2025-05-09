import React, { useState, useEffect, useMemo } from "react";
import { Stock, Position } from "../../types";
import {
  AreaChart,
  Area,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import usePositionStore from "../../store/positionStore";
import useStockStore from "../../store/stockStore";
import useUserStore from "../../store/userStore";
import UserChip from "../users/UserChip";

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
  const [sellingPosition, setSellingPosition] = useState<Position | null>(null);
  const [sellConfirmOpen, setSellConfirmOpen] = useState(false);
  const [sellSuccess, setSellSuccess] = useState<string | null>(null);

  const {
    getPositionsForStock,
    closePosition,
    setupSocketListeners,
    stockPositions: cachedPositions,
  } = usePositionStore();
  const { getStockHistory, stockHistories, setupWebSocketListeners } =
    useStockStore();
  const { selectedUser, userPositions: allUserPositions } = useUserStore();

  // Use the centralized stock history with timespan "5m" for the card
  const timeSpan = "5m";

  // Get stock history loading state from the store
  const isChartLoading = useMemo(
    () => stockHistories[stock.id]?.isLoading || false,
    [stock.id, stockHistories]
  );

  // Get the history data with memoization
  const priceHistory = useMemo(
    () => stockHistories[stock.id]?.data || [],
    [stock.id, stockHistories]
  );

  // Load chart data from central store instead of fetching directly
  useEffect(() => {
    // Get the history if we don't already have it
    if (!stockHistories[stock.id]) {
      getStockHistory(stock.id, timeSpan);
    }

    // Set up WebSocket listener for real-time updates
    const cleanup = setupWebSocketListeners();

    return cleanup;
  }, [
    stock.id,
    getStockHistory,
    setupWebSocketListeners,
    stockHistories,
    timeSpan,
  ]);

  // Calculate price change
  useEffect(() => {
    const change = stock.current_price - stock.base_value;
    const percentChange = (change / stock.base_value) * 100;
    setPriceChange({ value: change, percent: percentChange });
  }, [stock.current_price, stock.base_value]);

  // Set up WebSocket listeners for position updates and initial data load
  useEffect(() => {
    // Initial load of positions
    const loadPositions = async () => {
      const positions = await getPositionsForStock(stock.id);
      setStockPositions(positions);
    };
    loadPositions();

    // Set up socket listeners for real-time position updates
    const cleanup = setupSocketListeners();

    return cleanup;
  }, [stock.id, getPositionsForStock, setupSocketListeners]);

  // Update positions from cache when it changes
  useEffect(() => {
    if (cachedPositions[stock.id]) {
      setStockPositions(cachedPositions[stock.id]);
    }
  }, [cachedPositions, stock.id]);

  // Filter user positions for this stock
  useEffect(() => {
    if (selectedUser) {
      const positions = stockPositions.filter(
        (p) => p.stock_id === stock.id && p.is_open
      );
      setUserPositions(positions);
    } else {
      setUserPositions([]);
    }
  }, [selectedUser, stockPositions, stock.id]);

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
      const profit =
        (stock.current_price - sellingPosition.open_price) *
        sellingPosition.amount;
      const totalPayout = stock.current_price * sellingPosition.amount;

      setSellSuccess(
        `Sold ${sellingPosition.amount} shares for $${totalPayout.toFixed(
          2
        )} (${profit >= 0 ? "+" : ""}$${profit.toFixed(2)} profit)`
      );

      // No need to manually refresh here - the WebSocket will handle it
      setTimeout(() => setSellSuccess(null), 3000);
    } catch (err) {
      console.error("Error selling position:", err);
    } finally {
      setSellConfirmOpen(false);
      setSellingPosition(null);
    }
  };

  const handleCancelSell = () => {
    setSellConfirmOpen(false);
    setSellingPosition(null);
  };

  // Calculate performance percentage for position
  const calculatePerformancePercent = (position: Position): number => {
    return (
      ((stock.current_price - position.open_price) / position.open_price) * 100
    );
  };

  // Format the chart data from the history store
  const chartData = useMemo(() => {
    if (priceHistory.length === 0) return [];

    return priceHistory
      .map((point) => ({
        value: point.price,
        timestamp: point.timestamp,
        formattedTime: new Date(point.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [priceHistory]);

  // Custom tooltip for the chart that shows position values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-400 p-2 border border-dark-100 rounded shadow-md">
          <p className="text-xs">${payload[0].value.toFixed(2)}</p>
          <p className="text-xs text-gray-400">
            {payload[0].payload.formattedTime}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`stock-card cursor-pointer bg-dark-300 p-4 rounded-lg ${
        className || ""
      }`}
      style={{ borderLeft: `4px solid ${stock.color || "#6b7280"}` }}
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
            <span
              className={`ml-2 text-sm ${
                priceChange.percent >= 0 ? "text-stock-up" : "text-stock-down"
              }`}
            >
              {priceChange.value > 0 && "+"}
              {priceChange.value.toFixed(2)} ({priceChange.percent > 0 && "+"}
              {priceChange.percent.toFixed(2)}%)
              <span className="trend-icon">{getTrendIndicator()}</span>
            </span>
          </div>
        </div>

        <div className="flex">
          {getStatusIndicators().map((indicator, index) => (
            <span key={index} className="text-xl ml-1">
              {indicator}
            </span>
          ))}

          {userPositions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPositionsOnGraph(!showPositionsOnGraph);
              }}
              className={`ml-2 px-2 py-1 text-xs rounded ${
                showPositionsOnGraph ? "bg-primary-600" : "bg-dark-100"
              }`}
              title="Toggle position values on graph"
            >
              👁️
            </button>
          )}
        </div>
      </div>

      {/* Sell confirmation modal */}
      {sellConfirmOpen && sellingPosition && (
        <div
          className="absolute inset-0 bg-dark-400/90 z-10 flex items-center justify-center"
          onClick={handleCancelSell}
        >
          <div
            className="bg-dark-300 p-4 rounded-lg shadow-lg max-w-sm mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold mb-3">Confirm Sale</h4>
            <p className="mb-3">
              Sell {sellingPosition.amount} shares of {stock.name} at $
              {stock.current_price.toFixed(2)}?
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
                <span
                  className={`font-bold ${
                    stock.current_price > sellingPosition.open_price
                      ? "text-stock-up"
                      : "text-stock-down"
                  }`}
                >
                  $
                  {(
                    (stock.current_price - sellingPosition.open_price) *
                    sellingPosition.amount
                  ).toFixed(2)}
                </span>
                <span className="font-bold">Total payout:</span>
                <span className="font-bold">
                  ${(stock.current_price * sellingPosition.amount).toFixed(2)}
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
          ) : chartData.length > 0 ? (
            <AreaChart data={chartData}>
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={priceChange.percent >= 0 ? "#10b981" : "#ef4444"}
                fill={
                  priceChange.percent >= 0
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(239, 68, 68, 0.2)"
                }
                strokeWidth={1.5}
                isAnimationActive={false}
              />

              {/* Show user position values on graph if toggle is active */}
              {showPositionsOnGraph &&
                userPositions.map((position) => (
                  <ReferenceLine
                    key={position.id}
                    y={position.open_price}
                    stroke="#60a5fa"
                    strokeDasharray="3 3"
                    label={{
                      value: `${
                        position.amount
                      } @ $${position.open_price.toFixed(2)}`,
                      position: "insideBottomRight",
                      fill: "#60a5fa",
                      fontSize: 10,
                    }}
                  />
                ))}
            </AreaChart>
          ) : (
            <div className="flex justify-center items-center h-full w-full bg-dark-400/50 rounded">
              <div className="text-xs text-gray-300">No data available</div>
            </div>
          )}
        </ResponsiveContainer>
      </div>

      {/* User positions with sell buttons */}
      {userPositions.length > 0 && (
        <div className="mt-3 border-t border-dark-100 pt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Your Positions</span>
            <span className="text-xs text-gray-400">
              {userPositions.length} position(s)
            </span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {userPositions.map((position) => {
              const profit =
                (stock.current_price - position.open_price) * position.amount;
              const profitPercent =
                ((stock.current_price - position.open_price) /
                  position.open_price) *
                100;
              return (
                <div
                  key={position.id}
                  className="flex justify-between items-center text-xs py-1 px-2 bg-dark-200 rounded"
                >
                  <div>
                    <div>
                      {position.amount} shares @ $
                      {position.open_price.toFixed(2)}
                    </div>
                    <div
                      className={
                        profit >= 0 ? "text-stock-up" : "text-stock-down"
                      }
                    >
                      {profit >= 0 ? "+" : ""}
                      {profit.toFixed(2)} ({profitPercent >= 0 ? "+" : ""}
                      {profitPercent.toFixed(2)}%)
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

      {/* Other users' positions with performance percentages */}
      {stockPositions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {stockPositions.slice(0, 5).map((position) => {
            const performancePercent = calculatePerformancePercent(position);
            const performanceClass =
              performancePercent >= 0 ? "text-stock-up" : "text-stock-down";

            return (
              <div key={position.id} className="flex flex-col items-center">
                <UserChip
                  name={position.user_name || ""}
                  iconUrl={position.user_icon || undefined}
                  tooltipContent={`${
                    position.amount
                  } shares @ $${position.open_price.toFixed(2)}`}
                />
                <span
                  className={`text-xs ${performanceClass} font-medium mt-1`}
                >
                  {performancePercent >= 0 ? "+" : ""}
                  {performancePercent.toFixed(1)}%
                </span>
              </div>
            );
          })}
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
                {stockPositions.slice(0, 10).map((position) => {
                  const positionPL =
                    typeof position.profit_loss === "number"
                      ? position.profit_loss
                      : 0;
                  const performancePercent =
                    calculatePerformancePercent(position);
                  return (
                    <div
                      key={position.id}
                      className="flex justify-between text-sm py-1"
                    >
                      <span>{position.user_name}</span>
                      <span
                        className={
                          positionPL >= 0 ? "text-stock-up" : "text-stock-down"
                        }
                      >
                        {position.amount} shares | {positionPL > 0 && "+"}
                        {positionPL.toFixed(2)} (
                        {performancePercent >= 0 ? "+" : ""}
                        {performancePercent.toFixed(2)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockCard;
