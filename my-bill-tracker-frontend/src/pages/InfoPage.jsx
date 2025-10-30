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
        const res = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/organization/${organizationId}/timeseries?range=${range}`);
        if (!res.ok) throw new Error('Failed to fetch payment data');
        const json = await res.json();

        console.log('Fetched timeseries JSON:', json);

        setData(Array.isArray(json.data) ? json.data : []);
        setOrgName(json.organizationName || '');
      } catch (err) {
        setError('Unable to load payment info.');
        setError('Unable to load payment info.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [organizationId, range, authAxios]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const chartData = {
    labels: data.map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Total Paid',
        data: data.map((d) => d.total), // ✅ use 'total', not 'amount'
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatCurrency(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: {
        title: { display: true, text: 'Amount ($)' },
        beginAtZero: true,
      },
    },
  };

  if (loading) return <div className="form-container">Loading chart...</div>;
  if (error) return <div className="form-container error-message">{error}</div>;

  return (
    <div className="form-container">
      <h2>Payment History for {orgName || `Organization #${organizationId}`}</h2>

      <div className="form-group">
        <label htmlFor="range">Time Range:</label>
        <select id="range" value={range} onChange={(e) => setRange(e.target.value)}>
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="chart-container" style={{ height: '350px', marginTop: '20px' }}>
        {data.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <p>No payment data for selected range.</p>
        )}
      </div>

      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <Link to="/" className="action-link back-link">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default InfoPage;
