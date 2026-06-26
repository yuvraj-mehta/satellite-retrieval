export function useQueryHistory() {
  const STORAGE_KEY = "spectra_query_history";
  const MAX = 20;

  function getHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse query history", e);
    }
    return [];
  }

  function addEntry(entry) {
    try {
      const history = getHistory();
      const newHistory = [entry, ...history].slice(0, MAX);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save query history", e);
    }
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getHistory, addEntry, clearHistory };
}
