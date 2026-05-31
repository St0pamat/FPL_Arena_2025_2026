import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", this.props.label || "App", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="glass-panel rounded-2xl border border-red-500/40 bg-red-950/30 p-6 m-4 max-w-2xl">
          <h2 className="text-lg font-bold text-red-300 mb-2">
            Błąd widoku{this.props.label ? `: ${this.props.label}` : ""}
          </h2>
          <p className="text-sm text-slate-300 font-mono break-all">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700"
          >
            Spróbuj ponownie
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
