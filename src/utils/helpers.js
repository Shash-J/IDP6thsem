/**
 * Utility Functions
 * Common helpers used across the dashboard.
 */

/**
 * Format a date string or timestamp to a human-readable format
 * @param {string|number} timestamp - ISO string or Unix timestamp
 * @returns {string} Formatted date string
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
    hour12: true,
  });
};

/**
 * Format time only (for charts)
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Time string HH:MM
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Get status color based on tank status
 * @param {string} status - Tank status string
 * @returns {object} CSS color classes
 */
export const getStatusColor = (status) => {
  const colors = {
    Normal: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      fill: '#10b981',
    },
    Low: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20',
      fill: '#ef4444',
    },
    Filling: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/20',
      fill: '#3b82f6',
    },
    Full: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
      fill: '#06b6d4',
    },
  };
  return colors[status] || colors.Normal;
};

/**
 * Get alert type styling
 * @param {string} type - Alert type (warning, error, info, success)
 * @returns {object} Icon and color info
 */
export const getAlertStyle = (type) => {
  const styles = {
    warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  };
  return styles[type] || styles.info;
};

/**
 * Chamber display names
 */
export const CHAMBER_NAMES = {
  tank1: 'Chamber A-1',
  tank2: 'Chamber A-2',
  tank3: 'Chamber B-1',
  tank4: 'Chamber B-2',
  tank5: 'Chamber C-1',
  tank6: 'Chamber C-2',
};

/**
 * Chart color palette for each chamber
 */
export const CHART_COLORS = {
  tank1: '#06b6d4',
  tank2: '#f43f5e',
  tank3: '#10b981',
  tank4: '#f59e0b',
  tank5: '#8b5cf6',
  tank6: '#ec4899',
};

/**
 * Time since a given timestamp in human-readable form
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
