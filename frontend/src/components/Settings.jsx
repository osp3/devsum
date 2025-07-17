import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Settings management component for API keys and configuration
const Settings = () => {
  const navigate = useNavigate();
  
  // Current settings values displayed in form inputs
  const [settings, setSettings] = useState({
    OPENAI_API_KEY: '',
    OPENAI_MODEL: '',
    SESSION_SECRET: ''
  });
  
  // Original settings from server for change detection
  const [originalSettings, setOriginalSettings] = useState({});
  
  // UI state management for loading, saving, and user feedback
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testing, setTesting] = useState({}); // Track which fields are being tested

  // Fetch settings from server on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Load current settings from backend API with error handling
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setOriginalSettings(data.data); // Store for change comparison
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

  // Update individual setting value and clear any existing messages
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

  // Save only changed settings to backend and handle navigation
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Only send changed settings to minimize payload and avoid unnecessary updates
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
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
        // Refresh settings to get masked values from server
        await fetchSettings();
        
        // Navigate back after showing success message
        setTimeout(() => {
          navigate(-1);
        }, 1000);
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

  // Test individual setting values by calling backend validation endpoint
  const handleTest = async (key, value) => {
    try {
      setTesting(prev => ({ ...prev, [key]: true }));
      setMessage({ type: '', text: '' });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/test`, {
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

  // Check if any settings have been modified from their original values
  const hasChanges = () => {
    return Object.keys(settings).some(key => 
      settings[key] !== originalSettings[key] && settings[key].trim()
    );
  };

  // Convert setting keys to user-friendly display labels
  const getFieldLabel = (key) => {
    switch (key) {
      case 'OPENAI_API_KEY':
        return 'OpenAI API Key';
      case 'OPENAI_MODEL':
        return 'OpenAI Model';
      case 'SESSION_SECRET':
        return 'Session Secret';
      default:
        return key;
    }
  };

  // Provide helpful descriptions for each setting field
  const getFieldDescription = (key) => {
    switch (key) {
      case 'OPENAI_API_KEY':
        return 'Your personal OpenAI API Key for AI features (stored securely in your account)';
      case 'OPENAI_MODEL':
        return 'Select your preferred OpenAI model for AI-powered features';
      case 'SESSION_SECRET':
        return 'Secret key for session encryption (generate a random string)';
      default:
        return '';
    }
  };

  // Determine if field should be masked (password input) for security
  const isFieldSensitive = (key) => {
    return key.includes('SECRET') || key.includes('KEY');
  };

  // Define available OpenAI model options with descriptions
  const getOpenAIModelOptions = () => {
    return [
      { value: '', label: 'Select a model...' },
      { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Efficient)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Cost Effective)' }
    ];
  };

  // Render appropriate input type based on field (select for models, password for secrets)
  const renderField = (key) => {
    if (key === 'OPENAI_MODEL') {
      return (
        <select
          value={settings[key]}
          onChange={(e) => handleInputChange(key, e.target.value)}
          className="flex-1 px-3 py-2 bg-[#1a1928] border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {getOpenAIModelOptions().map(option => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-[#1a1928] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={isFieldSensitive(key) ? 'password' : 'text'}
        value={settings[key]}
        onChange={(e) => handleInputChange(key, e.target.value)}
        className="flex-1 px-3 py-2 bg-[#1a1928] border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={`Enter your ${getFieldLabel(key)}`}
      />
    );
  };

  // Show loading spinner while fetching initial settings
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1928] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Main settings form with navigation header and field sections
  return (
    <div className="min-h-screen bg-[#1a1928]">
      {/* Navigation Header with back button and title */}
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
          <div className="bg-[#2d2b3e] rounded-lg shadow-md p-6 border border-slate-600">
            <h1 className="text-2xl font-bold text-white mb-6">API Keys & Settings</h1>
          
          {/* Status message display (success, error, info) */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-md border ${
              message.type === 'success' ? 'bg-green-900/20 border-green-500 text-green-300' :
              message.type === 'error' ? 'bg-red-900/20 border-red-500 text-red-300' :
              'bg-blue-900/20 border-blue-500 text-blue-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* Settings form fields with labels, descriptions, and test buttons */}
          <div className="space-y-6">
            {Object.keys(settings).map(key => (
              <div key={key} className="border-b border-slate-600 pb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  {getFieldLabel(key)}
                </label>
                <p className="text-sm text-gray-300 mb-3">
                  {getFieldDescription(key)}
                </p>
                
                <div className="flex space-x-3">
                  {renderField(key)}
                  
                  {/* Test button for validation (except for model selection) */}
                  {settings[key] && settings[key].trim() && key !== 'OPENAI_MODEL' && (
                    <button
                      onClick={() => handleTest(key, settings[key])}
                      disabled={testing[key]}
                      className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testing[key] ? 'Testing...' : 'Test'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form action buttons (Cancel/Save) */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => navigate(-1)}
              disabled={saving}
              className="px-4 py-2 text-white bg-slate-600 rounded-md hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
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