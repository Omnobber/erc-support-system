import { Component } from "react";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected application error"
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep logging for debugging without crashing the entire app tree.
    console.error("Unhandled UI error:", error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4 dark:bg-ink-950">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900">
          <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The app hit an unexpected error, but it recovered safely.
          </p>
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {this.state.message}
          </p>
          <button
            onClick={this.retry}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
