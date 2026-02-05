import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

// Default list to populate if storage is empty
const DEFAULT_EXCLUSIONS = [
    'youtube.com', 'youtu.be', 'netflix.com', 'twitch.tv', 'vimeo.com',
    'dailymotion.com', 'disneyplus.com', 'hulu.com', 'primevideo.com', 'max.com',
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com',
    'whatsapp.com', 'messenger.com', 'discord.com', 'slack.com',
    'teams.microsoft.com', 'zoom.us', 'meet.google.com',
    'docs.google.com', 'sheets.google.com', 'slides.google.com',
    'canva.com', 'figma.com', 'trello.com', 'miro.com'
];

const Options = () => {
    const [exclusions, setExclusions] = useState<string[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        // Load stored exclusions
        chrome.storage.sync.get(['excludedDomains'], (result) => {
            if (result.excludedDomains) {
                setExclusions(result.excludedDomains);
            } else {
                // If first time, set defaults
                setExclusions(DEFAULT_EXCLUSIONS);
                chrome.storage.sync.set({ excludedDomains: DEFAULT_EXCLUSIONS });
            }
        });
    }, []);

    const saveExclusions = (updatedList: string[]) => {
        setExclusions(updatedList);
        chrome.storage.sync.set({ excludedDomains: updatedList }, () => {
            setStatus('Saved!');
            setTimeout(() => setStatus(''), 2000);
        });
    };

    const addDomain = (e: React.FormEvent) => {
        e.preventDefault();
        const domain = newDomain.trim().toLowerCase();

        if (!domain) return;

        if (exclusions.includes(domain)) {
            setStatus('Domain already exists');
            return;
        }

        // Basic validation
        if (!domain.includes('.') || domain.includes(' ')) {
            setStatus('Invalid domain format');
            return;
        }

        saveExclusions([domain, ...exclusions]);
        setNewDomain('');
    };

    const removeDomain = (domainToRemove: string) => {
        saveExclusions(exclusions.filter(d => d !== domainToRemove));
    };

    const resetDefaults = () => {
        if (confirm('Reset to default exclusion list?')) {
            saveExclusions(DEFAULT_EXCLUSIONS);
        }
    };

    return (
        <div className="options-container">
            <div className="header">
                <h1>MDify Settings</h1>
                <div className="description">
                    Manage websites where the MDify overlay should be hidden.
                </div>
            </div>

            <form onSubmit={addDomain} className="input-group">
                <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="Enter domain (e.g., example.com)"
                />
                <button type="submit" className="btn btn-primary">
                    Add Site
                </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                    Blocked Sites ({exclusions.length})
                </h3>
                {status && <span style={{ color: '#818cf8', fontSize: '14px' }}>{status}</span>}
            </div>

            <div className="domain-list">
                {exclusions.length === 0 ? (
                    <div className="empty-state">No excluded sites. The overlay will appear everywhere.</div>
                ) : (
                    exclusions.map((domain) => (
                        <div key={domain} className="domain-item">
                            <span className="domain-name">{domain}</span>
                            <button
                                onClick={() => removeDomain(domain)}
                                className="btn btn-danger"
                                title="Remove exclusion"
                            >
                                Remove
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <button
                    onClick={resetDefaults}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Reset to default list
                </button>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>
);
