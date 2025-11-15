// my-bill-tracker-frontend/src/pages/InfoPage.jsx
// NOTE: This file has been replaced by BillDetails.jsx and is no longer in use.
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

function BillDetails() {
  const { organizationId, billId } = useParams();
  const { authAxios } = useAuth();

  const [range, setRange] = useState('3m');
  const [data, setData] = useState([]);
  const [orgName, setOrgName] = useState('');
  const [billInfo, setBillInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [error, setError] = useState('');

  const ranges = [
    { label: '30 Days', value: '30d' },
    { label: '3 Months', value: '3m' },
    { label: '6 Months', value: '6m' },
    { label: '1 Year', value: '1y' },
    { label: '3 Years', value: '3y' },
    { label: 'All', value: 'all' },
  ];

  // -----------------------------
  // 1. Existing TIMESERIES fetch
  // -----------------------------
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

  // -----------------------------
  // 2. NEW Bill Info Fetch
  // -----------------------------
  useEffect(() => {
    const fetchBillInfo = async () => {
      try {
        setLoadingInfo(true);
        const res = await authAxios(
          `${config.BILL_PAYMENT_API_BASE_URL}/bills/${billId}/info`
        );
        if (!res.ok) throw new Error('Failed to fetch bill info');

        const info = await res.json();
        setBillInfo(info);
      } catch (err) {
        console.error('Error fetching bill info:', err);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchBillInfo();
  }, [billId, authAxios]);

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
        backgroundColor: 'rgba(99, 179, 237, 0.6)',
        borderColor: '#60a5fa',
        borderWidth: 1,
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
      legend: { display: true, labels: { color: '#ccc' } },
      tooltip: {
        backgroundColor: 'rgba(30,30,30,0.85)',
        titleColor: '#fff',
        bodyColor: '#eee',
        callbacks: { label: (ctx) => formatCurrency(ctx.parsed.y) },
      },
    },
    scales: {
      x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
    }
  };

  if (loading) return <div className="form-container">Loading chart...</div>;

  return (
    <div className="form-container">
      <h2>Payment History for {orgName}</h2>

      <div className="form-group">
        <label htmlFor="range">Time Range:</label>
        <select id="range" value={range} onChange={(e) => setRange(e.target.value)}>
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="chart-container" style={{ height: '350px', marginTop: '20px' }}>
        {data.length > 0 ? <Bar data={chartData} options={options} /> : <p>No data.</p>}
      </div>

      {/* ------------------------------ */}
      {/*      BILL INFORMATION PANEL     */}
      {/* ------------------------------ */}
      <h3 style={{ marginTop: '2rem' }}>Bill Details</h3>

      {loadingInfo ? (
        <p>Loading bill info…</p>
      ) : billInfo ? (
        <div className="bill-info-box">
          <p><strong>Bill Name:</strong> {billInfo.billName}</p>
          <p><strong>Bill ID:</strong> {billInfo.billId}</p>
          <p><strong>Organization:</strong> {billInfo.organizationName}</p>
          <p><strong>Account:</strong> {billInfo.accountNumber}</p>
          <p><strong>Frequency:</strong> {billInfo.frequency}</p>
          <p><strong>Due Day:</strong> {billInfo.dueDay ?? '—'}</p>
          <p><strong>Typical Amount:</strong> {billInfo.typicalAmount ? formatCurrency(billInfo.typicalAmount) : '—'}</p>
          <p><strong>Notes:</strong> {billInfo.notes || '—'}</p>
          <p><strong>Created:</strong> {billInfo.billCreatedAt?.split('T')[0]}</p>
          <p><strong>Updated:</strong> {billInfo.billUpdatedAt?.split('T')[0]}</p>
          <p><strong>Creator:</strong> {billInfo.creatorName}</p>
        </div>
      ) : (
        <p>No bill info found.</p>
      )}

      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <Link to="/" className="action-link back-link">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default BillDetails;
