// my-bill-tracker-frontend/src/pages/InfoPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import config from '../config.js';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';
import './Forms.css';

// Register base Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

function InfoPage() {
  const { id: organizationId } = useParams();
  const { authAxios } = useAuth();

  const [range, setRange] = useState('3m');
  const [data, setData] = useState([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const ranges = [
    { label: '30 Days', value: '30d' },
    { label: '3 Months', value: '3m' },
    { label: '6 Months', value: '6m' },
    { label: '1 Year', value: '1y' },
    { label: '3 Years', value: '3y' },
    { label: 'All', value: 'all' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await authAxios(
          `${config.BILL_PAYMENT_API_BASE_URL}/payments/organization/${organizationId}/timeseries?range=${range}`
        );
        if (!res.ok) throw new Error('Failed to fetch payment data');

        const json = await res.json();
        setData(json.data || []);
        setOrgName(json.organizationName || '');
      } catch (err) {
        console.error('Error fetching org timeseries:', err);
        setError('Unable to load payment info.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, range, authAxios]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  // Format dates as MM/DD in local timezone
  const labels = data.map((d) =>
    new Date(d.date).toLocaleDateString(undefined, {
      month: '2-digit',
      day: '2-digit',
    })
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total Paid',
        data: data.map((d) => d.total),
        backgroundColor: 'rgba(99, 179, 237, 0.6)', // bright blue
        borderColor: '#60a5fa',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(99, 179, 237, 0.8)',
      },
    ],
  };

  // --- 💡 Month Separator Plugin ---
  const monthSeparatorPlugin = {
    id: 'monthSeparators',
    afterDraw(chart) {
      const { ctx, scales: { x, y } } = chart;
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return;

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;

      for (let i = 1; i < labels.length; i++) {
        const curr = new Date(chart.data.labels[i]);
        const prev = new Date(chart.data.labels[i - 1]);
        if (curr.getMonth() !== prev.getMonth()) {
          const xPos = x.getPixelForValue(i);
          ctx.beginPath();
          ctx.moveTo(xPos, y.top);
          ctx.lineTo(xPos, y.bottom);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  };

  // Register the plugin (safe inside render since ChartJS caches by ID)
  ChartJS.register(monthSeparatorPlugin);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#ccc' },
      },
      tooltip: {
        backgroundColor: 'rgba(30,30,30,0.85)',
        titleColor: '#fff',
        bodyColor: '#eee',
        callbacks: {
          label: (ctx) => formatCurrency(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Date', color: '#ccc' },
        ticks: {
          color: '#ccc',
          autoSkip: true,
          maxRotation: 0,
        },
        grid: {
          color: 'rgba(255,255,255,0.1)',
          borderDash: [3, 3],
        },
      },
      y: {
        title: { display: true, text: 'Amount ($)', color: '#ccc' },
        ticks: { color: '#ccc' },
        grid: { color: 'rgba(255,255,255,0.1)', borderDash: [3, 3] },
        beginAtZero: true,
      },
    },
    backgroundColor: 'transparent', // ✅ fits dark mode
  };

  if (loading)
    return <div className="form-container">Loading chart...</div>;
  if (error)
    return <div className="form-container error-message">{error}</div>;

  return (
    <div className="form-container">
      <h2>Payment History for {orgName || `Organization #${organizationId}`}</h2>

      <div className="form-group">
        <label htmlFor="range">Time Range:</label>
        <select
          id="range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="chart-container"
        style={{
          height: '350px',
          marginTop: '20px',
          backgroundColor: 'transparent',
        }}
      >
        {data.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <p>No payment data for selected range.</p>
        )}
      </div>

      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <Link to="/" className="action-link back-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default InfoPage;
