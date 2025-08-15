import React, { useMemo, useState } from 'react';
import { useEntitlements } from '../../hooks/useEntitlements';
import UpsellModal from './UpsellModal';

interface FeatureGateProps {
  feature: string; // e.g., 'themes.customization'
  children: React.ReactNode;
  fallback?: React.ReactNode; // optional alternative if locked
  // Optional custom upsell content
  upsellTitle?: string;
  upsellDescription?: string;
  upsellActionLabel?: string;
  onUpsellAction?: () => void;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  upsellTitle,
  upsellDescription,
  upsellActionLabel,
  onUpsellAction,
}) => {
  const { has } = useEntitlements();
  const allowed = useMemo(() => has(feature), [has, feature]);
  const [open, setOpen] = useState(false);

  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
      >
        هذه الميزة غير مفعّلة — ترقية
      </button>
      <UpsellModal
        open={open}
        onClose={() => setOpen(false)}
        title={upsellTitle}
        description={upsellDescription}
        actionLabel={upsellActionLabel}
        onAction={onUpsellAction}
      />
    </>
  );
};

export default FeatureGate;
