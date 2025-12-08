module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/login',
        'http://localhost:3000/dashboard',
      ],
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3500 }],
        
        // Accessibility - strict enforcement
        'categories:accessibility': ['error', { minScore: 0.9 }],
        
        // Best practices
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        
        // SEO
        'categories:seo': ['warn', { minScore: 0.9 }],
        
        // Specific checks
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'unminified-css': 'warn',
        'unminified-javascript': 'warn',
        'unused-javascript': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'color-contrast': 'error',
        'tap-targets': 'warn',
        'viewport': 'error',
        
        // Allow some performance variance in CI
        'categories:performance': ['warn', { minScore: 0.7 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
