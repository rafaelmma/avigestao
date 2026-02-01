import React from 'react';
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { ViewPreferences } from '../types';

interface ViewSettingsProps {
  preferences: ViewPreferences;
  onPreferencesChange: (preferences: ViewPreferences) => void;
}

const ViewSettings: React.FC<ViewSettingsProps> = ({ preferences, onPreferencesChange }) => {
  const defaultPrefs: ViewPreferences = {
    showBirdImages: true,
    badgeSize: 'xs',
    compactMode: false,
    ...preferences
  };

  const handleToggleImages = () => {
    onPreferencesChange({
      ...defaultPrefs,
      showBirdImages: !defaultPrefs.showBirdImages
    });
  };

  const handleBadgeSizeChange = (size: 'xxs' | 'xs' | 'sm' | 'md' | 'lg') => {
    onPreferencesChange({
      ...defaultPrefs,
      badgeSize: size
    });
  };

  const handleToggleCompact = () => {
    onPreferencesChange({
      ...defaultPrefs,
      compactMode: !defaultPrefs.compactMode
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Toggle Imagens */}
      <button
        onClick={handleToggleImages}
        title={defaultPrefs.showBirdImages ? 'Ocultar imagens' : 'Mostrar imagens'}
        className={`p-2 rounded-lg transition-colors ${
          defaultPrefs.showBirdImages
            ? 'bg-blue-100 text-blue-600'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {defaultPrefs.showBirdImages ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>

      {/* Badge Size */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {(['xxs', 'xs', 'sm', 'md', 'lg'] as const).map(size => (
          <button
            key={size}
            onClick={() => handleBadgeSizeChange(size)}
            title={`Badge ${size}`}
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
              defaultPrefs.badgeSize === size
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            {size.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Toggle Modo Compacto */}
      <button
        onClick={handleToggleCompact}
        title={defaultPrefs.compactMode ? 'Modo normal' : 'Modo compacto'}
        className={`p-2 rounded-lg transition-colors ${
          defaultPrefs.compactMode
            ? 'bg-green-100 text-green-600'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {defaultPrefs.compactMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </div>
  );
};

export default ViewSettings;
