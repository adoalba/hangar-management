
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- DEFINICIÓN DEL ERROR BOUNDARY ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#0f172a',
          color: '#f87171',
          fontFamily: 'monospace',
          padding: '1rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>ERROR CRÍTICO DEL SISTEMA</h1>
          <p style={{ marginTop: '1rem', color: '#94a3b8', textAlign: 'center' }}>Ha ocurrido un fallo irrecuperable en la aplicación.</p>
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Por favor, refresque la página o contacte con el soporte técnico.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}