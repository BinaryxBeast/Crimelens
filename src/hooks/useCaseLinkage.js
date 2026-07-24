import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeCaseLinkages, prepareCaseSummaries } from '../services/geminiService';

/**
 * Hook: useCaseLinkage
 * Manages Gemini-powered case linkage analysis lifecycle
 */
export function useCaseLinkage(incidents, resolvers = {}) {
  const [linkages, setLinkages] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  const hasAnalyzedRef = useRef(false);
  const abortRef = useRef(null);

  const analyze = useCallback(async () => {
    if (!incidents || incidents.length === 0) return;

    // Cancel any in-flight analysis
    if (abortRef.current) {
      abortRef.current.abort = true;
    }
    const thisRequest = { abort: false };
    abortRef.current = thisRequest;

    setLoading(true);
    setError(null);

    try {
      const caseSummaries = prepareCaseSummaries(incidents, resolvers);
      const result = await analyzeCaseLinkages(caseSummaries);

      // Only update state if this request wasn't aborted
      if (!thisRequest.abort) {
        setLinkages(result.linkages);
        setPatterns(result.patterns);
        setAlerts(result.alerts);
        setSummary(result.summary);
        setLastAnalyzed(new Date());
      }
    } catch (err) {
      if (!thisRequest.abort) {
        console.error('Case linkage analysis failed:', err);
        setError(err.message);
      }
    } finally {
      if (!thisRequest.abort) {
        setLoading(false);
      }
    }
  }, [incidents, resolvers]);

  // Auto-trigger analysis when incidents are loaded (once)
  useEffect(() => {
    if (incidents && incidents.length > 0 && !hasAnalyzedRef.current) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        hasAnalyzedRef.current = true;
        // Debounce slightly to let the page render first
        const timer = setTimeout(() => analyze(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [incidents, analyze]);

  return {
    linkages,
    patterns,
    alerts,
    summary,
    loading,
    error,
    lastAnalyzed,
    analyze,
    hasApiKey: !!import.meta.env.VITE_GEMINI_API_KEY,
  };
}
