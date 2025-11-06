// my-bill-tracker-frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import config from '../config.js';
import './Dashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Legend,
    Tooltip,
    TimeScale,
    ScatterController
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { addMonths, startOfMonth, endOfMonth, startOfWeek, addDays, format } from 'date-fns';

// Transparent background plugin (register once globally)
const transparentBackground = {
  id: 'transparentBackground',
  beforeDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

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
      const curr = new Date(labels[i]);
      const prev = new Date(labels[i - 1]);
      if (curr.getMonth() !== prev.getMonth()) {
        const xPos = x.getPixelForValue(curr);
        ctx.beginPath();
        ctx.moveTo(xPos, y.top);
        ctx.lineTo(xPos, y.bottom);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

// ✅ Register all once globally
ChartJS.register(
  LineElement,
  ScatterController,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  TimeScale,
  transparentBackground,
  monthSeparatorPlugin
);


function Dashboard() {
    const { authAxios, isAuthenticated, loading } = useAuth();
    const location = useLocation(); // Hook to access navigation state

    const [organizations, setOrganizations] = useState([]);
    const [upcomingBills, setUpcomingBills] = useState([]);
    const [recentlyPaidBills, setRecentlyPaidBills] = useState([]);
    const [recurringBills, setRecurringBills] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState(null);

    const [isOrganizationsCollapsed, setIsOrganizationsCollapsed] = useState(true);
    const [isUpcomingBillsCollapsed, setIsUpcomingBillsCollapsed] = useState(false);
    const [isRecentlyPaidCollapsed, setIsRecentlyPaidCollapsed] = useState(true);
    const [paidBillsLimit, setPaidBillsLimit] = useState(10);
    const [monthlyOverview, setMonthlyOverview] = useState(null);
    const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(true);

    // This fetchData function is now defined outside useEffect so we can call it on demand
    const fetchData = async () => {
        setIsFetching(true);
        try {
            const [orgsRes, overviewRes, upcomingRes, paidRes, billsRes] = await Promise.all([
                authAxios(config.ORGANIZATION_API_BASE_URL),
                authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/monthly-overview`),
                authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/upcoming`),
                authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/recently-paid`),
                authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`)
            ]);

            if (!orgsRes.ok || !upcomingRes.ok || !paidRes.ok || !billsRes.ok) {
                throw new Error('Failed to load all dashboard data.');
            }

            const orgsData = await orgsRes.json();
            const upcomingData = await upcomingRes.json();
            const paidData = await paidRes.json();
            const billsData = await billsRes.json();
            
            if (!overviewRes.ok) throw new Error('Failed to load monthly overview data');
            const overviewData = await overviewRes.json();

            setOrganizations(orgsData.organizations || []);
            setUpcomingBills(upcomingData || []);
            setRecentlyPaidBills(paidData || []);
            setRecurringBills(billsData || []);
            setMonthlyOverview(overviewData); // <-- direct assignment

        } catch (err) {
            console.error(err);
            setError("Failed to load dashboard data. Please try again.");
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && !loading) {
            fetchData();
        }
        // If we navigated here with a 'refresh' state, clear it after fetching to prevent loops
        if (location.state?.refresh) {
            window.history.replaceState({}, document.title)
        }
    }, [isAuthenticated, loading, authAxios, location.state?.refresh]); // Re-run effect if refresh state is present

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };
    
    const recentlyPaidBillsToShow = recentlyPaidBills.slice(0, paidBillsLimit);
    const hasMorePaidBills = recentlyPaidBills.length > paidBillsLimit;

    if (loading || isFetching) return <div className="dashboard-container">Loading dashboard...</div>;

    // === Months Overview ===
    const buildMonthlyTrendData = () => {
        if (!monthlyOverview) return null;

        const { labels, paid, due } = monthlyOverview;

        const dates = labels.map(date => new Date(date));

        return {
            labels: dates,
            datasets: [
                // === Lollipop stems for Total Paid ===
                {
                    label: 'Total Paid (Stem)',
                    type: 'bar',
                    data: paid,
                    backgroundColor: '#4ade80',
                    barPercentage: 0.05, // very thin vertical lines
                    categoryPercentage: 1,
                    borderRadius: 0,
                },
                // === Circles on top of stems ===
                {
                    label: 'Total Paid (Circle)',
                    type: 'scatter',
                    data: dates.map((d, i) => ({ x: d, y: paid[i] })),
                    backgroundColor: '#4ade80',
                    borderColor: '#4ade80',
                    pointStyle: 'circle',
                    radius: 5,
                },
                // === Total Due as regular filled line ===
                {
                    label: 'Total Due',
                    data: due,
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 0,
                }
            ],
        };
    };

    const monthlyTrendData = buildMonthlyTrendData();


    return (
        <div className="dashboard-container">
            {error && <p className="error-message">{error}</p>}

            {/* === Month Overview Chart (New) === */}
            {monthlyOverview && (
                <section className="dashboard-section monthly-trend">
                    <h3 className="collapsible-header">📊 Month At A Glance</h3>
                    <div className="chart-container" style={{ height: '300px', marginBottom: '20px' }}>
                        <Line
                            data={buildMonthlyTrendData()}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { color: '#eee', font: { size: 13, weight: '500' } } },
                                    tooltip: {
                                        callbacks: {
                                            label: (ctx) => `${ctx.dataset.label.replace(' (Stem)', '')}: ${formatCurrency(ctx.parsed.y)}`,
                                        },
                                    },
                                },
                                scales: {
                                    x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MM/dd' } }, ticks: { color: '#ddd' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                                    y: { beginAtZero: true, title: { display: true, text: 'Amount ($)', color: '#bbb' }, ticks: { color: '#ddd' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                                },
                            }}

                            height={250}
                        />
                    </div>
                </section>
            )}


            {/* Upcoming Bills Section */}
            <section className="dashboard-section upcoming-bills">
                <h3 onClick={() => setIsUpcomingBillsCollapsed(!isUpcomingBillsCollapsed)} className="collapsible-header">
                    <FontAwesomeIcon icon={isUpcomingBillsCollapsed ? faChevronRight : faChevronDown} /> 📅 Upcoming Bills Due
                </h3>
                {!isUpcomingBillsCollapsed && (
                    <ul>
                        {upcomingBills.length > 0 ? upcomingBills.map(bill => (
                            <li key={bill.id} className="bill-item upcoming-item">
                                <div>
                                    <span className="bill-org">{bill.organizationName}</span>
                                    {bill.billName && <span className="bill-name"> ({bill.billName})</span>} -
                                    <span className="due-date"> Due {formatDate(bill.dueDate)}: </span>
                                    <span>{formatCurrency(bill.amountDue)}</span>
                                </div>
                                <Link to={`/record-payment?paymentId=${bill.id}`} className="action-link record-link">Record Payment</Link>
                            </li>
                        )) : <p>No upcoming bills.</p>}
                    </ul>
                )}
            </section>

            {/* Organizations & Recurring Bills Section */}
            <section className="dashboard-section bill-organizations">
                <h3 onClick={() => setIsOrganizationsCollapsed(!isOrganizationsCollapsed)} className="collapsible-header">
                    <FontAwesomeIcon icon={isOrganizationsCollapsed ? faChevronRight : faChevronDown} /> 🏠 Your Bill Organizations
                </h3>
                {!isOrganizationsCollapsed && (
                    <ul>
                        {organizations.length > 0 ? organizations.map(org => {
                            const billsForThisOrg = recurringBills.filter(bill => bill.organizationId === org.id);
                            return (
                                <li key={org.id} className="bill-item organization-group">
                                    <div className="organization-header">
                                        <div>
                                            <span className="bill-org">{org.name}</span>
                                            <span> (Account: {org.accountNumber || 'N/A'})</span>
                                        </div>
                                        <div className="item-actions">
                                            {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="action-link website-link">Visit Website</a>}
                                            <Link to={`/organizations/${org.id}`} className="action-link edit-link">Edit</Link>
                                            <Link to={`/organizations/${org.id}/info`} className="action-link info-link">Info</Link>
                                        </div>
                                    </div>
                                    {/* Render recurring bills if they exist */}
                                    {billsForThisOrg.length > 0 && (
                                        <ul className="recurring-bills-sublist">
                                            {billsForThisOrg.map(bill => (
                                                <li key={bill.id} className="bill-item sub-item">
                                                    <span>{bill.billName} (Typically ~{formatCurrency(bill.typicalAmount)})</span>
                                                    <Link to={`/record-payment?organizationId=${org.id}&billId=${bill.id}`} className="action-link record-link">Record Payment</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {/* FIX: Render a generic "Record Payment" button if NO recurring bills exist for this org */}
                                    {billsForThisOrg.length === 0 && (
                                         <div className="ad-hoc-payment-link">
                                            <Link to={`/record-payment?organizationId=${org.id}`} className="action-link record-link">Record Ad-Hoc Payment</Link>
                                        </div>
                                    )}
                                </li>
                            );
                        }) : <p>No billing organizations added yet.</p>}
                    </ul>
                )}
            </section>

            {/* Recently Paid Section */}
            <section className="dashboard-section recently-paid">
                 <h3 onClick={() => setIsRecentlyPaidCollapsed(!isRecentlyPaidCollapsed)} className="collapsible-header">
                    <FontAwesomeIcon icon={isRecentlyPaidCollapsed ? faChevronRight : faChevronDown} /> ✅ Recently Paid Bills
                </h3>
                {!isRecentlyPaidCollapsed && (
                    <>
                        <ul>
                            {recentlyPaidBillsToShow.length > 0 ? recentlyPaidBillsToShow.map(bill => (
                                 <li key={bill.id} className="bill-item paid-item">
                                    <span className="bill-org">{bill.organizationName}</span>
                                    {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                                    <span> - Paid: {formatCurrency(bill.amountPaid)}</span>
                                    <span className="paid-date"> on {formatDate(bill.datePaid)}</span>
                                </li>
                            )) : <p>No recently paid bills.</p>}
                        </ul>
                        {hasMorePaidBills && (
                            <button onClick={() => setPaidBillsLimit(prev => prev + 10)} className="load-more-btn">
                                Load more...
                            </button>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

export default Dashboard;