import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { ankiService } from '../services/ankiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  currentModelName: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSave,
  currentModelName
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    const fetchFields = async () => {
      if (currentModelName && isOpen) {
        setLoadingFields(true);
        try {
          const fields = await ankiService.getModelFieldNames(currentModelName);
          setAvailableFields(fields);
        } catch (e) {
          console.error("Failed to fetch fields for model", e);
        } finally {
          setLoadingFields(false);
        }
      }
    };
    fetchFields();
  }, [currentModelName, isOpen]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Target Field Name
            </label>
            <p className="text-xs text-slate-500 mb-2">
              The field in your Anki card where notes will be saved.
            </p>
            
            {loadingFields ? (
                <div className="animate-pulse h-10 bg-slate-700 rounded w-full"></div>
            ) : availableFields.length > 0 ? (
                <select
                  value={localSettings.targetField}
                  onChange={(e) => setLocalSettings({...localSettings, targetField: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    {availableFields.map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                    {/* Add current if not in list (fallback) */}
                    {!availableFields.includes(localSettings.targetField) && (
                         <option value={localSettings.targetField}>{localSettings.targetField} (Custom)</option>
                    )}
                </select>
            ) : (
                <input
                  type="text"
                  value={localSettings.targetField}
                  onChange={(e) => setLocalSettings({ ...localSettings, targetField: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Notes, Extra, Remarks"
                />
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
            <div>
                <span className="text-sm font-medium text-slate-300">Auto-sync on load</span>
                <p className="text-xs text-slate-500">Automatically load existing notes when card changes</p>
            </div>
            <input
                type="checkbox"
                checked={localSettings.autoSync}
                onChange={(e) => setLocalSettings({...localSettings, autoSync: e.target.checked})}
                className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};