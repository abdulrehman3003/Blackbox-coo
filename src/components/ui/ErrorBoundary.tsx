import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Button from "./Button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl border border-danger/30 bg-danger/5 my-6 space-y-4 max-w-2xl mx-auto text-left shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
              <AlertCircle size={22} className="text-danger" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {this.props.fallbackTitle || "An unexpected UI error occurred"}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                The component encountered an issue rendering. You can reset state or reload the view.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-surface border border-border overflow-x-auto">
              <p className="text-xs font-mono text-danger font-semibold">
                {this.state.error.toString()}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] font-mono text-text-muted mt-2 max-h-36 overflow-y-auto leading-relaxed">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" size="sm" icon={RefreshCw} onClick={this.handleReset}>
              Reload App
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Home}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/dashboard";
              }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
