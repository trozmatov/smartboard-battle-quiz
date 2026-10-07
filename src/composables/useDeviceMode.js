import { ref, watch, onMounted } from 'vue';

// Global state for device mode: 'smartboard' | 'laptop'
const savedMode = typeof window !== 'undefined' ? localStorage.getItem('device_mode') : null;
export const deviceMode = ref(savedMode || 'laptop');

function updateBodyClass(mode) {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('mode-smartboard', 'mode-laptop');
    document.body.classList.add(`mode-${mode}`);
  }
}

// Apply initial mode
updateBodyClass(deviceMode.value);

// Watch mode changes globally
watch(deviceMode, (newMode) => {
  updateBodyClass(newMode);
});

/**
 * Composable to manage and switch between Smartboard and Laptop UI/UX modes
 */
export function useDeviceMode() {
  function setMode(mode) {
    if (mode === 'smartboard' || mode === 'laptop') {
      deviceMode.value = mode;
      if (typeof window !== 'undefined') {
        localStorage.setItem('device_mode', mode);
        updateBodyClass(mode);
      }
    }
  }

  function toggleMode() {
    const next = deviceMode.value === 'smartboard' ? 'laptop' : 'smartboard';
    setMode(next);
  }

  return {
    deviceMode,
    setMode,
    toggleMode,
    isSmartboard: () => deviceMode.value === 'smartboard',
    isLaptop: () => deviceMode.value === 'laptop'
  };
}
