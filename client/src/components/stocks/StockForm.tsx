import React, { useState } from "react";
import useStockStore from "../../store/stockStore";
import { Stock } from "../../types";

interface StockFormProps {
  onComplete?: () => void;
  existingStock?: Stock;
}

const StockForm: React.FC<StockFormProps> = ({ onComplete, existingStock }) => {
  const { createStock, updateStock, setStockMaxValue, setStockPrice } =
    useStockStore();

  const [name, setName] = useState(existingStock?.name || "");
  const [baseValue, setBaseValue] = useState(existingStock?.base_value || 100);
  const [volatility, setVolatility] = useState<"Low" | "Medium" | "High">(
    existingStock?.volatility || "Medium"
  );
  const [color, setColor] = useState(existingStock?.color || "#3B82F6");
  const [buffValue, setBuffValue] = useState(existingStock?.buff_value || 0);
  const [maxValue, setMaxValue] = useState(existingStock?.max_value || null);
  const [newPrice, setNewPrice] = useState<number | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState(existingStock?.icon_url || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setIconFile(file);

      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Stock name is required");
      return;
    }

    if (baseValue <= 0) {
      setError("Base value must be greater than zero");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("name", name);
      formData.append("base_value", baseValue.toString());
      formData.append("volatility", volatility);
      formData.append("color", color);
      formData.append("buff_value", buffValue.toString());

      if (iconFile) {
        formData.append("icon", iconFile);
      }

      // Either update or create the stock
      if (existingStock) {
        await updateStock(existingStock.id, {
          name,
          base_value: baseValue,
          volatility,
          color,
          buff_value: buffValue,
          max_value: maxValue,
        });
        setSuccess(`Successfully updated ${name}`);
      } else {
        await createStock({
          name,
          base_value: baseValue,
          volatility,
          color,
          buff_value: buffValue,
          max_value: maxValue,
          // The icon_url will be set by the backend
        });
        setSuccess(`Successfully created ${name}`);

        // Reset form after creating new stock
        setName("");
        setBaseValue(100);
        setVolatility("Medium");
        setColor("#3B82F6");
        setBuffValue(0);
        setMaxValue(null);
        setNewPrice(null);
        setIconFile(null);
        setIconPreview("");
      }

      // Call the onComplete callback
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Error saving stock:", err);
      setError("Failed to save stock");
    } finally {
      setLoading(false);
    }
  };

  const handleSetMaxValue = async () => {
    if (!existingStock || maxValue === null) return;

    setLoading(true);
    setError(null);

    try {
      await setStockMaxValue(existingStock.id, maxValue);
      setSuccess(`Max value for ${name} set to $${maxValue.toFixed(2)}`);
    } catch (err) {
      console.error("Error setting max value:", err);
      setError("Failed to set max value");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async () => {
    if (!existingStock || newPrice === null) return;

    setLoading(true);
    setError(null);

    try {
      await setStockPrice(existingStock.id, newPrice);
      setSuccess(`Price for ${name} manually set to $${newPrice.toFixed(2)}`);
      setNewPrice(null); // Reset the input after successful update
    } catch (err) {
      console.error("Error setting price:", err);
      setError("Failed to set price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-300 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">
        {existingStock ? "Edit Stock" : "Create New Stock"}
      </h2>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stock Name */}
        <div>
          <label htmlFor="name" className="block mb-2 font-medium">
            Stock Name
          </label>
          <input
            id="name"
            type="text"
            className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ACME Corp"
            disabled={loading}
          />
        </div>

        {/* Base Value */}
        <div>
          <label htmlFor="baseValue" className="block mb-2 font-medium">
            Base Value ($)
          </label>
          <input
            id="baseValue"
            type="number"
            className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
            value={baseValue}
            onChange={(e) => setBaseValue(parseFloat(e.target.value) || 0)}
            min="0.01"
            step="0.01"
            disabled={loading}
          />
        </div>

        {/* Max Value */}
        <div>
          <label htmlFor="maxValue" className="block mb-2 font-medium">
            Max Value ($){" "}
            <span className="text-sm text-gray-400">- Optional</span>
          </label>
          <div className="flex">
            <input
              id="maxValue"
              type="number"
              className="flex-1 p-2 bg-dark-400 border border-dark-100 rounded-l"
              value={maxValue === null ? "" : maxValue}
              onChange={(e) => {
                const val =
                  e.target.value === "" ? null : parseFloat(e.target.value);
                setMaxValue(val);
              }}
              min="0.01"
              step="0.01"
              placeholder="No limit"
              disabled={loading}
            />
            {existingStock && (
              <button
                type="button"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-r transition-colors disabled:opacity-50"
                onClick={handleSetMaxValue}
                disabled={loading || maxValue === null}
              >
                Apply
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            When set, this creates a soft limit that automatically pushes the
            price down when exceeded
          </p>
        </div>

        {/* Volatility */}
        <div>
          <label htmlFor="volatility" className="block mb-2 font-medium">
            Volatility
          </label>
          <select
            id="volatility"
            className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
            value={volatility}
            onChange={(e) =>
              setVolatility(e.target.value as "Low" | "Medium" | "High")
            }
            disabled={loading}
          >
            <option value="Low">Low - Small, gradual price changes</option>
            <option value="Medium">Medium - Moderate price fluctuations</option>
            <option value="High">High - Large, rapid price swings</option>
          </select>
        </div>

        {/* Color */}
        <div>
          <label htmlFor="color" className="block mb-2 font-medium">
            Theme Color
          </label>
          <div className="flex items-center space-x-4">
            <input
              id="color"
              type="color"
              className="h-10 w-16"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={loading}
            />
            <span>{color}</span>
          </div>
        </div>

        {/* Buff/Nerf Value */}
        <div>
          <label htmlFor="buffValue" className="block mb-2 font-medium">
            Buff/Nerf Value (%){" "}
            <span className="text-sm text-gray-400">- Optional</span>
          </label>
          <input
            id="buffValue"
            type="number"
            className="w-full p-2 bg-dark-400 border border-dark-100 rounded"
            value={buffValue}
            onChange={(e) => setBuffValue(parseFloat(e.target.value) || 0)}
            step="0.1"
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">
            Positive values favor price increases, negative values favor
            decreases
          </p>
        </div>

        {/* Stock Icon */}
        <div>
          <label htmlFor="icon" className="block mb-2 font-medium">
            Icon <span className="text-sm text-gray-400">- Optional</span>
          </label>

          <div className="flex items-center space-x-4 mb-2">
            {iconPreview && (
              <div className="h-16 w-16 rounded bg-dark-100 flex items-center justify-center overflow-hidden">
                <img
                  src={iconPreview}
                  alt="Stock icon preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            <div className="flex-1">
              <input
                id="icon"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconChange}
                disabled={loading}
              />
              <label
                htmlFor="icon"
                className="cursor-pointer px-4 py-2 bg-dark-200 hover:bg-dark-100 rounded inline-block"
              >
                {iconPreview ? "Change Icon" : "Upload Icon"}
              </label>

              {iconPreview && (
                <button
                  type="button"
                  className="ml-3 px-4 py-2 bg-red-900/30 hover:bg-red-800/30 rounded"
                  onClick={() => {
                    setIconFile(null);
                    setIconPreview("");
                  }}
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Recommended: square image, 128×128 pixels or larger
          </p>
        </div>

        {/* Manually Set Current Price (only for existing stocks) */}
        {existingStock && (
          <div className="border-t border-dark-100 pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-3">
              Manual Price Override
            </h3>
            <div className="flex">
              <input
                type="number"
                className="flex-1 p-2 bg-dark-400 border border-dark-100 rounded-l"
                value={newPrice === null ? "" : newPrice}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                  setNewPrice(val);
                }}
                min="0.01"
                step="0.01"
                placeholder="Enter new price"
                disabled={loading}
              />
              <button
                type="button"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-r transition-colors disabled:opacity-50"
                onClick={handleSetPrice}
                disabled={loading || newPrice === null}
              >
                Set Price
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Immediately changes the stock's price, overriding the simulation
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : existingStock
              ? "Update Stock"
              : "Create Stock"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockForm;
