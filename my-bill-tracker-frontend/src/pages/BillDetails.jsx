// my-bill-tracker-frontend/src/pages/BillDetails.jsx
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
  Tooltip
} from 'chart.js';
import './Forms.css'; 
import './BillDetails.css';

// Register chart components
ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

// Month-separator plugin
const monthSeparatorPlugin = {
  id: 'monthSeparators',
  afterDraw(chart) {
    const { ctx, scales: { x, y } } = chart;
    const labels = chart.data.labels;
    if (!labels?.length) return;

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
ChartJS.register(monthSeparatorPlugin);

function BillDetails() {
  const { organizationId, billId } = useParams();
  const { authAxios } = useAuth();

  const [range, setRange] = useState('3m');

  // Data sets
  const [chartDataArr, setChartDataArr] = useState([]);
  const [billInfo, setBillInfo] = useState(null);
  const [orgName, setOrgName] = useState('');

  const [loadingChart, setLoadingChart] = useState(true);
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

  // --- Fetch the Chart Data ---
  useEffect(() => {
    const fetchChart = async () => {
      try {
        setLoadingChart(true);
        const res = await authAxios(
          `${config.BILL_PAYMENT_API_BASE_URL}/payments/organization/${organizationId}/timeseries?range=${range}`
        );
        if (!res.ok) throw new Error('Failed chart fetch');

        const json = await res.json();
        setChartDataArr(json.data || []);
        setOrgName(json.organizationName || '');
      } catch (err) {
        console.error(err);
        setError('Unable to load chart data.');
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, [organizationId, range, authAxios]);

  // --- Fetch the Bill Info ---
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setLoadingInfo(true);
        const res = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills/${billId}/info`);
        if (!res.ok) throw new Error('Failed to fetch bill info');

        const json = await res.json();
        setBillInfo(json);
      } catch (err) {
        console.error(err);
        setError('Unable to load bill info.');
      } finally {
        setLoadingInfo(false);
      }
    };
    fetchInfo();
  }, [billId, authAxios]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // Build chart
  const labels = chartDataArr.map((d) =>
    new Date(d.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total Paid',
        data: chartDataArr.map((d) => d.total),
        backgroundColor: 'rgba(99, 179, 237, 0.6)',
        borderColor: '#60a5fa',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(99, 179, 237, 0.8)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#ccc' } },
      tooltip: {
        callbacks: {
          label: (ctx) => formatCurrency(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#ccc' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#ccc' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
    },
  };

  return (
    <div className="info-page-container">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs">
        <Link to="/">Dashboard</Link> <span>/</span>
        <Link to={`/organizations/${organizationId}`}>{orgName || 'Organization'}</Link> <span>/</span>
        <span className="current">Bill Info</span>
      </nav>

      {/* Page Title */}
      <h2 className="info-title">Bill Details</h2>

      {/* --- Chart Section --- */}
      <section className="info-section">
        <div className="info-section-header">
          <h3>Payment History</h3>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {ranges.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="chart-container" style={{ height: '350px' }}>
          {loadingChart ? (
            <div className="skeleton-chart"></div>
          ) : chartDataArr.length ? (
            <Bar data={chartData} options={options} />
          ) : (
            <p>No payment data for this bill.</p>
          )}
        </div>
      </section>

      {/* --- Bill Details Panel --- */}
      <section className="info-section">
        <h3>Bill Information</h3>

        {loadingInfo ? (
          <div className="details-grid skeleton-details"></div>
        ) : billInfo ? (
          <div className="details-grid">
            <div><strong>Bill Name:</strong> {billInfo?.billName || '—'}</div>
            <div><strong>Bill ID:</strong> {billInfo?.id || '—'}</div>
            <div><strong>Organization:</strong> {billInfo?.organizationName || '—'}</div>
            <div><strong>Account Number:</strong> {billInfo?.accountNumber || '—'}</div>
            <div>
              <strong>Typical Amount:</strong> {Number.isFinite(parseFloat(billInfo?.typicalAmount)) ? formatCurrency(billInfo.typicalAmount) : '—'}
            </div>
            <div><strong>Frequency:</strong> {billInfo?.frequency || '—'}</div>
            <div><strong>Typical Due Day:</strong> {billInfo?.dueDay ?? '—'}</div>
            <div><strong>Created At:</strong> {formatDate(billInfo?.billCreatedAt)}</div>
            <div><strong>Updated At:</strong> {formatDate(billInfo?.billUpdatedAt)}</div>
            <div><strong>Created By:</strong> {billInfo?.creatorName || '—'}</div>
            <div className="notes-full">
              <strong>Notes:</strong>
              <p>{billInfo?.notes || '—'}</p>
            </div>
          </div>
        ) : (
          <p className="error-message">Could not load bill info.</p>
        )}
      </section>

      {/* Actions */}
      <div className="info-actions">
        <Link
          to={`/bills/${billId}`}
          className="action-link edit-link"
        >
          ✏️ Edit Bill
        </Link>

        <Link to="/" className="action-link back-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default BillDetails;
