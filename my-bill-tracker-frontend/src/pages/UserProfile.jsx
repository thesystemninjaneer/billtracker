import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import config from '../config'; // Assuming config.js has USER_API_BASE_URL

const UserProfile = () => {
  const { token: authToken, isAuthenticated, loading: authLoading, authAxios, user: authContextUser, setUser: setAuthContextUser } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState({
    username: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authLoading) {
        return; // Defer fetch until AuthContext is done loading
      }

      if (!authToken) {
        setError('Authentication required to fetch profile.');
        setLoading(false);
        return;
      }

      try {
        const response = await authAxios(`${config.USER_API_BASE_URL}/profile`, {
          method: 'GET',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch user profile with status: ${response.status}`);
        }

        const data = await response.json();
        setUserProfile({
          username: data.user.username,
          email: data.user.email,
        });
        setMessage('User profile loaded.');
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authToken, isAuthenticated, authLoading, authAxios, config.USER_API_BASE_URL]); // Add config.USER_API_BASE_URL to dependencies

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError(null);

    if (!authToken) {
      setError('Authentication required to update profile.');
      setLoading(false);
      return;
    }

    try {
      const response = await authAxios(`${config.USER_API_BASE_URL}/api/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userProfile), // Send the updated profile data
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update user profile with status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message || 'User profile updated successfully!');
      // Optionally, update the user in AuthContext if username changes
      if (authContextUser && userProfile.username !== authContextUser.username) {
        setAuthContextUser(prevUser => ({ ...prevUser, username: userProfile.username }));
      }
    } catch (err) {
      console.error('Error updating user profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">User Profile</h2>

        {loading && <p className="text-center text-blue-500">Loading profile...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {message && <p className="text-center text-green-500">{message}</p>}

        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={userProfile.username}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={userProfile.email}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
