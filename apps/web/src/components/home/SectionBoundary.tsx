'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** What the section is, for the log line. */
  name: string;
  /** Shown instead of the section once it has failed. */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * A safety net around one section of a page. If the section throws while it
 * renders or sets itself up (a model that fails mid-download, a code chunk
 * that never arrives, a WebGL context the device refuses), the rest of the
 * page stays and the fallback takes its place.
 */
export class SectionBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[vivavoce] the ${this.props.name} section failed and was replaced by its fallback`, error, info.componentStack);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
