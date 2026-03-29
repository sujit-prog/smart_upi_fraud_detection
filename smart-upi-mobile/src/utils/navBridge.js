import { useRouter } from 'expo-router';

// Maps screen names used in navigation.navigate() to expo-router paths
const ROUTES = {
    Home:             '/',
    Scanner:          '/scanner',
    FraudAssessment:  '/fraud-assessment',
    Payment:          '/payment',
    Success:          '/success',
};

/**
 * makeNav — creates a drop-in replacement for React Navigation's
 * `navigation` prop, backed by expo-router.
 */
export function makeNav(router) {
    return {
        navigate: (name, params = {}) => {
            const serialized = {};
            for (const [k, v] of Object.entries(params)) {
                // expo-router params must be strings; serialize arrays/objects
                serialized[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
            router.push({ pathname: ROUTES[name] ?? '/', params: serialized });
        },
        goBack:   () => router.back(),
        replace:  (name) => router.replace(ROUTES[name] ?? '/'),
    };
}

/**
 * parseParams — deserializes expo-router's string params back to their
 * original types, so screen components receive the right types.
 */
export function parseParams(raw = {}) {
    return {
        ...raw,
        // booleans
        isHighRisk: raw.isHighRisk === 'true' || raw.isHighRisk === true,
        // numbers
        riskScore:  raw.riskScore !== undefined ? parseFloat(raw.riskScore) : undefined,
        // JSON arrays/objects
        riskFactors: typeof raw.riskFactors === 'string' && raw.riskFactors
            ? (() => { try { return JSON.parse(raw.riskFactors); } catch { return []; } })()
            : raw.riskFactors ?? [],
    };
}
