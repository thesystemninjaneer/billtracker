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
    BarController,
    ScatterController
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { addDays, format } from 'date-fns';

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

        // Iterate through all data points
        for (let i = 1; i < labels.length; i++) {
            const curr = new Date(labels[i]);
            const prev = new Date(labels[i - 1]);
            
            // Check if the month has changed (using UTC methods for consistency with TimeScale)
            if (curr.getUTCFullYear() !== prev.getUTCFullYear() || curr.getUTCMonth() !== prev.getUTCMonth()) {
                // Get the pixel position for the start of the current month
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

// Register all once globally
ChartJS.register(
    LineElement,
    BarController,
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
    const location = useLocation();

    const [organizations, setOrganizations] = useState([]);
    const [upcomingBills, setUpcomingBills] = useState([]);
    const [recentlyPaidBills, setRecentlyPaidBills] = useState([]);
    const [recurringBills, setRecurringBills] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isOrganizationsCollapsed, setIsOrganizationsCollapsed] = useState(true);
    const [isUpcomingBillsCollapsed, setIsUpcomingBillsCollapsed] = useState(false);
    const [isRecentlyPaidCollapsed, setIsRecentlyPaidCollapsed] = useState(true);
    const [paidBillsLimit, setPaidBillsLimit] = useState(10);
    const [monthlyOverview, setMonthlyOverview] = useState(null);
    const [orgsLimit, setOrgsLimit] = useState(10); // Number of organizations to show per page

    const [error, setError] = useState(null);

    const fetchLastPaidForBill = async (billId) => {
        try {
            const res = await authAxios(
                `${config.BILL_PAYMENT_API_BASE_URL}/payments/bill/${billId}/last-paid`
            );

            if (!res.ok) return null;
            return await res.json(); // { id, datePaid, amountPaid }
        } catch (err) {
            console.error(`Failed to fetch last-paid for bill ${billId}`, err);
            return null;
        }
    };

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

            if (!overviewRes.ok) { 
                throw new Error('Failed to load dashboard data.');
            }
            
            const orgsData = await orgsRes.json();
            const upcomingData = await upcomingRes.json();
            const paidData = await paidRes.json();
            const billsData = await billsRes.json();
            const overviewData = await overviewRes.json();

            setOrganizations(orgsData.organizations || []);
            // include last-paid info per bill
            const enrichedUpcoming = await Promise.all(
                (upcomingData || []).map(async bill => {
                    if (!bill.billId) return bill;

                    const lastPaid = await fetchLastPaidForBill(bill.billId);

                    return {
                        ...bill,
                        lastPaidDate: lastPaid?.datePaid || null,
                        lastPaidAmount: lastPaid?.amountPaid || null,
                    };
                })
            );
            setUpcomingBills(enrichedUpcoming);
            setRecentlyPaidBills(paidData || []);
            setRecurringBills(billsData || []);
            setMonthlyOverview(overviewData);

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
        if (location.state?.refresh) {
            window.history.replaceState({}, document.title)
        }
    }, [isAuthenticated, loading, authAxios, location.state?.refresh]);

    useEffect(() => {
        const badRows = recentlyPaidBills.filter(bill => !bill?.id);
        if (badRows.length > 0) {
            console.error('Recently paid bills missing payment id');
        }
    }, [recentlyPaidBills]);

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
 
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: clientTimeZone
        });
    };
    
    const formatDateShort = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
            timeZone: clientTimeZone
        });
    };

    const recentlyPaidBillsToShow = recentlyPaidBills.slice(0, paidBillsLimit);
    const hasMorePaidBills = recentlyPaidBills.length > paidBillsLimit;
    const organizationsToShow = organizations.slice(0, orgsLimit);
    const hasMoreOrgs = organizations.length > orgsLimit;

    if (loading || isFetching) return <div className="dashboard-container">Loading dashboard...</div>;

    // === Monthly Trend Data Builder (Tally Logic Implemented) ===
    const buildMonthlyTrendData = () => {
        if (!monthlyOverview) return null;

        const { labels, paid, due } = monthlyOverview;
        const dates = labels.map(date => new Date(date));
        
        // --- Tally Trace Calculation (New Logic) ---
        // 1. Calculate the initial starting value: Sum of all DUE amounts.
        const initialLiability = due.reduce((sum, amount) => sum + amount, 0);
        
        let runningLiability = initialLiability;
        let cumulativeLiabilityData = [];
        
        // 2. Define the start point (one day before the first data point)
        const firstDate = dates[0];
        const dayBeforeFirst = addDays(firstDate, -1); 
        
        // Add the starting point at the total sum
        cumulativeLiabilityData.push({ x: dayBeforeFirst, y: initialLiability });
        
        // 3. Iterate through the dates: Subtract Paid amount each day
        for (let i = 0; i < dates.length; i++) {
             const date = dates[i];
             
             // The liability decreases ONLY by the Amount PAID
             runningLiability -= paid[i];
             
             cumulativeLiabilityData.push({ x: date, y: runningLiability });
        }
        
        // FIX: Ensure the line holds the final value across the rest of the chart's visible X-axis range.
        if (cumulativeLiabilityData.length > 0 && dates.length > 0) {
            const finalBalance = runningLiability;
            const lastDate = dates[dates.length - 1];
            // Add a point one day after the last date to stabilize the line horizontally.
            const dayAfterLast = addDays(lastDate, 1);
            
            cumulativeLiabilityData.push({ x: dayAfterLast, y: finalBalance });
        }
        // --- End Tally Trace Calculation ---

        return {
            labels: dates,
            datasets: [
                // 1. Amount Paid (Stem) - Green
                {
                    label: 'Amount Paid (Stem)',
                    type: 'bar',
                    data: paid,
                    backgroundColor: '#4ade80',
                    barPercentage: 0.05,
                    categoryPercentage: 1,
                    borderRadius: 0,
                    pointStyle: false,
                    // REMOVED: hidden: true
                    yAxisID: 'y'
                },
                // 2. Amount Paid (Circle) - Green
                {
                    label: 'Amount Paid', 
                    type: 'scatter',
                    data: dates.map((d, i) => ({ x: d, y: paid[i] })),
                    backgroundColor: '#4ade80',
                    borderColor: '#4ade80',
                    pointStyle: 'circle',
                    radius: 5,
                    yAxisID: 'y'
                },
                // 3. Amount Due (Stem) - Red
                {
                    label: 'Amount Due (Stem)',
                    type: 'bar',
                    data: due,
                    backgroundColor: '#f87171',
                    barPercentage: 0.05,
                    categoryPercentage: 1,
                    borderRadius: 0,
                    pointStyle: false,
                    // REMOVED: hidden: true
                    yAxisID: 'y'
                },
                // 4. Amount Due (Circle) - Red
                {
                    label: 'Amount Due', 
                    type: 'scatter',
                    data: dates.map((d, i) => ({ x: d, y: due[i] })),
                    backgroundColor: '#f87171',
                    borderColor: '#f87171',
                    pointStyle: 'circle',
                    radius: 5,
                    yAxisID: 'y'
                },
                // 5. Total Due Trace (Cumulative) - Single Solid Line
                {
                    label: 'Total Due', // Represents the cumulative amount remaining
                    type: 'line',
                    data: cumulativeLiabilityData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.2,
                    spanGaps: false,
                    yAxisID: 'y2',
                },
            ],
        };
    };

    const monthlyTrendData = buildMonthlyTrendData();


    return (
        <div className="dashboard-container">
            {error && <p className="error-message">{error}</p>}

            {/* === Month Overview Chart === */}
            {monthlyOverview && monthlyTrendData && (
                <section className="dashboard-section monthly-trend">
                    <h3 className="collapsible-header">📊 This Month At A Glance</h3>
                    <div className="chart-container" style={{ height: '350px', marginBottom: '20px' }}>
                        <Line
                            data={monthlyTrendData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: {
                                    mode: 'index',
                                    intersect: false,
                                },
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            // Handle both axes and filter out stem datasets
                                            label: (ctx) => {
                                                const label = ctx.dataset.label.replace(' (Stem)', '');
                                                const value = ctx.parsed.y;
                                                return `${label}: ${formatCurrency(value)}`;
                                            },
                                        },
                                    },
                                    legend: { 
                                        position: 'bottom', 
                                        labels: { 
                                            color: '#eee', 
                                            font: { size: 13, weight: '500' },
                                            // Filter out all (Stem) datasets
                                            filter: (item) => !item.text.includes('(Stem)')
                                        } 
                                    },
                                },
                                scales: {
                                    // Primary Y-Axis (Left) for Daily Amounts
                                    y: { 
                                        beginAtZero: true, 
                                        title: { display: true, text: 'Daily Amount ($)', color: '#bbb' }, 
                                        ticks: { color: '#ddd' }, 
                                        grid: { color: 'rgba(255,255,255,0.08)' } 
                                    },
                                    // Secondary Y-Axis (Right) for Tally/Liability
                                    y2: { 
                                        position: 'right', 
                                        beginAtZero: true, // <-- Changed to true
                                        title: { display: true, text: 'Total Due ($)', color: '#bbb' }, 
                                        ticks: { color: '#ddd' }, 
                                        grid: { drawOnChartArea: false }, // Only draw grid for y axis
                                    },
                                    x: { 
                                        type: 'time', 
                                        time: { 
                                            unit: 'day', 
                                            displayFormats: { 
                                                day: 'MM/dd'
                                            },
                                            tooltipFormat: 'MMM dd, yyyy'
                                        }, 
                                        ticks: { color: '#ddd' }, 
                                        grid: { color: 'rgba(255,255,255,0.05)' } 
                                    },
                                },
                            }}
                            height={300}
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

                                    {bill.billName && (
                                        <Link 
                                            to={`/organizations/${bill.organizationId}/bills/${bill.billId}/info`}
                                            className="bill-name"
                                            style={{ marginLeft: '5px', color: '#2563eb', textDecoration: 'none' }}
                                        >
                                            ({bill.billName})
                                        </Link>
                                    )}
                                    <span>
                                        {' – Due: '}{formatDateShort(bill.dueDate)}{' '}{formatCurrency(bill.amountDue)}

                                        {bill.lastPaidDate && bill.lastPaidAmount 
                                            ? ` – Last payment: ${formatCurrency(bill.lastPaidAmount)} on ${formatDateShort(bill.lastPaidDate)}`
                                            : ' – Last payment: None'}
                                    </span>
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
                        {organizationsToShow.length > 0 ? organizationsToShow.map(org => {
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
                                        </div>
                                    </div>
                                    {billsForThisOrg.length > 0 && (
                                        <ul className="recurring-bills-sublist">
                                            {billsForThisOrg.map(bill => (
                                                <li key={bill.id} className="bill-item sub-item">
                                                    <span>{bill.billName} (Typically ~{formatCurrency(bill.typicalAmount)})</span>
                                                    <Link to={`/record-payment?organizationId=${org.id}&billId=${bill.id}`} className="action-link record-link">Record Payment</Link>
                                                    <Link to={`/organizations/${org.id}/bills/${bill.id}/info`} className="action-link info-link">Info</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {billsForThisOrg.length === 0 && (
                                        <div className="ad-hoc-payment-link">
                                            <Link to={`/record-payment?organizationId=${org.id}`} className="action-link record-link">Record Ad-Hoc Payment</Link>
                                        </div>
                                    )}
                                </li>
                            );
                        }) : <p>No billing organizations added yet.</p>}

                        {hasMoreOrgs && (
                            <button onClick={() => setOrgsLimit(prev => prev + 5)} className="load-more-btn">
                                Load more...
                            </button>
                        )}

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
                            <div className="paid-info-left">
                            <span className="bill-org">{bill.organizationName}</span>
                            {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                            <span> - Paid: {formatCurrency(bill.amountPaid)}</span>
                            <span className="paid-date"> on {formatDate(bill.datePaid)}</span>
                            {bill.confirmationCode && <span className="confirmation-code"> | Confirmation: {bill.confirmationCode}</span>}
                            </div>
                            {bill.id && (
                            <Link to={`/payments/${bill.id}`} className="action-link info-link">
                                Info
                            </Link>
                            )}
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