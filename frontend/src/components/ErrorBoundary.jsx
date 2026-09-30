import { Component } from 'react';

// Keeps a render error in one component from blanking the whole app
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role='alert' className='flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center text-fg'>
        <h1 className='text-2xl font-semibold'>Something went wrong</h1>
        <p className='text-fg/70'>An unexpected error occurred. Reloading usually fixes it.</p>
        <button
          type='button'
          onClick={() => window.location.reload()}
          className='rounded-lg bg-fg px-4 py-2 font-medium text-canvas hover:bg-fg/90'
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
