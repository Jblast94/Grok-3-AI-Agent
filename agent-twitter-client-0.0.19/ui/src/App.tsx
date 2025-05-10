import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterPassword, setTwitterPassword] = useState('');
  const [twitterEmail, setTwitterEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecretKey, setApiSecretKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [accessTokenSecret, setAccessTokenSecret] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSaveSettings = async () => {
    setStatusMessage('Saving settings...');
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterUsername,
          twitterPassword,
          twitterEmail,
          apiKey,
          apiSecretKey,
          accessToken,
          accessTokenSecret,
          affiliateLink,
          autoPostEnabled,
        }),
      });
      if (response.ok) {
        setStatusMessage('Settings saved successfully!');
      } else {
        const errorData = await response.json();
        setStatusMessage(`Error saving settings: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      setStatusMessage(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    // Fetch initial settings
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setTwitterUsername(data.twitterUsername || '');
          setTwitterPassword(data.twitterPassword || ''); // Be cautious with password handling
          setTwitterEmail(data.twitterEmail || '');
          setApiKey(data.apiKey || '');
          setApiSecretKey(data.apiSecretKey || '');
          setAccessToken(data.accessToken || '');
          setAccessTokenSecret(data.accessTokenSecret || '');
          setAffiliateLink(data.affiliateLink || '');
          setAutoPostEnabled(data.autoPostEnabled || false);
        } else {
          setStatusMessage('Could not load settings.');
        }
      } catch (error) {
        setStatusMessage('Error fetching settings.');
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Twitter Auto-Poster</h1>
      </header>
      <main>
        <section className="settings-form">
          <h2>Configuration</h2>
          <div className="form-group">
            <label htmlFor="twitterUsername">Twitter Username:</label>
            <input
              type="text"
              id="twitterUsername"
              value={twitterUsername}
              onChange={(e) => setTwitterUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="twitterPassword">Twitter Password:</label>
            <input
              type="password"
              id="twitterPassword"
              value={twitterPassword}
              onChange={(e) => setTwitterPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="twitterEmail">Twitter Email (Optional):</label>
            <input
              type="email"
              id="twitterEmail"
              value={twitterEmail}
              onChange={(e) => setTwitterEmail(e.target.value)}
            />
          </div>
          <hr />
          <h3>Twitter API v2 Credentials (for advanced features)</h3>
          <div className="form-group">
            <label htmlFor="apiKey">API Key:</label>
            <input
              type="text"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="apiSecretKey">API Secret Key:</label>
            <input
              type="password"
              id="apiSecretKey"
              value={apiSecretKey}
              onChange={(e) => setApiSecretKey(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="accessToken">Access Token:</label>
            <input
              type="text"
              id="accessToken"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="accessTokenSecret">Access Token Secret:</label>
            <input
              type="password"
              id="accessTokenSecret"
              value={accessTokenSecret}
              onChange={(e) => setAccessTokenSecret(e.target.value)}
            />
          </div>
          <hr />
          <div className="form-group">
            <label htmlFor="affiliateLink">Affiliate Link Template (use {{videoUrl}} as placeholder):</label>
            <input
              type="text"
              id="affiliateLink"
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="e.g. https://mytracking.com?id=123&video={{videoUrl}}"
            />
          </div>
          <div className="form-group">
            <label htmlFor="autoPostEnabled">Enable Auto-Posting:</label>
            <input
              type="checkbox"
              id="autoPostEnabled"
              checked={autoPostEnabled}
              onChange={(e) => setAutoPostEnabled(e.target.checked)}
            />
          </div>
          <button onClick={handleSaveSettings}>Save Settings</button>
          {statusMessage && <p className="status-message">{statusMessage}</p>}
        </section>
      </main>
    </div>
  );
}

export default App;