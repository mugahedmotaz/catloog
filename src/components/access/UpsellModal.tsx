import React from 'react';

interface UpsellModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const UpsellModal: React.FC<UpsellModalProps> = ({
  open,
  onClose,
  title = 'الترقية مطلوبة',
  description = 'هذه الميزة متاحة في خطة أعلى. قم بالترقية للاستفادة منها.',
  actionLabel = 'عرض الخطط',
  onAction,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            إغلاق
          </button>
          {onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpsellModal;
