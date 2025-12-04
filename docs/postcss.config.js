module.exports = {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        "last 2 versions",
        "> 1%",
        "not dead"
      ]
    },
    // Add cssnano for production builds
    ...(process.env.HUGO_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true
          },
          normalizeWhitespace: true,
          minifyFontValues: true,
          minifySelectors: true
        }]
      }
    } : {})
  }
};
