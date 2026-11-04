import { Component, ErrorInfo, ReactNode } from 'react';
import { reportAppError } from '../utils/errorReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportAppError(error, 'Unerwarteter Fehler beim Anzeigen der App');
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold">PandaMatch konnte diesen Bereich nicht anzeigen.</h1>
            <p className="mt-3 text-slate-300">
              Der Fehler wurde protokolliert. Bitte lade die App neu oder starte sie erneut.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              App neu laden
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
