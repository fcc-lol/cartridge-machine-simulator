module.exports = function override(config, env) {
  // Suppress source map warnings for MediaPipe and other problematic modules
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /node_modules\/@mediapipe/,
      message: /Failed to parse source map/
    },
    {
      module: /node_modules\/@mediapipe\/tasks-vision/,
      message: /Failed to parse source map/
    },
    {
      message: /Failed to parse source map from.*\.map/
    }
  ];

  return config;
};
