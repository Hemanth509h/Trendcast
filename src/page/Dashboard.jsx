import React, { useState, useEffect } from "react";
import { apiCall } from "../utils/api";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import "./dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    growth: 0,
  });
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiCall("/api/sales");
      console.log("Dashboard data fetched:", data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        // Calculate basic stats
        const totalSales = data.reduce((sum, item) => sum + (Number(item.weekly_sales || item.Weekly_Sales) || 0), 0);
        const totalOrders = data.length;
        const avgOrderValue = totalSales / totalOrders;
        
        setStats({
          totalSales: totalSales.toLocaleString(undefined, { maximumFractionDigits: 2 }),
          totalOrders: totalOrders.toLocaleString(),
          avgOrderValue: avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 }),
          growth: 12.5 // Placeholder growth
        });

        // Prepare chart data (group by date)
        const sortedData = [...data].sort((a, b) => new Date(a.date || a.Date) - new Date(b.date || b.Date)).slice(-12);
        setChartData({
          labels: sortedData.map(item => item.date || item.Date),
          datasets: [
            {
              label: 'Recent Sales',
              data: sortedData.map(item => item.weekly_sales || item.Weekly_Sales),
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'rgba(99, 102, 241, 0.5)',
              tension: 0.3,
            },
          ],
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setLoading(false);
    }
  };

  if (loading && false) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back! Here's what's happening with your sales.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue-100 text-blue-600">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Sales</span>
            <h3 className="stat-value">₹{stats.totalSales}</h3>
            <span className="stat-trend positive">
              <ArrowUpRight size={16} /> 12%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green-100 text-green-600">
            <ShoppingCart size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Orders</span>
            <h3 className="stat-value">{stats.totalOrders}</h3>
            <span className="stat-trend positive">
              <ArrowUpRight size={16} /> 8%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100 text-purple-600">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg. Order Value</span>
            <h3 className="stat-value">₹{stats.avgOrderValue}</h3>
            <span className="stat-trend negative">
              <ArrowDownRight size={16} /> 3%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-indigo-100 text-indigo-600">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Growth Rate</span>
            <h3 className="stat-value">{stats.growth}%</h3>
            <span className="stat-trend positive">
              <ArrowUpRight size={16} /> 2%
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-container card">
          <h3>Sales Trend (Last 12 Records)</h3>
          {chartData ? (
            <Line 
              data={chartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }} 
            />
          ) : (
            <div className="no-data">No sales data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
