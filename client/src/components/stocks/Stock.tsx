import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Stock as StockType, PriceHistoryPoint } from "../../types";
import useStockStore from "../../store/stockStore";
import useSimulationStore from "../../store/simulationStore";
import socketService from "../../services/socket";

interface StockViewProps {
  stockId: number;
  onClose?: () => void;
}

type TimeSpan = "1m" | "5m" | "15m" | "30m" | "1h" | "all";

const Stock: React.FC<StockViewProps> = ({ stockId, onClose }) => {
  const { stocks, getStockHistory, stockHistories, setupWebSocketListeners } =
    useStockStore();

  const { status: simulationStatus } = useSimulationStore();
  const stock = stocks.find((s) => s.id === stockId);

  const [timeSpan, setTimeSpan] = useState<TimeSpan>("15m");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentDomain, setCurrentDomain] = useState<string[]>([
    "auto",
    "auto",
  ]);

  // Get stock history loading state
  const isHistoryLoading = useMemo(
    () => stockHistories[stockId]?.isLoading || false,
    [stockId, stockHistories]
  );

  // Get stock history data with memoization
  const priceHistory = useMemo(
    () => stockHistories[stockId]?.data || [],
    [stockId, stockHistories]
  );

  // Format timestamps based on selected time span
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);

    // Always include hours, minutes, and seconds for precise time display
    return date.toLocaleTimeString("de-CH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Transform data for chart
  const chartData = useMemo(
    () =>
      priceHistory
        .map((point) => ({
          timestamp: formatTimestamp(point.timestamp),
          price: point.price,
          rawTimestamp: new Date(point.timestamp).getTime(), // For sorting
        }))
        .sort((a, b) => a.rawTimestamp - b.rawTimestamp),
    [priceHistory]
  ); // Ensure chronological order

  // Initial fetch and timespan change
  useEffect(() => {
    if (stockId) {
      getStockHistory(stockId, timeSpan);
    }
  }, [stockId, timeSpan, getStockHistory]);

  // Setup WebSocket listeners for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    // Set up global WebSocket listeners - returns cleanup function
    const cleanup = setupWebSocketListeners();

    // Update last update timestamp when we receive updates
    const handlePriceUpdate = (updates: any[]) => {
      const stockUpdate = updates.find((update) => update.id === stockId);
      if (stockUpdate) {
        setLastUpdate(new Date());
      }
    };

    socketService.onPriceUpdate(handlePriceUpdate);

    // Clean up
    return () => {
      cleanup();
      socketService.removeListener("prices:update", handlePriceUpdate);
    };
  }, [stockId, autoRefresh, setupWebSocketListeners]);

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

  // Handle manual refresh
  const handleManualRefresh = () => {
    getStockHistory(stockId, timeSpan);
    setLastUpdate(new Date());
  };

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
            <span className="font-semibold">
              ${stock.current_price.toFixed(2)}
            </span>
            <span
              className={`ml-2 ${
                stock.current_price >= stock.base_value
                  ? "text-stock-up"
                  : "text-stock-down"
              }`}
            >
              {stock.current_price >= stock.base_value ? "+" : ""}
              {(stock.current_price - stock.base_value).toFixed(2)}(
              {(
                ((stock.current_price - stock.base_value) / stock.base_value) *
                100
              ).toFixed(2)}
              %)
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
        <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
          <div className="flex items-center space-x-3">
            <div>Volatility: {stock.volatility}</div>
            <div>Base value: ${stock.base_value.toFixed(2)}</div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              className={`px-2 py-1 text-xs rounded ${
                autoRefresh ? "bg-green-800/50 text-green-200" : "bg-dark-100"
              }`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={
                autoRefresh ? "Disable auto updates" : "Enable auto updates"
              }
            >
              {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
            </button>
            <button
              className="px-2 py-1 text-xs bg-dark-100 hover:bg-dark-200 rounded"
              onClick={handleManualRefresh}
              title="Manually refresh data"
            >
              ↻
            </button>
            <div className="text-xs">
              {lastUpdate && `Last update: ${lastUpdate.toLocaleTimeString()}`}
            </div>
          </div>
        </div>

        {/* Time span selector */}
        <div className="flex mb-4 bg-dark-400 rounded-t-lg p-2 space-x-1">
          {(["1m", "5m", "15m", "30m", "1h", "all"] as TimeSpan[]).map(
            (span) => (
              <button
                key={span}
                className={`px-3 py-1 text-sm rounded ${
                  timeSpan === span
                    ? "bg-primary-600 text-white"
                    : "bg-dark-300 hover:bg-dark-200"
                }`}
                onClick={() => setTimeSpan(span)}
              >
                {span === "all" ? "All" : span}
              </button>
            )
          )}
        </div>

        <div className="h-80 bg-dark-400 rounded-b-lg p-4 relative">
          {isHistoryLoading && (
            <div className="absolute top-2 right-2 z-10">
              <div className="flex items-center bg-dark-500/70 px-2 py-1 rounded-full">
                <svg
                  className="animate-spin h-4 w-4 text-primary-400 mr-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-xs text-primary-300">Updating</span>
              </div>
            </div>
          )}

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="rawTimestamp"
                  tickFormatter={(timestamp) =>
                    formatTimestamp(new Date(timestamp).toString())
                  }
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: "#4B5563" }}
                  domain={currentDomain}
                  type="number"
                  scale={"time"}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: "#4B5563" }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "white",
                  }}
                  formatter={(value: any) => [`$${value}`, "Price"]}
                  labelFormatter={(label: any) =>
                    `Time: ${formatTimestamp(new Date(label).toString())}`
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={stock.color || "#0EA5E9"}
                  strokeWidth={2}
                  dot={chartData.length < 30}
                  activeDot={{ r: 8 }}
                  animationDuration={300}
                  isAnimationActive={!autoRefresh} // Disable animation during live updates
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
                    style={{ backgroundColor: stock.color || "#6b7280" }}
                  ></div>
                  {stock.color}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Buff/Nerf:</td>
                <td
                  className={`py-1 ${
                    stock.buff_value > 0
                      ? "text-stock-up"
                      : stock.buff_value < 0
                      ? "text-stock-down"
                      : ""
                  }`}
                >
                  {stock.buff_value > 0 && "+"}
                  {stock.buff_value.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-dark-400 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Market Activity</h3>
          <p className="text-gray-300">
            Trading activity affects this stock's price. Higher demand will
            increase the price over time.
          </p>

          <div className="mt-4 pt-4 border-t border-dark-300">
            <div className="text-sm text-gray-400">
              Created on: {new Date(stock.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm mt-1 text-gray-400">
              Data points: {priceHistory.length}
              {timeSpan !== "all" && ` (last ${timeSpan})`}
            </div>
            <div className="text-sm mt-1 text-gray-400">
              Simulation speed: {(simulationStatus.interval / 1000).toFixed(1)}s
              interval
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stock;
