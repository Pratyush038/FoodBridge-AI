"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Scatter,
} from "recharts";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Loader2,
  ChevronRight,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface DailyForecast {
  date: string;
  day_index: number;
  predicted_demand: number;
  lower_bound_95: number;
  upper_bound_95: number;
  risk_score: number;
  risk_level: string;
}

interface NGOPrediction {
  ngo_name: string;
  daily_forecasts: DailyForecast[];
  summary: {
    average_daily_demand: number;
    max_daily_demand: number;
    min_daily_demand: number;
    total_7day_demand: number;
    baseline_demand: number;
  };
}

interface TrainingHistory {
  loss: number[];
  val_loss: number[];
  mae: number[];
  val_mae: number[];
  final_metrics: {
    epochs_trained: number;
    train_loss: number;
    val_loss: number;
    train_mae: number;
    val_mae: number;
  };
}

interface PerDayMetric {
  day: number;
  mae: number;
  rmse: number;
  r2: number;
}

interface SamplePrediction {
  sample_id: number;
  actual: number[];
  predicted: number[];
  days: number[];
}

interface ModelInfo {
  model_type: string;
  total_parameters: number;
  sequence_length: number;
  forecast_horizon: number;
  lstm_units: number[];
  dense_units: number;
  dropout_rate: number;
  device: string;
}

