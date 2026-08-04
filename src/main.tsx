import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render failed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>화면을 불러오지 못했습니다</h1>
            <p style={{ color: '#555', marginBottom: 12 }}>
              브라우저에서 Ctrl+Shift+R 로 새로고침하거나, Vercel 환경 변수와 Supabase
              Redirect URL 설정을 확인해 주세요.
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
