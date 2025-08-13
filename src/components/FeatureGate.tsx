import React from 'react';
import { usePlan } from '../contexts/PlanProvider';

interface Props {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({ feature, fallback = null, children }: Props) {
  const { hasFeature } = usePlan();
  if (!hasFeature(feature)) return <>{fallback}</>;
  return <>{children}</>;
}

export default FeatureGate;
