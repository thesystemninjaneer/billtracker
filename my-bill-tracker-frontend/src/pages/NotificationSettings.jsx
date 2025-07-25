import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
// Header import removed as it's provided by App.jsx's layout
// import Header from '../components/Header'; // Removed this line

// Define the base URL for your notification service backend
// Make sure this matches the port your notification service is actually running on (e.g., 3003)
const NOTIFICATION_SERVICE_BASE_URL = 'http://localhost:3003';

const NotificationSettings = () => {
  const { token: authToken, isAuthenticated, loading: authLoading, authAxios } = useContext(AuthContext);
  const [settings, setSettings] = useState({
    is_email_notification_enabled: false,
    is_slack_notification_enabled: false,
    slack_webhook_url: '',
    in_app_alerts_enabled: false,
    notification_time_offsets: [], // Array of numbers (e.g., [1, 7, 30])
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const [newOffsetInput, setNewOffsetInput] = useState('');

  useEffect(() => {
    // --- Debugging Logs ---
    // console.log('NotificationSettings useEffect triggered.');
    // console.log('Current authToken:', authToken ? 'Present' : 'Not present'); // Log presence, not full token
    // console.log('AuthContext isAuthenticated:', isAuthenticated);
    // console.log('AuthContext authLoading:', authLoading);
    // --- End Debugging Logs ---

    const fetchSettings = async () => {
      if (authLoading) {
        return; // Defer the fetch until AuthContext has completed its initial verification
      }

      if (!authToken) {
        setError('Authentication required to fetch settings.');
        setLoading(false);
        return;
      }

      try {
        // Create an AbortController to implement a timeout
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000); // Set timeout to 10 seconds

        // Using direct fetch for GET, as previously debugged
        const response = await fetch(`${NOTIFICATION_SERVICE_BASE_URL}/api/users/me/notifications`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          signal: controller.signal
        });

        clearTimeout(id); // Clear the timeout if fetch completes within the time limit

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch notification settings with status: ${response.status}`);
        }

        const data = await response.json();
        setSettings({
          ...data,
          // Ensure notification_time_offsets is an array of numbers
          // The backend sends it as a comma-separated string, so we parse it here.
          notification_time_offsets: Array.isArray(data.notification_time_offsets)
            ? data.notification_time_offsets
            : (typeof data.notification_time_offsets === 'string' && data.notification_time_offsets.length > 0
                ? data.notification_time_offsets.split(',').map(Number)
                : []),
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Failed to fetch settings: Request timed out. The backend might not be responding or there\'s a network issue.');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [authToken, isAuthenticated, authLoading]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddOffset = () => {
    const offset = parseInt(newOffsetInput, 10);
    if (!isNaN(offset) && offset > 0 && !settings.notification_time_offsets.includes(offset)) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        notification_time_offsets: [...prevSettings.notification_time_offsets, offset].sort((a, b) => a - b),
      }));
      setNewOffsetInput(''); // Clear input after adding
    } else if (isNaN(offset) || offset <= 0) {
      setMessage('Please enter a valid positive number for offset.');
    } else if (settings.notification_time_offsets.includes(offset)) {
      setMessage('Offset already exists.');
    }
  };

  const handleRemoveOffset = (offsetToRemove) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      notification_time_offsets: prevSettings.notification_time_offsets.filter(
        (offset) => offset !== offsetToRemove
      ),
    }));
  };

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
      // Using authAxios for PUT requests
      const response = await authAxios(`${NOTIFICATION_SERVICE_BASE_URL}/api/users/me/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update notification settings with status: ${response.status}`);
      }

      setMessage('Notification settings updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Removed <Header /> from here. The main App.jsx will render the global Header. */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Notification Settings</h2>

          {loading && <p className="text-center text-blue-500">Loading settings...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {message && <p className="text-center text-green-500">{message}</p>}

          {!loading && !error && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <label htmlFor="is_email_notification_enabled" className="text-lg text-gray-700">
                  Enable Email Notifications
                </label>
                <input
                  type="checkbox"
                  id="is_email_notification_enabled"
                  name="is_email_notification_enabled"
                  checked={settings.is_email_notification_enabled}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              {/* Slack Notifications */}
              <div className="flex items-center justify-between">
                <label htmlFor="is_slack_notification_enabled" className="text-lg text-gray-700">
                  Enable Slack Notifications
                </label>
                <input
                  type="checkbox"
                  id="is_slack_notification_enabled"
                  name="is_slack_notification_enabled"
                  checked={settings.is_slack_notification_enabled}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              {settings.is_slack_notification_enabled && (
                <div>
                  <label htmlFor="slack_webhook_url" className="block text-lg font-medium text-gray-700 mb-2">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    id="slack_webhook_url"
                    name="slack_webhook_url"
                    value={settings.slack_webhook_url || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              )}

              {/* In-App Alerts */}
              <div className="flex items-center justify-between">
                <label htmlFor="in_app_alerts_enabled" className="text-lg text-gray-700">
                  Enable In-App Alerts
                </label>
                <input
                  type="checkbox"
                  id="in_app_alerts_enabled"
                  name="in_app_alerts_enabled"
                  checked={settings.in_app_alerts_enabled}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              {/* Notification Time Offsets */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Notification Time Offsets (Days before due date)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.notification_time_offsets.map((offset) => (
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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
