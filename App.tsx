import React, { useEffect, useState } from 'react';
import {
  AppState,
  Bird,
  Pair,
  Clutch,
  Medication,
  MedicationApplication,
  BreederSettings,
  MovementRecord,
  Transaction,
  MaintenanceTask,
  TournamentEvent,
  ContinuousTreatment
} from './types';
import { INITIAL_SETTINGS, MOCK_BIRDS, MOCK_MEDS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BirdManager from './pages/BirdManager';
import BreedingManager from './pages/BreedingManager';
import MedsManager from './pages/MedsManager';
import SettingsManager from './pages/SettingsManager';
import MovementsManager from './pages/MovementsManager';
import FinanceManager from './pages/FinanceManager';
import TaskManager from './pages/TaskManager';
import TournamentCalendar from './pages/TournamentCalendar';
import HelpCenter from './pages/HelpCenter';
import DocumentsManager from './pages/DocumentsManager';

const STORAGE_KEY = 'avigestao_state';

const defaultState: AppState = {
  birds: MOCK_BIRDS,
  deletedBirds: [],
  pairs: [],
  deletedPairs: [],
  clutches: [],
  medications: MOCK_MEDS,
  deletedMedications: [],
  medicationCatalog: [],
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

const normalizeTrialEndDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed.getTime() >= Date.now() ? parsed.toISOString().split('T')[0] : undefined;
};

const mergeState = (saved: Partial<AppState> | null): AppState => {
  if (!saved) return defaultState;
  return {
    ...defaultState,
    ...saved,
    birds: saved.birds ?? defaultState.birds,
    deletedBirds: saved.deletedBirds ?? defaultState.deletedBirds,
    pairs: saved.pairs ?? defaultState.pairs,
    deletedPairs: saved.deletedPairs ?? defaultState.deletedPairs,
    clutches: saved.clutches ?? defaultState.clutches,
    medications: saved.medications ?? defaultState.medications,
    deletedMedications: saved.deletedMedications ?? defaultState.deletedMedications,
    medicationCatalog: saved.medicationCatalog ?? defaultState.medicationCatalog,
    applications: saved.applications ?? defaultState.applications,
    deletedApplications: saved.deletedApplications ?? defaultState.deletedApplications,
    treatments: saved.treatments ?? defaultState.treatments,
    deletedTreatments: saved.deletedTreatments ?? defaultState.deletedTreatments,
    movements: saved.movements ?? defaultState.movements,
    deletedMovements: saved.deletedMovements ?? defaultState.deletedMovements,
    transactions: saved.transactions ?? defaultState.transactions,
    deletedTransactions: saved.deletedTransactions ?? defaultState.deletedTransactions,
    tasks: saved.tasks ?? defaultState.tasks,
    deletedTasks: saved.deletedTasks ?? defaultState.deletedTasks,
    tournaments: saved.tournaments ?? defaultState.tournaments,
    deletedTournaments: saved.deletedTournaments ?? defaultState.deletedTournaments,
    settings: {
      ...defaultState.settings,
      ...(saved.settings || {}),
      trialEndDate: normalizeTrialEndDate(saved.settings?.trialEndDate)
    }
  };
};

const loadState = (): AppState => {
  if (typeof localStorage === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return mergeState(parsed);
  } catch (err) {
    console.warn('Failed to parse saved state, using defaults', err);
    return defaultState;
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [state, setState] = useState<AppState>(() => loadState());

  // Persist and sync theme colors
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures (private mode, etc)
    }

    const root = document.documentElement;
    root.style.setProperty('--primary', state.settings.primaryColor);
    root.style.setProperty('--primary-hover', state.settings.primaryColor + 'ee');
    root.style.setProperty('--primary-soft', state.settings.primaryColor + '15');
    root.style.setProperty('--accent', state.settings.accentColor);
  }, [state]);

  const navigateTo = (tab: string) => setActiveTab(tab);

  // Birds
  const addBird = (bird: Bird) => setState(prev => ({ ...prev, birds: [...prev.birds, bird] }));
  const updateBird = (bird: Bird) => setState(prev => ({
    ...prev,
    birds: prev.birds.map(b => (b.id === bird.id ? bird : b))
  }));
  const deleteBird = (id: string) =>
    setState(prev => {
      const found = prev.birds.find(b => b.id === id);
      if (!found) return prev;
      const deleted = { ...found, deletedAt: new Date().toISOString() };
      return {
        ...prev,
        birds: prev.birds.filter(b => b.id !== id),
        deletedBirds: [...(prev.deletedBirds || []), deleted]
      };
    });
  const restoreBird = (id: string) =>
    setState(prev => {
      const found = (prev.deletedBirds || []).find(b => b.id === id);
      if (!found) return prev;
      return {
        ...prev,
        birds: [...prev.birds, { ...found, deletedAt: undefined }],
        deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id)
      };
    });
  const permanentlyDeleteBird = (id: string) =>
    setState(prev => ({ ...prev, deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id) }));

  // Movements
  const addMovement = (mov: MovementRecord) =>
    setState(prev => ({ ...prev, movements: [mov, ...prev.movements] }));
  const updateMovement = (mov: MovementRecord) =>
    setState(prev => ({
      ...prev,
      movements: prev.movements.map(m => (m.id === mov.id ? mov : m))
    }));
  const deleteMovement = (id: string) =>
    setState(prev => {
      const found = prev.movements.find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        movements: prev.movements.filter(m => m.id !== id),
        deletedMovements: [...(prev.deletedMovements || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreMovement = (id: string) =>
    setState(prev => {
      const found = (prev.deletedMovements || []).find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        movements: [found, ...prev.movements],
        deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id)
      };
    });
  const permanentlyDeleteMovement = (id: string) =>
    setState(prev => ({ ...prev, deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id) }));

  // Pairs / Breeding
  const addPair = (pair: Pair) => setState(prev => ({ ...prev, pairs: [...prev.pairs, pair] }));
  const updatePair = (pair: Pair) =>
    setState(prev => ({
      ...prev,
      pairs: prev.pairs.map(p => (p.id === pair.id ? pair : p))
    }));
  const deletePair = (id: string) =>
    setState(prev => {
      const found = prev.pairs.find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: prev.pairs.filter(p => p.id !== id),
        deletedPairs: [...(prev.deletedPairs || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restorePair = (id: string) =>
    setState(prev => {
      const found = (prev.deletedPairs || []).find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: [...prev.pairs, { ...found, deletedAt: undefined }],
        deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id)
      };
    });
  const permanentlyDeletePair = (id: string) =>
    setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id) }));

  const addClutch = (clutch: Clutch) => setState(prev => ({ ...prev, clutches: [...prev.clutches, clutch] }));
  const updateClutch = (clutch: Clutch) =>
    setState(prev => ({
      ...prev,
      clutches: prev.clutches.map(c => (c.id === clutch.id ? clutch : c))
    }));

  // Medications
  const addMed = (med: Medication) => setState(prev => ({ ...prev, medications: [...prev.medications, med] }));
  const updateMed = (med: Medication) =>
    setState(prev => ({
      ...prev,
      medications: prev.medications.map(m => (m.id === med.id ? med : m))
    }));
  const deleteMed = (id: string) =>
    setState(prev => {
      const found = prev.medications.find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        medications: prev.medications.filter(m => m.id !== id),
        deletedMedications: [...(prev.deletedMedications || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreMed = (id: string) =>
    setState(prev => {
      const found = (prev.deletedMedications || []).find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        medications: [...prev.medications, { ...found, deletedAt: undefined }],
        deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id)
      };
    });
  const permanentlyDeleteMed = (id: string) =>
    setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id) }));

  const applyMed = (app: MedicationApplication) =>
    setState(prev => ({ ...prev, applications: [...prev.applications, app] }));
  const updateApplication = (app: MedicationApplication) =>
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(a => (a.id === app.id ? app : a))
    }));
  const deleteApplication = (id: string) =>
    setState(prev => {
      const found = prev.applications.find(a => a.id === id);
      if (!found) return prev;
      return {
        ...prev,
        applications: prev.applications.filter(a => a.id !== id),
        deletedApplications: [...(prev.deletedApplications || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreApplication = (id: string) =>
    setState(prev => {
      const found = (prev.deletedApplications || []).find(a => a.id === id);
      if (!found) return prev;
      return {
        ...prev,
        applications: [...prev.applications, { ...found, deletedAt: undefined }],
        deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id)
      };
    });
  const permanentlyDeleteApplication = (id: string) =>
    setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id) }));

  const addTreatment = (t: ContinuousTreatment) =>
    setState(prev => ({ ...prev, treatments: [...prev.treatments, t] }));
  const updateTreatment = (t: ContinuousTreatment) =>
    setState(prev => ({
      ...prev,
      treatments: prev.treatments.map(item => (item.id === t.id ? t : item))
    }));
  const deleteTreatment = (id: string) =>
    setState(prev => {
      const found = prev.treatments.find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        treatments: prev.treatments.filter(t => t.id !== id),
        deletedTreatments: [...(prev.deletedTreatments || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreTreatment = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTreatments || []).find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        treatments: [...prev.treatments, { ...found, deletedAt: undefined }],
        deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id)
      };
    });
  const permanentlyDeleteTreatment = (id: string) =>
    setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id) }));

  // Finance
  const addTransaction = (t: Transaction) =>
    setState(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
  const deleteTransaction = (id: string) =>
    setState(prev => {
      const found = prev.transactions.find(tx => tx.id === id);
      if (!found) return prev;
      return {
        ...prev,
        transactions: prev.transactions.filter(tx => tx.id !== id),
        deletedTransactions: [...(prev.deletedTransactions || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreTransaction = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTransactions || []).find(tx => tx.id === id);
      if (!found) return prev;
      return {
        ...prev,
        transactions: [...prev.transactions, { ...found, deletedAt: undefined }],
        deletedTransactions: (prev.deletedTransactions || []).filter(tx => tx.id !== id)
      };
    });
  const permanentlyDeleteTransaction = (id: string) =>
    setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(tx => tx.id !== id) }));

  // Tasks
  const addTask = (t: MaintenanceTask) => setState(prev => ({ ...prev, tasks: [...prev.tasks, t] }));
  const updateTask = (t: MaintenanceTask) =>
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => (task.id === t.id ? t : task))
    }));
  const toggleTask = (id: string) =>
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      )
    }));
  const deleteTask = (id: string) =>
    setState(prev => {
      const found = prev.tasks.find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id),
        deletedTasks: [...(prev.deletedTasks || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreTask = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTasks || []).find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tasks: [...prev.tasks, { ...found, deletedAt: undefined }],
        deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id)
      };
    });
  const permanentlyDeleteTask = (id: string) =>
    setState(prev => ({ ...prev, deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id) }));

  // Tournaments
  const addEvent = (e: TournamentEvent) =>
    setState(prev => ({ ...prev, tournaments: [...prev.tournaments, e] }));
  const updateEvent = (e: TournamentEvent) =>
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(ev => (ev.id === e.id ? e : ev))
    }));
  const deleteEvent = (id: string) =>
    setState(prev => {
      const found = prev.tournaments.find(ev => ev.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tournaments: prev.tournaments.filter(ev => ev.id !== id),
        deletedTournaments: [...(prev.deletedTournaments || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreEvent = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTournaments || []).find(ev => ev.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tournaments: [...prev.tournaments, { ...found, deletedAt: undefined }],
        deletedTournaments: (prev.deletedTournaments || []).filter(ev => ev.id !== id)
      };
    });
  const permanentlyDeleteEvent = (id: string) =>
    setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(ev => ev.id !== id) }));

  const updateSettings = (settings: BreederSettings) =>
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));

  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage cleanup issues
    }
    setState(defaultState);
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard state={state} updateSettings={updateSettings} navigateTo={navigateTo} />;
      case 'birds':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
          />
        );
      case 'sexing':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            initialList="sexagem"
            includeSexingTab
            showListTabs
            titleOverride="Central de Sexagem"
          />
        );
      case 'breeding':
        return (
          <BreedingManager
            state={state}
            addPair={addPair}
            updatePair={updatePair}
            addBird={addBird}
            addClutch={addClutch}
            updateClutch={updateClutch}
            deletePair={deletePair}
            restorePair={restorePair}
            permanentlyDeletePair={permanentlyDeletePair}
          />
        );
      case 'meds':
        return (
          <MedsManager
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
          />
        );
      case 'movements':
        return (
          <MovementsManager
            state={state}
            addMovement={addMovement}
            updateMovement={updateMovement}
            deleteMovement={deleteMovement}
            restoreMovement={restoreMovement}
            permanentlyDeleteMovement={permanentlyDeleteMovement}
          />
        );
      case 'finance':
        return (
          <FinanceManager
            state={state}
            addTransaction={addTransaction}
            deleteTransaction={deleteTransaction}
            restoreTransaction={restoreTransaction}
            permanentlyDeleteTransaction={permanentlyDeleteTransaction}
          />
        );
      case 'tasks':
        return (
          <TaskManager
            state={state}
            addTask={addTask}
            updateTask={updateTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            restoreTask={restoreTask}
            permanentlyDeleteTask={permanentlyDeleteTask}
          />
        );
      case 'tournaments':
        return (
          <TournamentCalendar
            state={state}
            addEvent={addEvent}
            deleteEvent={deleteEvent}
            updateEvent={updateEvent}
            restoreEvent={restoreEvent}
            permanentlyDeleteEvent={permanentlyDeleteEvent}
          />
        );
      case 'documents':
        return <DocumentsManager settings={state.settings} updateSettings={updateSettings} />;
      case 'settings':
        return <SettingsManager settings={state.settings} updateSettings={updateSettings} />;
      case 'help':
        return <HelpCenter />;
      default:
        return <Dashboard state={state} updateSettings={updateSettings} navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-[var(--primary-soft)] selection:text-[var(--primary)]">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logoUrl={state.settings.logoUrl}
        breederName={state.settings.breederName}
        plan={state.settings.plan}
        trialEndDate={state.settings.trialEndDate}
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
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