export default function LSTMDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, NGOPrediction>>({});
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory | null>(null);
  const [perDayMetrics, setPerDayMetrics] = useState<PerDayMetric[]>([]);
  const [samplePredictions, setSamplePredictions] = useState<SamplePrediction[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedNGO, setSelectedNGO] = useState<string>("");
  const [selectedSample, setSelectedSample] = useState<number>(0);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [predictionsRes, historyRes, metricsRes, samplesRes, modelRes] = await Promise.all([
        fetch(`${API_BASE}/api/predictions`).catch(() => null),
        fetch(`${API_BASE}/api/training-history`).catch(() => null),
        fetch(`${API_BASE}/api/per-day-metrics`).catch(() => null),
        fetch(`${API_BASE}/api/sample-predictions`).catch(() => null),
        fetch(`${API_BASE}/api/model-info`).catch(() => null),
      ]);

      if (predictionsRes?.ok) {
        const data = await predictionsRes.json();
        setPredictions(data.ngos || {});
        if (!selectedNGO && Object.keys(data.ngos || {}).length > 0) {
          setSelectedNGO(Object.keys(data.ngos)[0]);
        }
      }

      if (historyRes?.ok) {
        setTrainingHistory(await historyRes.json());
      }

      if (metricsRes?.ok) {
        const data = await metricsRes.json();
        setPerDayMetrics(data.per_day_metrics || []);
      }

      if (samplesRes?.ok) {
        const data = await samplesRes.json();
        setSamplePredictions(data.samples || []);
      }

      if (modelRes?.ok) {
        setModelInfo(await modelRes.json());
      }
    } catch (err) {
      setError("Failed to connect to LSTM API. Make sure the FastAPI server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW": return "bg-green-500";
      case "MEDIUM": return "bg-yellow-500";
      case "HIGH": return "bg-orange-500";
      case "CRITICAL": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatTrainingData = () => {
    if (!trainingHistory) return [];
    return trainingHistory.loss.map((loss, i) => ({
      epoch: i + 1,
      train_loss: loss,
      val_loss: trainingHistory.val_loss[i],
      train_mae: trainingHistory.mae[i],
      val_mae: trainingHistory.val_mae[i],
    }));
  };

  const formatSampleData = (sample: SamplePrediction) => {
    return sample.days.map((day, i) => ({
      day: `Day ${day}`,
      actual: sample.actual[i],
      predicted: sample.predicted[i],
      error: Math.abs(sample.actual[i] - sample.predicted[i]),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto" />
          <p className="text-white text-lg">Loading LSTM Model Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-lg bg-slate-800/50 border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">{error}</p>
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Start the FastAPI server:</p>
              <code className="text-green-400 text-sm">
                cd ml && uvicorn api_server:app --reload --port 8000
              </code>
            </div>
            <Button onClick={fetchAllData} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              LSTM Demand Forecasting Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              PyTorch-based neural network predictions for food demand
            </p>
          </div>
          <Button onClick={fetchAllData} variant="outline" className="border-purple-500 text-purple-400">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Model Info Cards */}
        {modelInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Parameters</p>
                    <p className="text-2xl font-bold text-white">{modelInfo.total_parameters.toLocaleString()}</p>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">LSTM Units</p>
                    <p className="text-2xl font-bold text-white">{modelInfo.lstm_units.join(" → ")}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Input Window</p>
                    <p className="text-2xl font-bold text-white">{modelInfo.sequence_length} days</p>
                  </div>
                  <ChevronRight className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Forecast Horizon</p>
                    <p className="text-2xl font-bold text-white">{modelInfo.forecast_horizon} days</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="predictions" className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="predictions" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              NGO Predictions
            </TabsTrigger>
            <TabsTrigger value="training" className="data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4 mr-2" />
              Training History
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Model Evaluation
            </TabsTrigger>
            <TabsTrigger value="samples" className="data-[state=active]:bg-purple-600">
              <Target className="w-4 h-4 mr-2" />
              Sample Predictions
            </TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedNGO} onValueChange={setSelectedNGO}>
                <SelectTrigger className="w-64 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select NGO" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(predictions).map(([id, ngo]) => (
                    <SelectItem key={id} value={id} className="text-white hover:bg-slate-700">
                      {ngo.ngo_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNGO && predictions[selectedNGO] && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Chart */}
                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">7-Day Demand Forecast</CardTitle>
                    <CardDescription className="text-slate-400">
                      {predictions[selectedNGO].ngo_name} - with 95% confidence interval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={predictions[selectedNGO].daily_forecasts}>
                        <defs>
                          <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCI" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9ca3af"
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                        />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="upper_bound_95"
                          stroke="transparent"
                          fill="url(#colorCI)"
                          name="Upper 95% CI"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower_bound_95"
                          stroke="transparent"
                          fill="#1e293b"
                          name="Lower 95% CI"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="predicted_demand" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                          name="Predicted Demand"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Forecast Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-400">Average Daily</span>
                        <span className="text-xl font-bold text-white">
                          {predictions[selectedNGO].summary.average_daily_demand.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-400">Peak Demand</span>
                        <span className="text-xl font-bold text-orange-400">
                          {predictions[selectedNGO].summary.max_daily_demand.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-400">Min Demand</span>
                        <span className="text-xl font-bold text-green-400">
                          {predictions[selectedNGO].summary.min_daily_demand.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-400">7-Day Total</span>
                        <span className="text-xl font-bold text-purple-400">
                          {predictions[selectedNGO].summary.total_7day_demand.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-400">Baseline</span>
                        <span className="text-xl font-bold text-slate-300">
                          {predictions[selectedNGO].summary.baseline_demand}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-slate-400 text-sm mb-2">Daily Risk Levels</p>
                      <div className="flex flex-wrap gap-2">
                        {predictions[selectedNGO].daily_forecasts.map((f, i) => (
                          <Badge key={i} className={`${getRiskColor(f.risk_level)} text-white`}>
                            D{f.day_index}: {f.risk_level}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Score Chart */}
                <Card className="lg:col-span-3 bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Risk Score Over Forecast Period</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={predictions[selectedNGO].daily_forecasts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9ca3af"
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                        />
                        <YAxis stroke="#9ca3af" domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                        />
                        <Bar 
                          dataKey="risk_score" 
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                          name="Risk Score"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Training History Tab */}
          <TabsContent value="training" className="space-y-4">
            {trainingHistory && (
              <>
                {/* Final Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4 text-center">
                      <p className="text-slate-400 text-sm">Epochs Trained</p>
                      <p className="text-3xl font-bold text-white">{trainingHistory.final_metrics.epochs_trained}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4 text-center">
                      <p className="text-slate-400 text-sm">Train Loss</p>
                      <p className="text-3xl font-bold text-blue-400">{trainingHistory.final_metrics.train_loss.toFixed(4)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4 text-center">
                      <p className="text-slate-400 text-sm">Val Loss</p>
                      <p className="text-3xl font-bold text-purple-400">{trainingHistory.final_metrics.val_loss.toFixed(4)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4 text-center">
                      <p className="text-slate-400 text-sm">Train MAE</p>
                      <p className="text-3xl font-bold text-green-400">{trainingHistory.final_metrics.train_mae.toFixed(4)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4 text-center">
                      <p className="text-slate-400 text-sm">Val MAE</p>
                      <p className="text-3xl font-bold text-orange-400">{trainingHistory.final_metrics.val_mae.toFixed(4)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Training Curves */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Loss Curve</CardTitle>
                      <CardDescription className="text-slate-400">MSE Loss over training epochs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={formatTrainingData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="epoch" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="train_loss" stroke="#3b82f6" strokeWidth={2} name="Train Loss" dot={false} />
                          <Line type="monotone" dataKey="val_loss" stroke="#8b5cf6" strokeWidth={2} name="Val Loss" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">MAE Curve</CardTitle>
                      <CardDescription className="text-slate-400">Mean Absolute Error over training epochs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={formatTrainingData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="epoch" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="train_mae" stroke="#22c55e" strokeWidth={2} name="Train MAE" dot={false} />
                          <Line type="monotone" dataKey="val_mae" stroke="#f97316" strokeWidth={2} name="Val MAE" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Evaluation Tab */}
          <TabsContent value="evaluation" className="space-y-4">
            {perDayMetrics.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">MAE by Forecast Day</CardTitle>
                    <CardDescription className="text-slate-400">Error typically increases with forecast horizon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={perDayMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9ca3af" tickFormatter={(v) => `Day ${v}`} />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                        />
                        <Bar dataKey="mae" fill="#3b82f6" radius={[4, 4, 0, 0]} name="MAE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">RMSE by Forecast Day</CardTitle>
                    <CardDescription className="text-slate-400">Root Mean Squared Error penalizes larger errors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={perDayMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9ca3af" tickFormatter={(v) => `Day ${v}`} />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                        />
                        <Bar dataKey="rmse" fill="#f97316" radius={[4, 4, 0, 0]} name="RMSE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">R² Score by Forecast Day</CardTitle>
                    <CardDescription className="text-slate-400">Coefficient of determination (1.0 = perfect fit)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={perDayMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9ca3af" tickFormatter={(v) => `Day ${v}`} />
                        <YAxis stroke="#9ca3af" domain={[0, 1]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                        />
                        <Bar dataKey="r2" fill="#22c55e" radius={[4, 4, 0, 0]} name="R² Score" />
                        <Line type="monotone" dataKey="r2" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Metrics Table */}
                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Detailed Metrics by Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="py-3 px-4 text-slate-400 font-medium">Day</th>
                            <th className="py-3 px-4 text-slate-400 font-medium">MAE</th>
                            <th className="py-3 px-4 text-slate-400 font-medium">RMSE</th>
                            <th className="py-3 px-4 text-slate-400 font-medium">R²</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perDayMetrics.map((m) => (
                            <tr key={m.day} className="border-b border-slate-800">
                              <td className="py-3 px-4 text-white font-medium">Day {m.day}</td>
                              <td className="py-3 px-4 text-blue-400">{m.mae.toFixed(2)}</td>
                              <td className="py-3 px-4 text-orange-400">{m.rmse.toFixed(2)}</td>
                              <td className="py-3 px-4 text-green-400">{m.r2.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Sample Predictions Tab */}
          <TabsContent value="samples" className="space-y-4">
            {samplePredictions.length > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <Select value={selectedSample.toString()} onValueChange={(v) => setSelectedSample(parseInt(v))}>
                    <SelectTrigger className="w-64 bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select Sample" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {samplePredictions.map((_, i) => (
                        <SelectItem key={i} value={i.toString()} className="text-white hover:bg-slate-700">
                          Sample {i + 1} (Test ID: {samplePredictions[i].sample_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {samplePredictions[selectedSample] && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white">Actual vs Predicted - Sample {selectedSample + 1}</CardTitle>
                        <CardDescription className="text-slate-400">
                          Comparing ground truth with model predictions
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                          <ComposedChart data={formatSampleData(samplePredictions[selectedSample])}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="actual" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                              name="Actual"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="predicted" 
                              stroke="#f97316" 
                              strokeWidth={3}
                              strokeDasharray="5 5"
                              dot={{ fill: '#f97316', strokeWidth: 2, r: 6 }}
                              name="Predicted"
                            />
                            <Bar dataKey="error" fill="#ef444480" name="Absolute Error" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* All Samples Grid */}
                    <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white">All Test Samples Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {samplePredictions.map((sample, i) => (
                            <div 
                              key={i}
                              className={`p-4 rounded-lg cursor-pointer transition-all ${
                                i === selectedSample 
                                  ? 'bg-purple-600/30 border-2 border-purple-500' 
                                  : 'bg-slate-900/50 border border-slate-700 hover:border-slate-500'
                              }`}
                              onClick={() => setSelectedSample(i)}
                            >
                              <ResponsiveContainer width="100%" height={80}>
                                <LineChart data={formatSampleData(sample)}>
                                  <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                                  <Line type="monotone" dataKey="predicted" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                                </LineChart>
                              </ResponsiveContainer>
                              <p className="text-center text-sm text-slate-400 mt-2">Sample {i + 1}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
