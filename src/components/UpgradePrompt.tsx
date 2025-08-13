import { Link } from 'react-router-dom';

export default function UpgradePrompt({ title = 'Upgrade required', message = 'This feature is not available on your current plan.' }: { title?: string; message?: string }) {
  return (
    <div className="p-6 rounded-2xl border border-amber-300 bg-amber-50">
      <h3 className="font-semibold text-amber-900">{title}</h3>
      <p className="text-sm text-amber-800 mt-1">{message}</p>
      <div className="mt-4">
        <Link to="/dashboard/upgrade" className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium">
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}
