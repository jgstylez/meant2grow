
import { useCallback } from 'react';

export const useOnboarding = () => {
    const getOnboardingComplete = useCallback((): Record<string, boolean> => {
        const stored = localStorage.getItem('onboardingComplete');
        return stored ? JSON.parse(stored) : {};
    }, []);

    const setOnboardingComplete = useCallback((value: Record<string, boolean>) => {
        localStorage.setItem('onboardingComplete', JSON.stringify(value));
    }, []);

    const markUserOnboardingComplete = useCallback((userId: string) => {
        const complete = getOnboardingComplete();
        setOnboardingComplete({ ...complete, [userId]: true });
    }, [getOnboardingComplete, setOnboardingComplete]);

    return { getOnboardingComplete, setOnboardingComplete, markUserOnboardingComplete };
};
