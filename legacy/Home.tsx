import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts";
import { detectInflectionPointsWithDates, filterSignificantPoints } from "@/lib/inflectionPoints";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch latest prices
  const { data: latestPrices, isLoading: isLoadingLatest, refetch: refetchLatest } = trpc.dram.getLatestPrices.useQuery();

  // Fetch all items
  const { data: allItems } = trpc.dram.getAllItems.useQuery();

  // Fetch price history for selected item
  const { data: priceHistory, isLoading: isLoadingHistory } = trpc.dram.getPriceHistory.useQuery(
    { item: selectedItem || "" },
    { enabled: !!selectedItem }
  );

  // Refresh data mutation
  const refreshMutation = trpc.dram.refreshData.useMutation({
    onSuccess: (data) => {
      setLastUpdateTime(data.timestamp);
      refetchLatest();
      setIsRefreshing(false);
    },
    onError: () => {
      setIsRefreshing(false);
    },
  });

  // Initialize selected item and load last update time on first load
  useEffect(() => {
    if (allItems && allItems.length > 0 && !selectedItem) {
      setSelectedItem(allItems[0].item);
    }
  }, [allItems, selectedItem]);

  // Load last update time from latest prices
  useEffect(() => {
    if (latestPrices && latestPrices.length > 0) {
      const lastRecordTime = new Date(latestPrices[0].recordedAt);
      setLastUpdateTime(lastRecordTime);
    }
  }, [latestPrices]);

  // Prepare chart data with inflection points
  const chartData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return { data: [], inflectionPoints: [] };

    const data = priceHistory.map((record) => ({
      date: new Date(record.recordedAt),
      dateStr: format(new Date(record.recordedAt), "MMM dd"),
      sessionAverage: record.sessionAverage / 100, // Convert from cents to dollars
      sessionHigh: record.sessionHigh / 100,
      sessionLow: record.sessionLow / 100,
    }));

    // Detect inflection points
    const prices = data.map(d => d.sessionAverage);
    const inflectionPoints = detectInflectionPointsWithDates(
      data.map((d, i) => ({ value: prices[i], date: d.date })),
      2
    );

    // Filter to show only significant points
    const significantPoints = filterSignificantPoints(inflectionPoints, 2, 0.5);

    return { data, inflectionPoints: significantPoints };
  }, [priceHistory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshMutation.mutate();
  };

  const getCategoryColor = (item: string): string => {
    if (item.includes("DDR5")) return "from-purple-600 to-purple-400";
    if (item.includes("DDR4")) return "from-blue-600 to-blue-400";
    return "from-slate-600 to-slate-400";
  };

  const getCategoryLabel = (item: string): string => {
    if (item.includes("DDR5")) return "DDR5";
    if (item.includes("DDR4")) return "DDR4";
    return "DDR3";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">DRAM Spot Price Tracker</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Real-time price trends and analysis</p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdateTime && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Last updated</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {format(lastUpdateTime, "MMM dd, HH:mm")}
                  </p>
                </div>
              )}
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Latest Prices Table */}
        <Card className="mb-8 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Latest DRAM Spot Prices</CardTitle>
            <CardDescription>Current market prices across all DRAM types</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLatest ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : latestPrices && latestPrices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">Item</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Daily High</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Daily Low</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Session High</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Session Low</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Session Average</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Session Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {latestPrices.map((price, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{price.item}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">${(price.dailyHigh / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">${(price.dailyLow / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">${(price.sessionHigh / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">${(price.sessionLow / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">${(price.sessionAverage / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${price.sessionChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {price.sessionChange >= 0 ? "▲" : "▼"} {(price.sessionChange / 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 py-8 text-center">No price data available. Click Refresh to fetch data.</p>
            )}
          </CardContent>
        </Card>

        {/* Price Trends Chart */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Price Trends</CardTitle>
            <CardDescription>Historical Session Average prices with inflection points</CardDescription>
            {allItems && allItems.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {allItems.map((item) => (
                  <Button
                    key={item.item}
                    onClick={() => setSelectedItem(item.item)}
                    variant={selectedItem === item.item ? "default" : "outline"}
                    size="sm"
                    className={selectedItem === item.item ? `bg-gradient-to-r ${getCategoryColor(item.item)}` : ""}
                  >
                    {item.item}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : chartData.data.length > 0 ? (
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="dateStr"
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                      label={{ value: "Price ($)", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                      }}
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sessionAverage"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="Session Average"
                      isAnimationActive={false}
                    />
                    {/* Inflection Points */}
                    {chartData.inflectionPoints.map((point, idx) => (
                      <ReferenceDot
                        key={idx}
                        x={chartData.data[point.index]?.dateStr}
                        y={point.value}
                        r={6}
                        fill={point.type === "peak" ? "#ef4444" : "#10b981"}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 py-12 text-center">
                {selectedItem ? "No historical data available for this item." : "Select an item to view price trends."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        {chartData.inflectionPoints.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  Price Peaks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {chartData.inflectionPoints.filter(p => p.type === "peak").length} local maximum points detected
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Price Valleys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {chartData.inflectionPoints.filter(p => p.type === "valley").length} local minimum points detected
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {chartData.data.length} historical price records
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
