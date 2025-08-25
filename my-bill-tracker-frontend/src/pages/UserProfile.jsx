// my-bill-tracker-frontend/src/pages/UserProfile.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import config from '../config';

const UserProfile = () => {
  const { token: authToken, isAuthenticated, loading: authLoading, authAxios, user: authContextUser, setUser: setAuthContextUser } = useContext(AuthContext);
  const { addNotification } = useNotification();

  // State for User Profile
  const [userProfile, setUserProfile] = useState({
    username: '',
    email: '',
  });

  // State for Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    is_email_notification_enabled: false,
    is_slack_notification_enabled: false,
    slack_webhook_url: '',
    in_app_alerts_enabled: false,
    notification_time_offsets: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [newOffsetInput, setNewOffsetInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !authToken) return;

      try {
        // --- Fetch User Profile ---
        const userProfileResponse = await authAxios(`${config.USER_API_BASE_URL}/profile`);

        if (!userProfileResponse.ok) {
          const errorData = await userProfileResponse.json();
          throw new Error(errorData.message || 'Failed to fetch user profile');
        }
        const userProfileData = await userProfileResponse.json();
        setUserProfile({
          username: userProfileData.user.username,
          email: userProfileData.user.email,
        });

        // --- Fetch Notification Settings ---
        // FIX: Corrected URL construction. Removed duplicated '/api/users'.
        const notificationSettingsResponse = await authAxios(`${config.USER_API_BASE_URL}/me/notifications`);

        if (!notificationSettingsResponse.ok) {
          const errorData = await notificationSettingsResponse.json();
          throw new Error(errorData.message || 'Failed to fetch notification settings');
        }
        const notificationSettingsData = await notificationSettingsResponse.json();
        setNotificationSettings({
          ...notificationSettingsData,
          notification_time_offsets: Array.isArray(notificationSettingsData.notification_time_offsets)
            ? notificationSettingsData.notification_time_offsets.filter(offset => offset !== 0)
            : (typeof notificationSettingsData.notification_time_offsets === 'string' && notificationSettingsData.notification_time_offsets.length > 0
              ? notificationSettingsData.notification_time_offsets.split(',').map(Number).filter(offset => offset !== 0)
              : []),
        });

        setMessage('Settings loaded successfully.');
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, authLoading, authAxios]);

  // Handler for User Profile changes
  const handleProfileChange = (e) => {
    setUserProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handler for Notification Settings changes
  const handleNotificationChange = (e) => {
    const { name, type, checked, value } = e.target;
    setNotificationSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  // Handler for adding notification offsets
  const handleAddOffset = () => {
    const offset = parseInt(newOffsetInput, 10);
    if (!isNaN(offset) && offset > 0 && !notificationSettings.notification_time_offsets.includes(offset)) {
      setNotificationSettings(prev => ({
        ...prev,
        notification_time_offsets: [...prev.notification_time_offsets, offset].sort((a, b) => a - b),
      }));
      setNewOffsetInput('');
    } else {
        setMessage(notificationSettings.notification_time_offsets.includes(offset) ? 'Offset already exists.' : 'Please enter a valid positive number.');
    }
  };

  // Handler for removing notification offsets
  const handleRemoveOffset = (offsetToRemove) => {
    setNotificationSettings(prev => ({
      ...prev,
      notification_time_offsets: prev.notification_time_offsets.filter(offset => offset !== offsetToRemove),
    }));
  };

  // Handler for sending test Slack message
  const handleTestSlackMessage = async () => {
    setMessage('');
    setError(null);
    if (!notificationSettings.is_slack_notification_enabled || !notificationSettings.slack_webhook_url) {
        setError('Slack notifications must be enabled and a webhook URL provided.');
        return;
    }
    setLoading(true);
    try {
      // FIX: Corrected URL construction. Removed duplicated '/api'.
      const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/notifications/test-slack`, { method: 'POST' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send test message');
      }
      const data = await response.json();
      setMessage(data.message || 'Test Slack message sent successfully!');
    } catch (err) {
      console.error('Error sending test Slack message:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for sending test In-App notification
  const handleTestInAppMessage = async () => {
    setMessage('');
    setError(null);
    if (!notificationSettings.in_app_alerts_enabled) {
        setError('In-App Alerts are not enabled.');
        return;
    }
    setLoading(true);
    try {
      // FIX: Corrected URL construction. Removed duplicated '/api'.
      const response = await authAxios(`${config.NOTIFICATION_SSE_BASE_URL}/notifications/test-in-app`, { method: 'POST' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to trigger test in-app alert');
      }
      const data = await response.json();
      addNotification(data.message || 'Test in-app alert triggered!', 'success');
    } catch (err) {
      console.error('Error triggering test in-app alert:', err);
      addNotification(err.message, 'error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Combined Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError(null);
    if (!authToken) {
        setError('Authentication required to save settings.');
        setLoading(false);
        return;
    }
    try {
      // --- Update User Profile ---
      // FIX: Corrected URL construction. Removed duplicated '/api/users'.
      const profileResponse = await authAxios(`${config.USER_API_BASE_URL}/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.email }),
      });
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || 'Failed to update user profile');
      }
      if (authContextUser && userProfile.email !== authContextUser.email) {
        setAuthContextUser(prev => ({ ...prev, email: userProfile.email }));
      }

      // --- Update Notification Settings ---
      // FIX: Corrected URL construction. Removed duplicated '/api/users'.
      const notificationsResponse = await authAxios(`${config.USER_API_BASE_URL}/me/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings),
      });
      if (!notificationsResponse.ok) {
        const errorData = await notificationsResponse.json();
        throw new Error(errorData.message || 'Failed to update notification settings');
      }

      setMessage('All settings updated successfully!');
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render logic remains the same...
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">User Settings</h2>

        {loading && <p className="text-center text-blue-500">Loading settings...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {message && <p className="text-center text-green-500">{message}</p>}

        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* --- User Profile Section --- */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h3 className="text-2xl font-semibold text-gray-700 mb-4">Profile Information</h3>
              <div>
                <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={userProfile.username}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg bg-gray-200 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="mt-4">
                <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userProfile.email}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                  required
                />
              </div>
            </div>
            {/* --- Notification Settings Section --- */}
            <div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-4">Notification Preferences</h3>
              <div className="flex items-center justify-between mt-4">
                <label htmlFor="is_email_notification_enabled" className="text-lg text-gray-700">Enable Email Notifications</label>
                <input
                  type="checkbox"
                  id="is_email_notification_enabled"
                  name="is_email_notification_enabled"
                  checked={notificationSettings.is_email_notification_enabled}
                  onChange={handleNotificationChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <label htmlFor="is_slack_notification_enabled" className="text-lg text-gray-700">Enable Slack Notifications</label>
                <input
                  type="checkbox"
                  id="is_slack_notification_enabled"
                  name="is_slack_notification_enabled"
                  checked={notificationSettings.is_slack_notification_enabled}
                  onChange={handleNotificationChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              {notificationSettings.is_slack_notification_enabled && (
                <div className="mt-4">
                  <label htmlFor="slack_webhook_url" className="block text-lg font-medium text-gray-700 mb-2">Slack Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      id="slack_webhook_url"
                      name="slack_webhook_url"
                      value={notificationSettings.slack_webhook_url || ''}
                      onChange={handleNotificationChange}
                      className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    <button
                      type="button"
                      onClick={handleTestSlackMessage}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading || !notificationSettings.slack_webhook_url}
                    >
                      Validate
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <label htmlFor="in_app_alerts_enabled" className="text-lg text-gray-700">Enable In-App Alerts</label>
                <input
                  type="checkbox"
                  id="in_app_alerts_enabled"
                  name="in_app_alerts_enabled"
                  checked={notificationSettings.in_app_alerts_enabled}
                  onChange={handleNotificationChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              {notificationSettings.in_app_alerts_enabled && (
                <div className="mt-4 text-right">
                  <button
                    type="button"
                    onClick={handleTestInAppMessage}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Test In-App Alert
                  </button>
                </div>
              )}
              <div className="mt-4">
                <label className="block text-lg font-medium text-gray-700 mb-2">Notification Time Offsets (Days before due date)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {notificationSettings.notification_time_offsets.map((offset) => (
                    <span
                      key={offset}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {offset} days
                      <button
                        type="button"
                        onClick={() => handleRemoveOffset(offset)}
                        className="ml-2 -mr-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-blue-200 text-blue-600 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newOffsetInput}
                    onChange={(e) => setNewOffsetInput(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                    placeholder="e.g., 5"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={handleAddOffset}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save All Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
