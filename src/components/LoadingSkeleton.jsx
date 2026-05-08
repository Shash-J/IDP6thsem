/**
 * LoadingSkeleton Component
 * Placeholder UI displayed while data is loading.
 */
const LoadingSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="skeleton w-10 h-10 rounded-xl mb-3" />
            <div className="skeleton w-20 h-6 mb-2" />
            <div className="skeleton w-16 h-3" />
          </div>
        ))}
      </div>

      {/* Tank Card Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div>
                <div className="skeleton w-24 h-4 mb-1" />
                <div className="skeleton w-16 h-3" />
              </div>
            </div>
            <div className="skeleton w-full h-32 rounded-xl mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-14 rounded-lg" />
              <div className="skeleton h-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="glass-card p-5">
        <div className="skeleton w-40 h-5 mb-4" />
        <div className="skeleton w-full h-[280px] rounded-xl" />
      </div>
    </div>
  );
};

export default LoadingSkeleton;
