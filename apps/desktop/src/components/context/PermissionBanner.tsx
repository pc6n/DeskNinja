interface PermissionBannerProps {
  trusted: boolean;
  prompted: boolean;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export function PermissionBanner({
  trusted,
  prompted,
  onOpenSettings,
  onDismiss,
}: PermissionBannerProps) {
  if (trusted || prompted) {
    return null;
  }

  return (
    <div className="context-permission" role="alert">
      <p>DeskNinja needs Accessibility access to read selected text.</p>
      <div className="context-permission-actions">
        <button type="button" onClick={() => void onOpenSettings()}>
          Open Settings
        </button>
        <button type="button" className="secondary" onClick={() => void onDismiss()}>
          Later
        </button>
      </div>
    </div>
  );
}
