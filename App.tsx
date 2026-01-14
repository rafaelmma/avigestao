import React, { useState, useEffect } from 'react';
import { AppState, Bird, Pair, Clutch, Medication, MedicationApplication, BreederSettings, MovementRecord, Transaction, MaintenanceTask, TournamentEvent, ContinuousTreatment } from './types';
import { MOCK_BIRDS, MOCK_MEDS, INITIAL_SETTINGS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BirdManager from './pages/BirdManager';
import BreedingManager from './pages/BreedingManager';
import MedsManager from './pages/MedsManager';
import SettingsManager from './pages/SettingsManager';
import DocumentsManager from './pages/DocumentsManager';
import MovementsManager from './pages/MovementsManager';
import FinanceManager from './pages/FinanceManager';
import TaskManager from './pages/TaskManager';
import TournamentCalendar from './pages/TournamentCalendar';
import HelpCenter from './pages/HelpCenter';
import Auth from './pages/Auth';
import { DollarSign, Zap, AlertTriangle, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('avigestao_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const safeSettings = parsed.settings ? { ...INITIAL_SETTINGS, ...parsed.settings } : INITIAL_SETTINGS;
          return {
            birds: parsed.birds || MOCK_BIRDS,
            deletedBirds: parsed.deletedBirds || [],
            pairs: parsed.pairs || [],
            deletedPairs: parsed.deletedPairs || [],
            clutches: parsed.clutches || [],
            medications: parsed.medications || MOCK_MEDS,
            deletedMedications: parsed.deletedMedications || [],
            applications: parsed.applications || [],
            deletedApplications: parsed.deletedApplications || [],
            treatments: parsed.treatments || [],
            deletedTreatments: parsed.deletedTreatments || [],
            movements: parsed.movements || [],
            deletedMovements: parsed.deletedMovements || [],
            transactions: parsed.transactions || [],
            deletedTransactions: parsed.deletedTransactions || [],
            tasks: parsed.tasks || [],
            deletedTasks: parsed.deletedTasks || [],
            tournaments: parsed.tournaments || [],
            deletedTournaments: parsed.deletedTournaments || [],
            settings: safeSettings
          };
        }
      }
    } catch {}
    return {
      birds: MOCK_BIRDS,
      deletedBirds: [],
      pairs: [],
      deletedPairs: [],
      clutches: [],
      medications: MOCK_MEDS,
      deletedMedications: [],
      applications: [],
      deletedApplications: [],
      treatments: [],
      deletedTreatments: [],
      movements: [],
      deletedMovements: [],
      transactions: [],
      deletedTransactions: [],
      tasks: [],
      deletedTasks: [],
      tournaments: [],
      deletedTournaments: [],
      settings: INITIAL_SETTINGS
    };
  });

  /** 🔥 TRATAMENTO DO RETORNO DO STRIPE (SUCCESS / CANCELED) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');

    if (checkoutStatus === 'success') {
      setActiveTab('settings');
      alert('Pagamento realizado com sucesso!');
      window.history.replaceState({}, '', '/');
    }

    if (checkoutStatus === 'canceled') {
      setActiveTab('settings');
      alert('Pagamento cancelado.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    const authSession = localStorage.getItem('avigestao_auth');
    if (authSession === 'true') setIsAuthenticated(true);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('avigestao_state', JSON.stringify(state));
  }, [state]);

  const updateSettings = (settings: BreederSettings) =>
    setState(prev => ({ ...prev, settings }));

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center">Carregando…</div>;
  }

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard state={state} updateSettings={updateSettings} navigateTo={setActiveTab} />;
      case 'birds': return <BirdManager state={state} />;
      case 'breeding': return <BreedingManager state={state} />;
      case 'movements': return <MovementsManager state={state} />;
      case 'documents': return <DocumentsManager settings={state.settings} updateSettings={updateSettings} />;
      case 'meds': return <MedsManager state={state} />;
      case 'finance':
        if (state.settings.plan === 'Básico') {
          return (
            <div className="h-[70vh] flex flex-col items-center justify-center">
              <DollarSign size={64} />
              <p>Plano Profissional necessário</p>
              <button onClick={() => setActiveTab('settings')}>
                <Zap /> Assinar PRO
              </button>
            </div>
          );
        }
        return <FinanceManager state={state} />;
      case 'tasks': return <TaskManager state={state} />;
      case 'tournaments': return <TournamentCalendar state={state} />;
      case 'settings': return <SettingsManager settings={state.settings} updateSettings={updateSettings} />;
      case 'help': return <HelpCenter />;
      default: return <Dashboard state={state} updateSettings={updateSettings} navigateTo={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        plan={state.settings.plan}
        onLogout={() => setIsAuthenticated(false)}
      />

      <main className="flex-1 p-6">
        {error && <div className="text-red-500">{error}</div>}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
