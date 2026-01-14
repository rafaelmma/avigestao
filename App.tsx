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
            birds: Array.isArray(parsed.birds) ? parsed.birds : MOCK_BIRDS,
            deletedBirds: Array.isArray(parsed.deletedBirds) ? parsed.deletedBirds : [],
            
            pairs: Array.isArray(parsed.pairs) ? parsed.pairs : [],
            deletedPairs: Array.isArray(parsed.deletedPairs) ? parsed.deletedPairs : [],

            clutches: Array.isArray(parsed.clutches) ? parsed.clutches : [],
            
            medications: Array.isArray(parsed.medications) ? parsed.medications : MOCK_MEDS,
            deletedMedications: Array.isArray(parsed.deletedMedications) ? parsed.deletedMedications : [],

            applications: Array.isArray(parsed.applications) ? parsed.applications : [],
            deletedApplications: Array.isArray(parsed.deletedApplications) ? parsed.deletedApplications : [],
            
            treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
            deletedTreatments: Array.isArray(parsed.deletedTreatments) ? parsed.deletedTreatments : [],

            movements: Array.isArray(parsed.movements) ? parsed.movements : [],
            deletedMovements: Array.isArray(parsed.deletedMovements) ? parsed.deletedMovements : [],

            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
            deletedTransactions: Array.isArray(parsed.deletedTransactions) ? parsed.deletedTransactions : [],

            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            deletedTasks: Array.isArray(parsed.deletedTasks) ? parsed.deletedTasks : [],

            tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
            deletedTournaments: Array.isArray(parsed.deletedTournaments) ? parsed.deletedTournaments : [],

            settings: safeSettings
          };
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar estado salvo, usando padrão.", e);
    }
    
    return {
      birds: MOCK_BIRDS, deletedBirds: [],
      pairs: [], deletedPairs: [],
      clutches: [],
      medications: MOCK_MEDS, deletedMedications: [],
      applications: [], deletedApplications: [],
      treatments: [], deletedTreatments: [],
      movements: [], deletedMovements: [],
      transactions: [], deletedTransactions: [],
      tasks: [], deletedTasks: [],
      tournaments: [], deletedTournaments: [],
      settings: INITIAL_SETTINGS
    };
  });

  // --- MIGRAÇÃO DE DADOS AUTOMÁTICA ---
  // Se o usuário é antigo e não tem trialEndDate, define automaticamente para ele ver a mudança.
  useEffect(() => {
    if (
  state.settings.plan === 'Básico' &&
  !state.settings.trialEndDate &&
  !localStorage.getItem("avigestao_user_id")
) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // Dá 7 dias de teste
      
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          plan: 'Profissional', // Eleva temporariamente para PRO
          trialEndDate: trialEnd.toISOString()
        }
      }));
      console.log("Migração V2.0: Trial ativado automaticamente para usuário existente.");
    }
  }, []);

  // Check for Trial Expiration on Mount
  useEffect(() => {
    if (state.settings.plan === 'Profissional' && state.settings.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(state.settings.trialEndDate);
      
      if (now > trialEnd) {
        // Trial Expired - Downgrade to Basic
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            plan: 'Básico',
            trialEndDate: undefined // Clear trial date
          }
        }));
        console.log("Período de teste expirado. Plano alterado para Básico.");
      }
    }
  }, []); // Run once on mount

  useEffect(() => {
    const authSession = localStorage.getItem('avigestao_auth');
    if (authSession === 'true') {
      setIsAuthenticated(true);
    }
    setAuthLoading(false);
  }, []);
  
  // 🔄 Sincroniza status da assinatura Stripe (global)
