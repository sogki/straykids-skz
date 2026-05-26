import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[SKZ Arcade]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#121213',
            color: '#ffffff',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#818384', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '0.6rem 1.25rem',
                background: '#ffffff',
                color: '#121213',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
