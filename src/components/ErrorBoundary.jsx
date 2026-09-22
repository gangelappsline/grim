import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-4 rounded-xl bg-red-900/30 p-4 text-xs text-red-400">
          <p className="mb-1 font-bold">Error de render:</p>
          <pre className="whitespace-pre-wrap break-all">
            {this.state.error.message}
          </pre>
          <pre className="mt-2 whitespace-pre-wrap break-all opacity-60">
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}