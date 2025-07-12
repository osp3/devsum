import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    OPENAI_API_KEY: ''
  });
  
  const [originalSettings, setOriginalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testing, setTesting] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setOriginalSettings(data.data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load settings' });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Error loading settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Only send changed settings
      const changedSettings = {};
      Object.keys(settings).forEach(key => {
        if (settings[key] !== originalSettings[key] && settings[key].trim()) {
          changedSettings[key] = settings[key].trim();
        }
      });

      if (Object.keys(changedSettings).length === 0) {
        setMessage({ type: 'info', text: 'No changes to save' });
        return;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ settings: changedSettings })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setOriginalSettings(prev => ({ ...prev, ...changedSettings }));
        // Refresh settings to get masked values
        await fetchSettings();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (key, value) => {
    try {
      setTesting(prev => ({ ...prev, [key]: true }));
      setMessage({ type: '', text: '' });

      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ key, value })
      });

      const data = await response.json();

      if (response.ok) {
        const testResult = data.data;
        setMessage({ 
          type: testResult.valid ? 'success' : 'error', 
          text: testResult.message 
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Test failed' });
      }
    } catch (error) {
      console.error('Error testing setting:', error);
      setMessage({ type: 'error', text: 'Error testing setting' });
    } finally {
      setTesting(prev => ({ ...prev, [key]: false }));
    }
  };

  const hasChanges = () => {
    return Object.keys(settings).some(key => 
      settings[key] !== originalSettings[key] && settings[key].trim()
    );
  };

  const getFieldLabel = (key) => {
    switch (key) {
      case 'GITHUB_CLIENT_ID':
        return 'GitHub Client ID';
      case 'GITHUB_CLIENT_SECRET':
        return 'GitHub Client Secret';
      case 'OPENAI_API_KEY':
        return 'OpenAI API Key';
      default:
        return key;
    }
  };

  const getFieldDescription = (key) => {
    switch (key) {
      case 'GITHUB_CLIENT_ID':
        return 'Your GitHub OAuth App Client ID';
      case 'GITHUB_CLIENT_SECRET':
        return 'Your GitHub OAuth App Client Secret';
      case 'OPENAI_API_KEY':
        return 'Your OpenAI API Key for AI features';
      default:
        return '';
    }
  };

  const isFieldSensitive = (key) => {
    return key.includes('SECRET') || key.includes('KEY');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1928]">
      {/* Navigation Header */}
      <div className="bg-[#2d2b3e] border-b border-slate-600 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h2 className="text-white text-xl font-semibold">Settings</h2>
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">API Keys & Settings</h1>
          
          {message.text && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            {Object.keys(settings).map(key => (
              <div key={key} className="border-b border-gray-200 pb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getFieldLabel(key)}
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  {getFieldDescription(key)}
                </p>
                
                <div className="flex space-x-3">
                  <input
                    type={isFieldSensitive(key) ? 'password' : 'text'}
                    value={settings[key]}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter your ${getFieldLabel(key)}`}
                  />
                  
                  {settings[key] && settings[key].trim() && (
                    <button
                      onClick={() => handleTest(key, settings[key])}
                      disabled={testing[key]}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testing[key] ? 'Testing...' : 'Test'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={fetchSettings}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 