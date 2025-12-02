// Setup file for Vitest tests
// This file runs before each test file

// Mock Web Audio API if needed
if (typeof window !== 'undefined') {
  // Ensure AudioContext is available
  if (!window.AudioContext && !(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) {
    // Mock AudioContext for tests if not available
    // (usually not needed in jsdom, but just in case)
  }
}

