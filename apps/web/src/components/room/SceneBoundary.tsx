'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * The live room is an enhancement over its poster, so nothing that fails inside it may take the
 * page down with it: a 3D chunk that never arrives, a model or map that fails mid-download, a
 * WebGL context the browser refuses. Any of these renders nothing here and tells the story, which
 * keeps the poster, the captions and the ruler it already shows.
 */
export class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.warn('The live room could not start; its poster stays.', error, info.componentStack);
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
