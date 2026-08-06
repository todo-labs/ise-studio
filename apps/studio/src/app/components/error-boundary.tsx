import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@ise-studio/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  name: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`ISE Studio ${this.props.name} failed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="bg-destructive/10 text-destructive flex h-full min-h-32 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="size-6" />
        <div>
          <p className="font-medium">{this.props.name} stopped unexpectedly.</p>
          <p className="mt-1 text-xs opacity-80">{this.state.error.message}</p>
        </div>
        <Button
          onClick={() => this.setState({ error: null })}
          size="sm"
          variant="outline"
        >
          <RefreshCw className="mr-2 size-3.5" />
          Try again
        </Button>
      </div>
    );
  }
}
