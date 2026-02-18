import React, { useState, useEffect } from 'react';
import { MapPin, Loader, Edit2, Save, X } from 'lucide-react';
import { BRAZILIAN_REGIONS, State, getAllStates, BrazilianRegion } from '../lib/brazilianRegions';
import { saveLibraryUserSettings, getLibraryUserSettings } from '../lib/libraryService';
import { auth } from '../lib/firebase';

interface RegionSelectorProps {
  onRegionSaved?: (region: BrazilianRegion, state?: string) => void;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({ onRegionSaved }) => {
  const [selectedRegion, setSelectedRegion] = useState<BrazilianRegion | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [savedRegion, setSavedRegion] = useState<BrazilianRegion | null>(null);
  const [savedState, setSavedState] = useState<State | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserRegion();
  }, []);

  const loadUserRegion = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const settings = await getLibraryUserSettings(user.uid);
      if (settings) {
        setSavedRegion(settings.region);
        setSelectedRegion(settings.region);
        if (settings.state) {
          setSavedState(settings.state as State);
          setSelectedState(settings.state as State);
        }
      } else {
        // Default para Sudeste se não tiver configuração
        setSavedRegion('Sudeste');
        setSelectedRegion('Sudeste');
      }
    } catch (error) {
      console.error('Erro ao carregar região:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRegion = async () => {
    if (!selectedRegion) return;
    
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await saveLibraryUserSettings(user.uid, selectedRegion, selectedState || undefined);
        setSavedRegion(selectedRegion);
        setSavedState(selectedState);
        setIsEditing(false);
        onRegionSaved?.(selectedRegion, selectedState || undefined);
      }
    } catch (error) {
      console.error('Erro ao salvar região:', error);
      alert('Erro ao salvar região. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedRegion(savedRegion);
    setSelectedState(savedState);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Loader size={20} className="animate-spin inline-block" />
        <p className="text-slate-600 mt-2">Carregando preferências...</p>
      </div>
    );
  }

  // Modo visualização - mostra região salva com botão editar
  if (!isEditing) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-[30px] p-8 border border-emerald-200 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="text-emerald-600" size={24} />
            <h3 className="text-2xl font-black text-slate-900">Sua Região Climática</h3>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm transition-colors"
          >
            <Edit2 size={16} />
            Editar Região
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 border border-emerald-100">
          {savedRegion ? (
            <div>
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">Região Selecionada:</p>
                <p className="text-2xl font-black text-emerald-600 mb-4">{savedRegion}</p>
                {savedState && (
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Estado:</p>
                    <p className="text-xl font-black text-emerald-700">{savedState}</p>
                  </div>
                )}
              </div>

              {/* Info do Clima */}
              <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-slate-700 font-semibold">
                  <span className="text-emerald-600 font-black">📍 {BRAZILIAN_REGIONS[savedRegion].description}</span>
                </p>
                <p className="text-sm text-slate-600 mt-3 font-semibold">
                  🌡️ Temperatura anual: {BRAZILIAN_REGIONS[savedRegion].temperatureRange.min}°C a{' '}
                  {BRAZILIAN_REGIONS[savedRegion].temperatureRange.max}°C
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">Clique em "Editar Região" para selecionar sua região</p>
          )}
        </div>
      </div>
    );
  }

  // Modo edição - seletor interativo
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[30px] p-8 border border-blue-200 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MapPin className="text-blue-600" size={24} />
          <h3 className="text-2xl font-black text-slate-900">Editar Região Climática</h3>
        </div>
      </div>

      <p className="text-slate-700 mb-6">
        Selecione a sua região para personalizar o calendário sazonal com dados climáticos específicos:
      </p>

      {/* Seleção de Região */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {Object.entries(BRAZILIAN_REGIONS).map(([key, region]) => (
          <button
            key={key}
            onClick={() => setSelectedRegion(region.region as BrazilianRegion)}
            disabled={saving}
            className={`p-4 rounded-xl font-bold transition-all text-left ${
              selectedRegion === region.region
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-900 border-2 border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="font-black text-lg mb-1">{region.region}</div>
            <div className={`text-sm ${selectedRegion === region.region ? 'text-blue-100' : 'text-slate-600'}`}>
              {region.states.slice(0, 3).join(', ')}...
            </div>
          </button>
        ))}
      </div>

      {/* Seleção de Estado */}
      {selectedRegion && (
        <div className="mb-6">
          <label className="block text-sm font-black text-slate-900 mb-3">
            Selecione seu Estado na Região: {selectedRegion}
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {BRAZILIAN_REGIONS[selectedRegion].states.map(state => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                disabled={saving}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedState === state
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-slate-700 border border-slate-300 hover:border-indigo-400'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info do Clima */}
      {selectedRegion && (
        <div className="mt-6 p-4 bg-white rounded-lg border border-slate-200 mb-6">
          <p className="text-sm text-slate-700 font-semibold">
            <span className="text-blue-600 font-black">📍 {BRAZILIAN_REGIONS[selectedRegion].description}</span>
          </p>
          <p className="text-sm text-slate-600 mt-3 font-semibold">
            🌡️ Temperatura anual: {BRAZILIAN_REGIONS[selectedRegion].temperatureRange.min}°C a{' '}
            {BRAZILIAN_REGIONS[selectedRegion].temperatureRange.max}°C
          </p>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-end mt-8">
        <button
          onClick={handleCancel}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 font-bold transition-colors disabled:opacity-50"
        >
          <X size={18} />
          Cancelar
        </button>
        <button
          onClick={handleSaveRegion}
          disabled={saving || !selectedRegion}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader size={18} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              Salvar Região
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RegionSelector;
