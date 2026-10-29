import { Component, type ErrorInfo, type ReactNode } from "react";

/** Catches a render error so one broken variant or example does not blank the page. */
export class Boundary extends Component<
  { children: ReactNode; what?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `${this.props.what ?? "variant"} crashed`,
      error,
      info.componentStack,
    );
  }
  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          This {this.props.what ?? "variant"} failed to render:{" "}
          {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
