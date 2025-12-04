'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px',
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>500</h1>
      <p style={{ fontSize: '18px', marginBottom: '24px' }}>Something went wrong</p>
      <button
        onClick={reset}
        style={{
          padding: '12px 24px',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}

