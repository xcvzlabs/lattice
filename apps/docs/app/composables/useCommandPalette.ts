export function useCommandPalette() {
  const open = useState('command-palette-open', () => false);

  function show(): void {
    open.value = true;
  }

  function hide(): void {
    open.value = false;
  }

  function toggle(): void {
    open.value = !open.value;
  }

  return { open, show, hide, toggle };
}
