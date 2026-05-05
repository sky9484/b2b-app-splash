import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-text-muted">
        <SettingsIcon size={40} className="animate-[spin_4s_linear_infinite]" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-text-dark">Settings Coming Soon</h1>
        <p className="text-text-muted font-medium max-w-sm">We are working hard to bring you more control over your account, notifications, and team members.</p>
      </div>
    </div>
  );
}
