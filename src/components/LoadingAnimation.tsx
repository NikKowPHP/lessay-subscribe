export const LoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center space-y-4 my-8">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-solid rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 bg-white dark:bg-black rounded-full"></div>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
        Analyzing your accent...
      </p>
  </div>
  )
}