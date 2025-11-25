import { useState } from 'react';

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [failureRate, setFailureRate] = useState(0);

  const toggleFailureRate = () => {
    const newRate = failureRate === 0 ? 15 : 0;
    setFailureRate(newRate);
    
    // Store in global for upload manager to use
    (window as any).__DEV_FAILURE_RATE__ = newRate;
  };

  if (!isOpen) {
    return (
      <button 
        className="dev-tools"
        onClick={() => setIsOpen(true)}
        style={{ padding: '0.5rem' }}
      >
        🔧 Dev Tools
      </button>
    );
  }

  return (
    <div className="dev-tools">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4>Dev Tools</h4>
        <button onClick={() => setIsOpen(false)}>×</button>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Network Failure Simulation
        </label>
        <button 
          className={`btn ${failureRate > 0 ? 'btn-danger' : 'btn-secondary'}`}
          onClick={toggleFailureRate}
        >
          {failureRate > 0 ? `Failing ${failureRate}% of uploads` : 'Enable 15% failure rate'}
        </button>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
        <p>• Simulates network failures during upload</p>
        <p>• Test retry and error handling</p>
        <p>• Offline detection: disconnect network</p>
      </div>
    </div>
  );
}