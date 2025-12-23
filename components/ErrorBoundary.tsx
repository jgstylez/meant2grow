
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';
import { ErrorView } from './ErrorView';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    title?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error(`Uncaught error in boundary: ${error.message}`, {
            error,
            errorInfo
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <ErrorView
                    error={this.state.error}
                    resetErrorBoundary={this.handleReset}
                    title={this.props.title}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
