import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from './AppShell.jsx';
import PlanPanel from './PlanPanel.jsx';

// Settings management component for API keys and configuration
const Settings = ({ user }) => {
  const navigate = useNavigate();
  // With billing on, AI is included and a personal key is optional
  const aiIncluded = Boolean(user?.access) && user.access.reason !== 'open';

  // Current settings values displayed in form inputs
  const [settings, setSettings] = useState({
    OPENAI_API_KEY: '',
    OPENAI_MODEL: '',
  });

  // Original settings from server for change detection
  const [originalSettings, setOriginalSettings] = useState({});

  // Supported OpenAI models provided by the backend
  const [models, setModels] = useState([]);

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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/settings`,
        {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setOriginalSettings(data.data); // Store for change comparison
        setModels(data.models || []);
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
    setSettings((prev) => ({
      ...prev,
      [key]: value,
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
      Object.keys(settings).forEach((key) => {
        if (settings[key] !== originalSettings[key] && settings[key].trim()) {
          changedSettings[key] = settings[key].trim();
        }
      });

      if (Object.keys(changedSettings).length === 0) {
        setMessage({ type: 'info', text: 'No changes to save' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ settings: changedSettings }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setOriginalSettings((prev) => ({ ...prev, ...changedSettings }));
        // Refresh settings to get masked values from server
        await fetchSettings();

        // Navigate back after showing success message
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to save settings',
        });
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
      setTesting((prev) => ({ ...prev, [key]: true }));
      setMessage({ type: '', text: '' });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/settings/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ key, value }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const testResult = data.data;
        setMessage({
          type: testResult.valid ? 'success' : 'error',
          text: testResult.message,
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Test failed' });
      }
    } catch (error) {
      console.error('Error testing setting:', error);
      setMessage({ type: 'error', text: 'Error testing setting' });
    } finally {
      setTesting((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Check if any settings have been modified from their original values
  const hasChanges = () => {
    return Object.keys(settings).some(
      (key) => settings[key] !== originalSettings[key] && settings[key].trim()
    );
  };

  // Convert setting keys to user-friendly display labels
  const getFieldLabel = (key) => {
    switch (key) {
      case 'OPENAI_API_KEY':
        return aiIncluded ? 'OpenAI API Key (optional)' : 'OpenAI API Key';
      case 'OPENAI_MODEL':
        return 'OpenAI Model';
      default:
        return key;
    }
  };

  // Provide helpful descriptions for each setting field
  const getFieldDescription = (key) => {
    switch (key) {
      case 'OPENAI_API_KEY':
        return aiIncluded
          ? 'AI is included in your plan. Add your own key to run analysis on your OpenAI account, with no daily limit (stored encrypted)'
          : 'Your personal OpenAI API Key for AI features (stored securely in your account)';
      case 'OPENAI_MODEL':
        return aiIncluded
          ? 'Model used with your own key'
          : 'Select your preferred OpenAI model for AI-powered features';
      default:
        return '';
    }
  };

  // Determine if field should be masked (password input) for security
  const isFieldSensitive = (key) => {
    return key.includes('SECRET') || key.includes('KEY');
  };

  // Available OpenAI model options with descriptions
  const getOpenAIModelOptions = () => [{ value: '', label: 'Select a model...' }, ...models];

  // Render appropriate input type based on field (select for models, password for secrets)
  const renderField = (key) => {
    if (key === 'OPENAI_MODEL') {
      return (
        <select
          value={settings[key]}
          onChange={(e) => handleInputChange(key, e.target.value)}
          className='field flex-1 min-w-0'
        >
          {getOpenAIModelOptions().map((option) => (
            <option
              key={option.value}
              value={option.value}
              className='bg-inset text-fg'
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
        className='field flex-1 min-w-0'
        placeholder={`Enter your ${getFieldLabel(key)}`}
      />
    );
  };

  // Show loading spinner while fetching initial settings
  if (loading) {
    return (
      <AppShell user={user}>
        <div className='flex flex-col items-center justify-center py-24'>
          <div className='animate-spin rounded-full h-10 w-10 border-2 border-line border-t-steam mb-4'></div>
          <p className='text-fg/65'>Loading settings...</p>
        </div>
      </AppShell>
    );
  }

  // Main settings form with field sections
  return (
    <AppShell user={user}>
      <div className='py-8 px-4'>
        <div className='max-w-2xl mx-auto'>
          {/* using the negative one takes you back to the previous page. */}
          <button onClick={() => navigate(-1)} className='btn-ghost mb-6 text-sm cursor-pointer'>
            Back
          </button>
          <PlanPanel user={user} />
          <div className='panel p-6'>
            <p className='eyebrow'>Settings</p>
            <h1 className='mt-2 mb-6 text-2xl font-semibold tracking-[-0.03em]'>
              API keys and model
            </h1>

            {/* Status message display (success, error, info) */}
            {message.text && (
              <div
                role='status'
                className={`mb-6 p-4 rounded-lg border text-sm ${
                  message.type === 'success'
                    ? 'bg-steam/10 border-steam/30 text-steam'
                    : message.type === 'error'
                    ? 'bg-node-red/10 border-node-red/30 text-node-red'
                    : 'bg-inset border-line text-fg/70'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Settings form fields with labels, descriptions, and test buttons */}
            <div className='space-y-6'>
              {Object.keys(settings).map((key) => (
                <div key={key} className='border-b border-line pb-6'>
                  <label className='block text-sm font-medium mb-1'>
                    {getFieldLabel(key)}
                  </label>
                  <p className='text-sm text-fg/60 mb-3'>
                    {getFieldDescription(key)}
                  </p>

                  <div className='flex space-x-3'>
                    {renderField(key)}

                    {/* Test button for validation (except for model selection) */}
                    {settings[key] &&
                      settings[key].trim() &&
                      key !== 'OPENAI_MODEL' && (
                        <button
                          onClick={() => handleTest(key, settings[key])}
                          disabled={testing[key]}
                          className='btn-secondary border px-4 cursor-pointer'
                        >
                          {testing[key] ? 'Testing...' : 'Test'}
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Form action buttons (Cancel/Save) */}
            <div className='mt-8 flex justify-end space-x-3'>
              <button
                onClick={() => navigate(-1)}
                disabled={saving}
                className='btn-secondary h-9 border px-4 text-sm cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges()}
                className='btn-primary h-9 px-4 text-sm font-medium cursor-pointer'
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Settings;
