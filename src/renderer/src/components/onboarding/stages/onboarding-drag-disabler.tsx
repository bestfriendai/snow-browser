export function OnboardingDragDisabler() {
  // Enable drag for Topbar only
  // Don't create a full-screen overlay that could block clicks
  return (
    <div className="absolute top-0 left-0 right-0 h-[calc(env(titlebar-area-y)+env(titlebar-area-height))] app-drag pointer-events-none z-0" />
  );
}