useEffect(() => {
  if (!isAuthenticated) return;

  const syncSubscriptionStatus = async () => {
    try {
      const userId = localStorage.getItem("avigestao_user_id");
      if (!userId) return;

      const res = await fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.status) return;

      if (data.isActive) {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            plan: "Profissional",
            trialEndDate: data.isTrial
              ? data.current_period_end
              : undefined,
          },
        }));
        return;
      }

      // Cancelado ou expirado
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          plan: "Básico",
          trialEndDate: undefined,
        },
      }));
    } catch (err) {
      console.error("Erro ao sincronizar assinatura:", err);
    }
  };

  syncSubscriptionStatus();
}, [isAuthenticated]);
  
  // 🔁 Retorno do Stripe (success / canceled)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('canceled') === 'true') {
    setActiveTab('settings');
    console.info('Pagamento cancelado pelo usuário');
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (params.get('success') === 'true') {
    setActiveTab('settings');
    console.info('Pagamento realizado com sucesso');
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);


  useEffect(() => {
    try {
      localStorage.setItem('avigestao_state', JSON.stringify(state));
      
      const root = document.documentElement;
      if (state.settings) {
        const pColor = state.settings.primaryColor || '#10B981';
        root.style.setProperty('--primary', pColor);
        root.style.setProperty('--primary-hover', pColor + 'ee');
        root.style.setProperty('--primary-soft', pColor + '15');
        root.style.setProperty('--accent', state.settings.accentColor || '#F59E0B');
      }
    } catch (e) {
      console.error("Erro ao salvar dados", e);
      setError("Erro ao salvar dados. Verifique o armazenamento do navegador.");
    }
  }, [state]);

  const handleLogin = (newSettings?: Partial<BreederSettings>) => {
  localStorage.setItem('avigestao_auth', 'true');

  if (newSettings?.userId) {
    localStorage.setItem('avigestao_user_id', newSettings.userId);
  }

  setIsAuthenticated(true);

  if (newSettings) {
    updateSettings({
      ...state.settings,
      ...newSettings
    });
  }
};

  const handleLogout = () => {
    localStorage.removeItem('avigestao_auth');
    setIsAuthenticated(false);
  };

  const updateSettings = (settings: BreederSettings) => setState(prev => ({ ...prev, settings }));

  // --- BIRDS ---
  const addBird = (bird: Bird) => setState(prev => ({ ...prev, birds: [...prev.birds, bird] }));
  const updateBird = (updatedBird: Bird) => setState(prev => ({
    ...prev,
    birds: prev.birds.map(b => b.id === updatedBird.id ? updatedBird : b)
  }));
  const deleteBird = (id: string) => {
    const item = state.birds.find(b => b.id === id);
    if (item) setState(prev => ({ ...prev, birds: prev.birds.filter(b => b.id !== id), deletedBirds: [item, ...(prev.deletedBirds || [])] }));
  };
  const restoreBird = (id: string) => {
    const item = state.deletedBirds?.find(b => b.id === id);
    if (item) setState(prev => ({ ...prev, deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id), birds: [...prev.birds, item] }));
  };
  const permanentlyDeleteBird = (id: string) => {
    setState(prev => ({ ...prev, deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id) }));
  };
  const updateBirdStatus = (id: string, status: any) => setState(prev => ({
    ...prev,
    birds: prev.birds.map(b => b.id === id ? { ...b, status } : b)
  }));

  // --- MOVEMENTS ---
  const addMovement = (mov: MovementRecord) => {
    setState(prev => ({ ...prev, movements: [mov, ...prev.movements] }));
    const newStatusMap: Record<string, any> = { 'Óbito': 'Falecido', 'Fuga': 'Fugido', 'Venda': 'Vendido', 'Transporte': 'Transferido' };
    if (newStatusMap[mov.type]) updateBirdStatus(mov.birdId, newStatusMap[mov.type]);
  };
  const updateMovement = (updatedMov: MovementRecord) => setState(prev => ({
    ...prev,
    movements: prev.movements.map(m => m.id === updatedMov.id ? updatedMov : m)
  }));
  const deleteMovement = (id: string) => {
    const item = state.movements.find(m => m.id === id);
    if (item) setState(prev => ({ ...prev, movements: prev.movements.filter(m => m.id !== id), deletedMovements: [item, ...(prev.deletedMovements || [])] }));
  };
  const restoreMovement = (id: string) => {
    const item = state.deletedMovements?.find(m => m.id === id);
    if (item) setState(prev => ({ ...prev, deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id), movements: [item, ...prev.movements] }));
  };
  const permanentlyDeleteMovement = (id: string) => {
    setState(prev => ({ ...prev, deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id) }));
  };

  // --- PAIRS / BREEDING ---
  const addPair = (pair: Pair) => setState(prev => ({ ...prev, pairs: [...prev.pairs, pair] }));
  const addClutch = (clutch: Clutch) => setState(prev => ({ ...prev, clutches: [...prev.clutches, clutch] }));
  const updateClutch = (updated: Clutch) => setState(prev => ({ ...prev, clutches: prev.clutches.map(c => c.id === updated.id ? updated : c) }));
  const deletePair = (id: string) => {
    const item = state.pairs.find(p => p.id === id);
    if (item) setState(prev => ({ ...prev, pairs: prev.pairs.filter(p => p.id !== id), deletedPairs: [item, ...(prev.deletedPairs || [])] }));
  };
  const restorePair = (id: string) => {
    const item = state.deletedPairs?.find(p => p.id === id);
    if (item) setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id), pairs: [...prev.pairs, item] }));
  };
  const permanentlyDeletePair = (id: string) => {
    setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id) }));
  };

  // --- MEDICATIONS & TREATMENTS ---
  const addMed = (med: Medication) => setState(prev => ({ ...prev, medications: [...prev.medications, med] }));
  const updateMed = (updatedMed: Medication) => setState(prev => ({
    ...prev,
    medications: prev.medications.map(m => m.id === updatedMed.id ? updatedMed : m)
  }));
  
  const applyMed = (app: MedicationApplication) => setState(prev => ({ ...prev, applications: [...prev.applications, app] }));
  const updateApplication = (updatedApp: MedicationApplication) => setState(prev => ({
    ...prev,
    applications: prev.applications.map(a => a.id === updatedApp.id ? updatedApp : a)
  }));
  const deleteApplication = (id: string) => {
    const item = state.applications.find(a => a.id === id);
    if (item) setState(prev => ({ ...prev, applications: prev.applications.filter(a => a.id !== id), deletedApplications: [item, ...(prev.deletedApplications || [])] }));
  };
  const restoreApplication = (id: string) => {
    const item = state.deletedApplications?.find(a => a.id === id);
    if (item) setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id), applications: [...prev.applications, item] }));
  };
  const permanentlyDeleteApplication = (id: string) => {
    setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id) }));
  };

  const deleteMed = (id: string) => {
    const item = state.medications.find(m => m.id === id);
    if (item) setState(prev => ({ ...prev, medications: prev.medications.filter(m => m.id !== id), deletedMedications: [item, ...(prev.deletedMedications || [])] }));
  };
  const restoreMed = (id: string) => {
    const item = state.deletedMedications?.find(m => m.id === id);
    if (item) setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id), medications: [...prev.medications, item] }));
  };
  const permanentlyDeleteMed = (id: string) => {
    setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id) }));
  };

  // New Treatment Functions
  const addTreatment = (t: ContinuousTreatment) => setState(prev => ({ ...prev, treatments: [...prev.treatments, t] }));
  const updateTreatment = (updated: ContinuousTreatment) => setState(prev => ({
    ...prev,
    treatments: prev.treatments.map(t => t.id === updated.id ? updated : t)
  }));
  const deleteTreatment = (id: string) => {
    const item = state.treatments.find(t => t.id === id);
    if (item) setState(prev => ({ ...prev, treatments: prev.treatments.filter(t => t.id !== id), deletedTreatments: [item, ...(prev.deletedTreatments || [])] }));
  };
  const restoreTreatment = (id: string) => {
    const item = state.deletedTreatments?.find(t => t.id === id);
    if (item) setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id), treatments: [...prev.treatments, item] }));
  };
  const permanentlyDeleteTreatment = (id: string) => {
    setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id) }));
  };

  // --- FINANCE ---
  const addTransaction = (t: Transaction) => setState(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
  const deleteTransaction = (id: string) => {
    const item = state.transactions.find(t => t.id === id);
    if (item) setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id), deletedTransactions: [item, ...(prev.deletedTransactions || [])] }));
  };
  const restoreTransaction = (id: string) => {
    const item = state.deletedTransactions?.find(t => t.id === id);
    if (item) setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(t => t.id !== id), transactions: [...prev.transactions, item] }));
  };
  const permanentlyDeleteTransaction = (id: string) => {
    setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(t => t.id !== id) }));
  };

  // --- TASKS ---
  const addTask = (t: MaintenanceTask) => setState(prev => ({ ...prev, tasks: [...prev.tasks, t] }));
  const updateTask = (updatedTask: MaintenanceTask) => setState(prev => ({
    ...prev,
    tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
  }));
  const toggleTask = (id: string) => setState(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t) }));
  const deleteTask = (id: string) => {
    const item = state.tasks.find(t => t.id === id);
    if (item) setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id), deletedTasks: [item, ...(prev.deletedTasks || [])] }));
  };
  const restoreTask = (id: string) => {
    const item = state.deletedTasks?.find(t => t.id === id);
    if (item) setState(prev => ({ ...prev, deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id), tasks: [...prev.tasks, item] }));
  };
  const permanentlyDeleteTask = (id: string) => {
    setState(prev => ({ ...prev, deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id) }));
  };

  // --- EVENTS ---
  const addEvent = (e: TournamentEvent) => setState(prev => ({ ...prev, tournaments: [...prev.tournaments, e] }));
  const updateEvent = (updated: TournamentEvent) => setState(prev => ({ ...prev, tournaments: prev.tournaments.map(e => e.id === updated.id ? updated : e) }));
  const deleteEvent = (id: string) => {
    const item = state.tournaments.find(e => e.id === id);
    if (item) setState(prev => ({ ...prev, tournaments: prev.tournaments.filter(e => e.id !== id), deletedTournaments: [item, ...(prev.deletedTournaments || [])] }));
  };
  const restoreEvent = (id: string) => {
    const item = state.deletedTournaments?.find(e => e.id === id);
    if (item) setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(e => e.id !== id), tournaments: [...prev.tournaments, item] }));
  };
  const permanentlyDeleteEvent = (id: string) => {
    setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(e => e.id !== id) }));
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  if (!state || !state.settings) {
  return null;
}


  // Verifica expiração do plano trial para o usuário ver
  
  const renderContent = () => {
    const currentTab = activeTab || 'dashboard';
    
    // Se for Financeiro e o plano for Básico (e não for um trial válido), bloqueia
    // Nota: A lógica de App.tsx já rebaixa o plano se o trial expirou, então só checar 'Básico' basta.
    if (currentTab === 'finance' && state.settings.plan === 'Básico') {
      return (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
              <DollarSign size={48} />
           </div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Módulo Profissional</h2>
           <p className="text-slate-500 font-medium mt-4 max-w-md mx-auto leading-relaxed">
             O controle completo de entradas, saídas e lucros é exclusivo do plano Profissional. Organize sua criação como uma empresa.
           </p>
           <button 
             onClick={() => setActiveTab('settings')}
             className="mt-10 px-10 py-5 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.05] transition-all flex items-center gap-3"
           >
             <Zap size={20} fill="currentColor" /> Assinar Plano PRO
           </button>
        </div>
      );
    }

    try {
      switch (currentTab) {
        case 'dashboard': return <Dashboard state={state} updateSettings={updateSettings} navigateTo={setActiveTab} />;
        case 'birds': 
          return <BirdManager 
            state={state} 
            addBird={addBird} 
            updateBird={updateBird} 
            deleteBird={deleteBird} 
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
          />;
        case 'movements': 
          return <MovementsManager 
            state={state} 
            addMovement={addMovement} 
            updateMovement={updateMovement}
            deleteMovement={deleteMovement}
            restoreMovement={restoreMovement}
            permanentlyDeleteMovement={permanentlyDeleteMovement}
          />;
        case 'breeding': 
          return <BreedingManager 
            state={state} 
            addPair={addPair} 
            addBird={addBird}
            addClutch={addClutch}
            updateClutch={updateClutch}
            deletePair={deletePair}
            restorePair={restorePair}
            permanentlyDeletePair={permanentlyDeletePair}
          />;
        case 'documents': 
          return <DocumentsManager 
            settings={state.settings} 
            updateSettings={updateSettings} 
          />;
        case 'meds': 
          return <MedsManager 
            state={state} 
            addMed={addMed} 
            updateMed={updateMed} 
            applyMed={applyMed} 
            deleteMed={deleteMed}
            restoreMed={restoreMed}
            permanentlyDeleteMed={permanentlyDeleteMed}
            addTreatment={addTreatment}
            updateTreatment={updateTreatment}
            deleteTreatment={deleteTreatment}
            restoreTreatment={restoreTreatment}
            permanentlyDeleteTreatment={permanentlyDeleteTreatment}
            updateApplication={updateApplication}
            deleteApplication={deleteApplication}
            restoreApplication={restoreApplication}
            permanentlyDeleteApplication={permanentlyDeleteApplication}
          />;
        case 'finance': 
          return <FinanceManager 
            state={state} 
            addTransaction={addTransaction} 
            deleteTransaction={deleteTransaction} 
            restoreTransaction={restoreTransaction}
            permanentlyDeleteTransaction={permanentlyDeleteTransaction}
          />;
        case 'tasks': 
          return <TaskManager 
            state={state} 
            addTask={addTask} 
            updateTask={updateTask}
            toggleTask={toggleTask} 
            deleteTask={deleteTask} 
            restoreTask={restoreTask}
            permanentlyDeleteTask={permanentlyDeleteTask}
          />;
        case 'tournaments': 
          return <TournamentCalendar 
            state={state} 
            addEvent={addEvent} 
            deleteEvent={deleteEvent} 
            updateEvent={updateEvent} 
            restoreEvent={restoreEvent}
            permanentlyDeleteEvent={permanentlyDeleteEvent}
          />;
        case 'settings': return <SettingsManager settings={state.settings} updateSettings={updateSettings} />;
        case 'help': return <HelpCenter />;
        default: return <Dashboard state={state} updateSettings={updateSettings} navigateTo={setActiveTab} />;
      }
    } catch (err) {
      console.error("Erro ao renderizar aba:", err);
      return (
        <div className="p-8 text-center text-rose-500">
          <p>Erro ao carregar esta seção. Tente recarregar a página.</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-[var(--primary-soft)] selection:text-[var(--primary)]">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        logoUrl={state.settings.logoUrl}
        breederName={state.settings.breederName || 'Meu Criatório'}
        plan={state.settings.plan || 'Básico'}
        trialEndDate={state.settings.trialEndDate} // Pass trial date
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto w-full transition-all">
        <div className="lg:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 p-1">
                 <img src={state.settings.logoUrl} className="w-full h-full object-contain" alt="Logo" />
              </div>
              <span className="font-black text-slate-800">AviGestão</span>
           </div>
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
           >
             <Menu size={24} />
           </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2 text-sm font-bold">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {renderContent()}
      </main>
      
      <style>{`
        .bg-brand { background-color: var(--primary) !important; }
        .bg-brand-soft { background-color: var(--primary-soft) !important; }
        .text-brand { color: var(--primary) !important; }
        .border-brand { border-color: var(--primary) !important; }
        .ring-brand { --tw-ring-color: var(--primary) !important; }
        .hover\\:bg-brand:hover { background-color: var(--primary-hover) !important; }
      `}</style>
    </div>
  );
};

export default App;