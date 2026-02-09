import React, { useState, Suspense } from 'react';
import { AppState, Medication, MedicationApplication, ContinuousTreatment, Bird } from '../types';
import {
  Plus,
  FlaskConical,
  History,
  AlertTriangle,
  Search,
  Save,
  Trash2,
  RefreshCcw,
  X,
  Edit,
  LayoutGrid,
  Calendar,
  Minus,
  CheckCircle2,
  Repeat,
  Syringe,
  PlayCircle,
  PauseCircle,
  Check,
  Clock,
  CheckSquare,
  Zap,
  Lock,
  HelpCircle,
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import WizardLayout, { WizardStep } from '../components/WizardLayout';

interface MedsManagerProps {
  state: AppState;
  addMed: (med: Medication) => void;
  updateMed: (med: Medication) => void;
  applyMed: (app: MedicationApplication) => void;
  deleteMed?: (id: string) => void;
  restoreMed?: (id: string) => void;
  permanentlyDeleteMed?: (id: string) => void;
  isAdmin?: boolean;

  // Tratamentos Contínuos
  addTreatment?: (t: ContinuousTreatment) => void;
  updateTreatment?: (t: ContinuousTreatment) => void;
  deleteTreatment?: (id: string) => void;
  restoreTreatment?: (id: string) => void;
  permanentlyDeleteTreatment?: (id: string) => void;

  // Histórico
  updateApplication?: (app: MedicationApplication) => void;
  deleteApplication?: (id: string) => void;
  restoreApplication?: (id: string) => void;
  permanentlyDeleteApplication?: (id: string) => void;
}

const MedsManager: React.FC<MedsManagerProps> = ({
  state,
  addMed,
  updateMed,
  applyMed,
  deleteMed,
  restoreMed,
  permanentlyDeleteMed,
  addTreatment,
  updateTreatment,
  deleteTreatment,
  updateApplication,
  deleteApplication,
  restoreApplication,
  permanentlyDeleteApplication,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'recent-applications' | 'history' | 'treatments'
  >('inventory');
  const [recentAppFilter, setRecentAppFilter] = useState({
    medicationId: '',
    birdId: '',
    daysBack: 30,
  });

  // Modais State
  const [showAddMed, setShowAddMed] = useState(false);
  const [showApplyMed, setShowApplyMed] = useState(false);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');

  // States de Edição
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isEditingTreatment, setIsEditingTreatment] = useState(false);

  // Edição de Aplicação
  const [isEditingApp, setIsEditingApp] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(''); // Novo: filtro por tipo
  const [currentList, setCurrentList] = useState<'active' | 'trash'>('active');

  // Form States
  const [newMed, setNewMed] = useState<Partial<Medication>>({});
  const [newApp, setNewApp] = useState<Partial<MedicationApplication>>({
    date: new Date().toISOString().split('T')[0],
  });
  const [newTreatment, setNewTreatment] = useState<Partial<ContinuousTreatment>>({
    status: 'Ativo',
    startDate: new Date().toISOString().split('T')[0],
    frequency: 'Diário',
    birdId: 'ALL', // Default para Coletivo se quiser, ou vazio
  });

  const isExpired = (date: string) => new Date(date) < new Date();
  const isExpiringSoon = (date: string) => {
    const exp = new Date(date);
    const diff = Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff < 30;
  };

  // --- LOGICA DE LISTAGEM ---
  const listToUse = currentList === 'active' ? state.medications : state.deletedMedications || [];
  const treatmentsList =
    currentList === 'active' ? state.treatments || [] : state.deletedTreatments || [];
  const historyListToUse =
    currentList === 'active' ? state.applications : state.deletedApplications || [];
  const catalogItems = state.medicationCatalog || [];
  const selectedCatalog = selectedCatalogId
    ? catalogItems.find((item) => item.id === selectedCatalogId)
    : undefined;

  const filteredMeds = listToUse.filter((m) => {
    const matchesSearch =
      (m.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.type ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || (m.type ?? '').toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });
  const expiredMeds = state.medications.filter((m) => isExpired(m.expiryDate ?? ''));

  // Obter tipos únicos de medicamentos
  const medicineTypes = Array.from(new Set(state.medications.map((m) => m.type).filter(Boolean)));

  const filteredHistory = historyListToUse
    .filter((app) => {
      const bird = state.birds.find((b) => b.id === app.birdId);
      const med = state.medications.find((m) => m.id === app.medicationId);
      const term = searchTerm.toLowerCase();
      return (
        (bird?.name ?? '').toLowerCase().includes(term) ||
        (med?.name ?? '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filtrar aplicações recentes (últimos N dias)
  const filterRecentApplications = () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - recentAppFilter.daysBack * 24 * 60 * 60 * 1000);

    return state.applications
      .filter((app) => {
        const appDate = new Date(app.date);
        if (appDate < startDate) return false;

        if (recentAppFilter.medicationId && app.medicationId !== recentAppFilter.medicationId)
          return false;
        if (recentAppFilter.birdId && app.birdId !== recentAppFilter.birdId) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const recentApplications = filterRecentApplications();

  // --- HANDLERS DE FORMULÁRIO (MEDICAMENTO) ---
  const handleSaveMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMed.name && newMed.expiryDate) {
      addMed({
        ...(newMed as Medication),
        id: Math.random().toString(36).substr(2, 9),
        stock: Number(newMed.stock) || 0,
      });
      setShowAddMed(false);
      setNewMed({});
      setSelectedCatalogId('');
    }
  };

  const handleUpdateMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMed) {
      updateMed(editingMed);
      setEditingMed(null);
    }
  };

  const handleSaveApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (newApp.birdId && newApp.medicationId && newApp.date) {
      if (isEditingApp && newApp.id && updateApplication) {
        updateApplication(newApp as MedicationApplication);
      } else {
        applyMed({
          ...(newApp as MedicationApplication),
          id: Math.random().toString(36).substr(2, 9),
        });
        // Só baixa estoque se for novo registro
        const med = state.medications.find((m) => m.id === newApp.medicationId);
        if (med && (med.stock ?? 0) > 0) {
          updateMed({ ...med, stock: (med.stock ?? 0) - 1 });
        }
      }

      setShowApplyMed(false);
      setNewApp({ date: new Date().toISOString().split('T')[0] });
      // Se estava editando, volta para histórico, senão vai para histórico para ver o novo
      setActiveTab('history');
    }
  };

  const handleOpenEditApp = (app: MedicationApplication) => {
    setNewApp({ ...app });
    setIsEditingApp(true);
    setShowApplyMed(true);
  };

  const handleOpenAddApp = () => {
    setNewApp({ date: new Date().toISOString().split('T')[0] });
    setIsEditingApp(false);
    setShowApplyMed(true);
  };

  // --- HANDLERS DE TRATAMENTO ---
  const handleOpenAddTreatment = () => {
    setIsEditingTreatment(false);
    setNewTreatment({
      status: 'Ativo',
      startDate: new Date().toISOString().split('T')[0],
      frequency: 'Diário',
      birdId: 'ALL',
    });
    setShowAddTreatment(true);
  };

  const handleOpenEditTreatment = (treatment: ContinuousTreatment) => {
    setIsEditingTreatment(true);
    setNewTreatment({ ...treatment });
    setShowAddTreatment(true);
  };

  const handleSaveTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTreatment.medicationId && newTreatment.startDate && newTreatment.dosage) {
      if (isEditingTreatment && newTreatment.id && updateTreatment) {
        updateTreatment(newTreatment as ContinuousTreatment);
      } else if (addTreatment) {
        addTreatment({
          ...(newTreatment as ContinuousTreatment),
          id: Math.random().toString(36).substr(2, 9),
          birdId: newTreatment.birdId || 'ALL',
        });
      }
      setShowAddTreatment(false);
      setNewTreatment({
        status: 'Ativo',
        startDate: new Date().toISOString().split('T')[0],
        frequency: 'Diário',
        birdId: 'ALL',
      });
    }
  };

  const handleOpenAddMed = () => {
    setNewMed({});
    setSelectedCatalogId('');
    setShowAddMed(true);
  };

  const handleCloseAddMed = () => {
    setShowAddMed(false);
    setSelectedCatalogId('');
  };

  const handleCatalogSelect = (value: string) => {
    setSelectedCatalogId(value);
    const item = catalogItems.find((entry) => entry.id === value);
    if (!item) return;
    setNewMed((prev) => ({
      ...prev,
      name: item.name || prev.name || '',
      type: (item.category || prev.type || '') as Medication['type'],
    }));
  };

  const handleQuickDose = (treatment: ContinuousTreatment) => {
    const today = new Date().toISOString().split('T')[0];

    if (treatment.birdId !== 'ALL') {
      applyMed({
        id: Math.random().toString(36).substr(2, 9),
        birdId: treatment.birdId,
        medicationId: treatment.medicationId,
        date: today,
        dosage: treatment.dosage,
        notes: 'Dose rápida via Tratamento Contínuo',
        treatmentId: treatment.id,
      });
    }

    // Baixar Estoque
    const med = state.medications.find((m) => m.id === treatment.medicationId);
    if (med && (med.stock ?? 0) > 0) {
      updateMed({ ...med, stock: (med.stock ?? 0) - 1 });
    }

    // Atualizar Tratamento (Última Dose)
    if (updateTreatment) {
      updateTreatment({
        ...treatment,
        lastApplicationDate: today,
      });
    }
  };

  // Funções de Lixeira (Genéricas)
  const handleDeleteClick = (id: string) => {
    if (deleteMed) deleteMed(id);
  };
  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restoreMed) restoreMed(id);
  };
  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeleteMed) permanentlyDeleteMed(id);
  };

  const handleDeleteTreatment = (id: string) => {
    if (deleteTreatment) deleteTreatment(id);
  };

  const handleDeleteApp = (id: string) => {
    if (deleteApplication) deleteApplication(id);
  };
  const handleRestoreApp = (id: string) => {
    if (restoreApplication) restoreApplication(id);
  };
  const handlePermanentDeleteApp = (id: string) => {
    if (permanentlyDeleteApplication) permanentlyDeleteApplication(id);
  };

  // Verifica plano para exibir restrições
  const isBasicPlan = state.settings.plan === 'Básico' && !isAdmin;

  const medWizardStepsBase: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'inventory', label: 'Estoque' },
    { id: 'recent-applications', label: 'Aplicações' },
    { id: 'treatments', label: 'Tratamentos' },
    { id: 'history', label: 'Histórico' },
  ];

  const medWizardSteps: WizardStep[] = medWizardStepsBase.map((step) => ({
    id: step.id,
    label: step.label,
    content: null,
  }));

  const activeMedStepIndex = Math.max(
    0,
    medWizardStepsBase.findIndex((step) => step.id === activeTab),
  );

  const pageContent = (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Saúde e Farmácia</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">
            Gestão de estoque de medicamentos e tratamentos.
          </p>
        </div>
      </header>

      {/* Carrossel de Dicas */}
      <Suspense fallback={<div />}>
        <TipCarousel category="meds" />
      </Suspense>

      {/* --- ABA DE ESTOQUE --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          {currentList === 'active' && expiredMeds.length > 0 && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-rose-700 font-bold text-sm">Medicamentos vencidos</p>
                  <p className="text-rose-600 text-xs">
                    Revise a validade ou desative para evitar uso indevido.
                  </p>
                </div>
                <span className="px-2 py-1 bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg uppercase">
                  {expiredMeds.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {expiredMeds.slice(0, 3).map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-3 bg-white/80 border border-rose-100 rounded-xl px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-rose-700 truncate">{med.name}</p>
                      <p className="text-[10px] text-rose-500">
                        Venceu em{' '}
                        {med.expiryDate
                          ? new Date(med.expiryDate).toLocaleDateString('pt-BR')
                          : 'data inválida'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMed(med)}
                        className="px-2 py-1 text-[10px] font-black uppercase rounded-lg border border-emerald-100 text-emerald-600 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                      >
                        Renovar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(med.id)}
                        className="px-2 py-1 text-[10px] font-black uppercase rounded-lg border border-rose-100 text-rose-500 hover:text-rose-700 hover:border-rose-200 transition-all"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                ))}
                {expiredMeds.length > 3 && (
                  <p className="text-[10px] text-rose-500 font-bold">
                    +{expiredMeds.length - 3} medicamentos vencidos
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-2 bg-white p-1 rounded-xl w-fit border border-slate-100">
              <button
                onClick={() => setCurrentList('active')}
                className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                  currentList === 'active' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'
                }`}
              >
                Itens Ativos
              </button>
              <button
                onClick={() => setCurrentList('trash')}
                className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${
                  currentList === 'trash' ? 'bg-rose-50 text-rose-500' : 'text-slate-400'
                }`}
              >
                <Trash2 size={10} /> Lixeira
              </button>
            </div>

            <div className="flex gap-2 flex-1 md:justify-end">
              <div className="relative flex-1 md:max-w-xs">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Buscar medicamento..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {currentList === 'active' && medicineTypes.length > 0 && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand text-xs font-bold text-slate-600 cursor-pointer"
                >
                  <option value="">Todos os tipos</option>
                  {medicineTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
              {currentList === 'active' && (
                <>
                  <button
                    onClick={handleOpenAddApp}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs shadow-sm flex items-center gap-2"
                  >
                    <History size={16} className="text-slate-400" />
                    <span className="hidden md:inline">Aplicar</span>
                  </button>
                  <button
                    onClick={handleOpenAddMed}
                    className="px-4 py-3 bg-brand hover:opacity-90 text-white rounded-xl shadow-lg transition-all font-bold text-xs flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span className="hidden md:inline">Novo</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {currentList === 'trash' && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
              <p className="text-rose-700 font-bold text-sm">Lixeira de Medicamentos</p>
              <p className="text-rose-600 text-xs">
                Itens excluídos. A exclusão permanente é irreversível.
              </p>
              <p className="text-rose-600 text-xs mt-1">
                Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos
                automaticamente.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMeds.map((med) => (
              <div
                key={med.id}
                className={`group bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col ${
                  currentList === 'trash' ? 'opacity-80' : ''
                }`}
              >
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-3 rounded-2xl ${
                        med.type?.toLowerCase().includes('vitamina') ||
                        med.type?.toLowerCase().includes('suplemento')
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <FlaskConical size={20} />
                    </div>
                    {isExpired(med.expiryDate ?? '') ? (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded-lg border border-red-200 flex items-center gap-1">
                        <AlertTriangle size={10} /> Vencido
                      </span>
                    ) : isExpiringSoon(med.expiryDate ?? '') ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded-lg border border-amber-200">
                        Vence Logo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-lg">
                        Em Dia
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-sm truncate">
                      {(med.name ?? 'Sem nome').toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {(med.type ?? 'Indefinido').toUpperCase()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`rounded-xl p-2 border ${
                        isExpired(med.expiryDate ?? '')
                          ? 'bg-red-50 border-red-100'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <p
                        className={`text-[8px] font-black uppercase mb-0.5 ${
                          isExpired(med.expiryDate ?? '') ? 'text-red-400' : 'text-slate-400'
                        }`}
                      >
                        Validade
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          isExpired(med.expiryDate ?? '') ? 'text-red-700' : 'text-slate-700'
                        }`}
                      >
                        {new Date(med.expiryDate ?? new Date()).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">
                        Estoque
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          (med.stock ?? 0) < 2 ? 'text-orange-500' : 'text-slate-700'
                        }`}
                      >
                        {med.stock ?? 0} unid.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
                    Lote: {med.batch ?? 'S/N'}
                  </span>
                  {currentList === 'active' ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingMed(med)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-brand hover:border-brand transition-all shadow-sm"
                      >
                        <Edit size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(med.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleRestoreClick(e, med.id)}
                        className="text-emerald-500 hover:text-emerald-700"
                        title="Restaurar"
                      >
                        <RefreshCcw size={16} />
                      </button>
                      <button
                        onClick={(e) => handlePermanentDelete(e, med.id)}
                        className="text-rose-500 hover:text-rose-700"
                        title="Apagar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {currentList === 'active' && (
              <button
                onClick={handleOpenAddMed}
                className="group h-full min-h-[180px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-brand hover:bg-brand/5 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-brand group-hover:scale-110 transition-all shadow-sm">
                  <Plus size={24} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-brand">
                  Cadastrar Item
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- ABA DE APLICAÇÕES RECENTES --- */}
      {activeTab === 'recent-applications' && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Cabeçalho */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Aplicações Recentes</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {recentApplications.length} aplicações (últimos {recentAppFilter.daysBack} dias)
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">
                  Período (dias)
                </label>
                <select
                  value={recentAppFilter.daysBack}
                  onChange={(e) =>
                    setRecentAppFilter({ ...recentAppFilter, daysBack: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-xs font-bold"
                >
                  <option value={7}>Últimos 7 dias</option>
                  <option value={14}>Últimos 14 dias</option>
                  <option value={30}>Últimos 30 dias</option>
                  <option value={60}>Últimos 60 dias</option>
                  <option value={90}>Últimos 90 dias</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">
                  Medicamento
                </label>
                <select
                  value={recentAppFilter.medicationId}
                  onChange={(e) =>
                    setRecentAppFilter({ ...recentAppFilter, medicationId: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-xs font-bold"
                >
                  <option value="">Todos os medicamentos</option>
                  {state.medications.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">
                  Pássaro
                </label>
                <select
                  value={recentAppFilter.birdId}
                  onChange={(e) =>
                    setRecentAppFilter({ ...recentAppFilter, birdId: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-xs font-bold"
                >
                  <option value="">Todos os pássaros</option>
                  {state.birds.map((bird) => (
                    <option key={bird.id} value={bird.id}>
                      {bird.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de Aplicações */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Pássaro</th>
                  <th className="px-6 py-4">Medicamento</th>
                  <th className="px-6 py-4">Dosagem</th>
                  <th className="px-6 py-4">Obs</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.length > 0 ? (
                  recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-300" />
                          <div>
                            <div className="text-xs font-bold text-slate-600">
                              {new Date(app.date).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(app.date).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-800">
                          {state.birds.find((b) => b.id === app.birdId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-medium">
                          {state.medications.find((m) => m.id === app.medicationId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black rounded-lg">
                          {app.dosage}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate"
                        title={app.notes}
                      >
                        {app.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditApp(app)}
                            className="p-2 text-slate-300 hover:text-brand hover:bg-slate-100 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteApp(app.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Deletar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="text-slate-400 text-sm">
                        Nenhuma aplicação nos últimos {recentAppFilter.daysBack} dias com os filtros
                        selecionados.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ABA DE TRATAMENTOS CONTÍNUOS --- */}
      {activeTab === 'treatments' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative">
          {/* Cabeçalho da Seção */}
          <div className="flex justify-between items-center bg-indigo-50 p-6 rounded-[24px] border border-indigo-100">
            <div>
              <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                <Repeat size={20} className="text-indigo-600" /> Tratamentos Recorrentes
              </h3>
              <p className="text-xs text-indigo-700 font-medium mt-1 max-w-xl">
                Automação de antibióticos e suplementos. Configure uma vez e deixe o sistema
                gerenciar as doses.
              </p>
            </div>
            <button
              onClick={isBasicPlan ? undefined : handleOpenAddTreatment}
              className={`px-6 py-3 font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                isBasicPlan
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              }`}
            >
              {isBasicPlan ? <Lock size={16} /> : <Plus size={16} />} Novo Tratamento
            </button>
          </div>

          {/* BLOQUEIO PARA PLANO BÁSICO - OVERLAY AMIGÁVEL */}
          {isBasicPlan && (
            <div className="absolute inset-0 top-[100px] z-10 flex items-start justify-center backdrop-blur-[2px] bg-white/50 pt-10">
              <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md text-center border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-500"></div>
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap size={40} fill="currentColor" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  Automação Inteligente
                </h3>
                <p className="text-slate-500 font-medium mt-4 leading-relaxed">
                  A gestão automática de tratamentos contínuos com alertas de dosagem é exclusiva do{' '}
                  <span className="font-bold text-amber-500">Plano Profissional</span>.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Evite esquecimentos e garanta a saúde do seu plantel.
                </p>

                {/* Botão Fake para demonstração, na prática redirecionaria para Settings */}
                <button className="w-full mt-8 py-4 bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.02] transition-all">
                  Liberar Recurso PRO
                </button>
              </div>
            </div>
          )}

          {/* Lista de Tratamentos (Fica visível no fundo se for Basic, ou interativa se PRO) */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
              isBasicPlan ? 'opacity-40 pointer-events-none filter blur-[1px]' : ''
            }`}
          >
            {/* Exemplo Estático para mostrar interface no modo Basic (se a lista estiver vazia) */}
            {isBasicPlan && treatmentsList.length === 0 && (
              <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col opacity-70">
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Syringe size={20} />
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-black text-slate-800 text-sm">Coccidex (Exemplo)</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        2 gotas • Diário
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100 flex items-center gap-1">
                    <PlayCircle size={10} /> Ativo
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                  <p className="text-[9px] font-bold text-indigo-500 flex items-center gap-1">
                    <Clock size={10} /> Uso Contínuo (5 dias)
                  </p>
                </div>
                <button className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase">
                  Registrar Dose
                </button>
              </div>
            )}

            {treatmentsList.length > 0
              ? treatmentsList.map((treatment) => {
                  const med = state.medications.find((m) => m.id === treatment.medicationId);
                  const bird =
                    treatment.birdId === 'ALL'
                      ? null
                      : state.birds.find((b) => b.id === treatment.birdId);

                  // Calcular Progresso
                  let progress = 0;
                  let daysPassed = 0;

                  // Se Concluído, forçar 100%
                  if (treatment.status === 'Concluído') {
                    progress = 100;
                  } else if (treatment.startDate) {
                    const start = new Date(treatment.startDate);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - start.getTime());
                    daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (treatment.endDate) {
                      const end = new Date(treatment.endDate);
                      const totalDays = Math.ceil(
                        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                      );
                      progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
                    }
                  }

                  const appliedToday =
                    treatment.lastApplicationDate === new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={treatment.id}
                      className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all"
                    >
                      {/* Novo Header: Organização Horizontal Segura */}
                      <div className="flex justify-between items-start gap-3 mb-4">
                        {/* Esquerda: Ícone e Texto (Flex 1 para ocupar espaço e truncar) */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <Syringe size={20} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h4
                              className="font-black text-slate-800 text-sm truncate leading-tight"
                              title={med?.name}
                            >
                              {med?.name || 'Medicamento Removido'}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate">
                              {treatment.dosage} • {treatment.frequency}
                            </p>
                          </div>
                        </div>

                        {/* Direita: Status (Flex Shrink 0 para nunca encolher) */}
                        <div className="flex-shrink-0">
                          {treatment.status === 'Ativo' ? (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100 flex items-center gap-1">
                              <PlayCircle size={10} /> Ativo
                            </span>
                          ) : treatment.status === 'Concluído' ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-lg border border-slate-200 flex items-center gap-1">
                              <Check size={10} /> Concluído
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-lg border border-amber-100 flex items-center gap-1">
                              <PauseCircle size={10} /> Pausado
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 mb-5">
                        {/* Alvo do Tratamento */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          {bird ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <CheckSquare size={12} />
                              </div>
                              <span className="truncate">{bird.name}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                <LayoutGrid size={12} />
                              </div>
                              <span>Tratamento Coletivo</span>
                            </>
                          )}
                        </div>

                        {/* Datas e Progresso */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            <span>
                              Início: {new Date(treatment.startDate).toLocaleDateString('pt-BR')}
                            </span>
                            {treatment.endDate && (
                              <span>
                                Fim: {new Date(treatment.endDate).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          {treatment.endDate ? (
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  treatment.status === 'Concluído'
                                    ? 'bg-emerald-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          ) : (
                            <p className="text-[9px] font-bold text-indigo-500 flex items-center gap-1">
                              <Clock size={10} /> Uso Contínuo ({daysPassed} dias)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => handleQuickDose(treatment)}
                          disabled={appliedToday || treatment.status !== 'Ativo'}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            appliedToday
                              ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100'
                              : treatment.status !== 'Ativo'
                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                          }`}
                        >
                          {appliedToday ? (
                            <>
                              <Check size={14} /> Dose OK
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Registrar Dose
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenEditTreatment(treatment)}
                          className="px-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteTreatment(treatment.id)}
                          className="px-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-rose-500 hover:border-rose-200 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              : // Se for Basic e vazio, mostra o "exemplo" acima. Se for Pro e vazio, mostra mensagem
                !isBasicPlan && (
                  <div className="col-span-full py-16 text-center text-slate-300">
                    <Repeat size={48} className="mx-auto mb-4 opacity-30" strokeWidth={1} />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">
                      Nenhum tratamento ativo
                    </p>
                  </div>
                )}
          </div>
        </div>
      )}

      {/* --- ABA DE HISTÓRICO --- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                <History size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Registro de Aplicações</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {filteredHistory.length} registros
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                <button
                  onClick={() => setCurrentList('active')}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                    currentList === 'active' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setCurrentList('trash')}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${
                    currentList === 'trash' ? 'bg-rose-50 text-rose-500' : 'text-slate-400'
                  }`}
                >
                  <Trash2 size={10} /> Lixeira
                </button>
              </div>

              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Filtrar histórico..."
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-xs font-bold w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {currentList === 'trash' && (
            <div className="bg-rose-50 p-3 text-center border-b border-rose-100">
              <p className="text-xs text-rose-600 font-bold">Modo Lixeira: Registros excluídos</p>
              <p className="text-[10px] text-rose-500 mt-1">
                Itens ficam disponiveis por ate 30 dias antes de serem removidos automaticamente.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Pássaro</th>
                  <th className="px-6 py-4">Medicamento</th>
                  <th className="px-6 py-4">Dosagem</th>
                  <th className="px-6 py-4">Obs</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((app) => (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/50 transition-colors group ${
                        currentList === 'trash' ? 'opacity-70' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-300" />
                          <span className="text-xs font-bold text-slate-600">
                            {new Date(app.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-800">
                          {state.birds.find((b) => b.id === app.birdId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-medium">
                          {state.medications.find((m) => m.id === app.medicationId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black rounded-lg">
                          {app.dosage}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                        {app.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {currentList === 'active' ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditApp(app)}
                              className="p-2 text-slate-300 hover:text-brand hover:bg-slate-100 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteApp(app.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleRestoreApp(app.id)}
                              className="text-emerald-500 hover:text-emerald-700 p-1"
                              title="Restaurar"
                            >
                              <RefreshCcw size={14} />
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteApp(app.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Apagar para sempre"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-300">
                      <div className="flex flex-col items-center gap-2">
                        <History size={32} strokeWidth={1} className="opacity-50" />
                        <p className="text-sm font-bold opacity-50 uppercase tracking-widest">
                          Nenhum registro encontrado
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ... Modal Adicionar Medicamento ... */}
      {showAddMed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">Novo Medicamento</h3>
              <button onClick={handleCloseAddMed} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveMed} className="p-8 space-y-5">
              {catalogItems.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Catalogo base (opcional)
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                    value={selectedCatalogId}
                    onChange={(e) => handleCatalogSelect(e.target.value)}
                  >
                    <option value="">Selecionar do catalogo...</option>
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {selectedCatalog && (
                    <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                        Detalhes do catalogo
                      </p>
                      {selectedCatalog.category && (
                        <p className="text-xs text-slate-600">
                          <span className="font-bold">Categoria:</span> {selectedCatalog.category}
                        </p>
                      )}
                      {selectedCatalog.manufacturer && (
                        <p className="text-xs text-slate-600">
                          <span className="font-bold">Fabricante:</span>{' '}
                          {selectedCatalog.manufacturer}
                        </p>
                      )}
                      {selectedCatalog.indication && (
                        <p className="text-xs text-slate-600">
                          <span className="font-bold">Indicacao:</span> {selectedCatalog.indication}
                        </p>
                      )}
                      {selectedCatalog.application && (
                        <p className="text-xs text-slate-600">
                          <span className="font-bold">Aplicacao:</span>{' '}
                          {selectedCatalog.application}
                        </p>
                      )}
                      {selectedCatalog.prescription && (
                        <p className="text-xs text-slate-600">
                          <span className="font-bold">Receita:</span> {selectedCatalog.prescription}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 font-medium">
                        Bula: {selectedCatalog.source || 'Consulte o catalogo do fabricante.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span>Nome Comercial</span>
                  <div className="group relative cursor-help">
                    <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                      Nome comercial do medicamento
                    </div>
                  </div>
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={newMed.name || ''}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span>Tipo / Categoria</span>
                  <div className="group relative cursor-help">
                    <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                      Suplemento, Antibiótico, Vitamina, etc.
                    </div>
                  </div>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Suplemento, Antibiótico..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={newMed.type || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMed({ ...newMed, type: e.target.value as Medication['type'] })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>Lote</span>
                    <div className="group relative cursor-help">
                      <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                        Número do lote da embalagem
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newMed.batch || ''}
                    onChange={(e) => setNewMed({ ...newMed, batch: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>Estoque Inicial</span>
                    <div className="group relative cursor-help">
                      <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                        Quantidade inicial em estoque
                      </div>
                    </div>
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newMed.stock ?? ''}
                    onChange={(e) => setNewMed({ ...newMed, stock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span>Validade</span>
                  <div className="group relative cursor-help">
                    <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                      Data de vencimento do produto
                    </div>
                  </div>
                </label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                  value={newMed.expiryDate || ''}
                  onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-[#0F172A] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-4"
              >
                Salvar Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO MEDICAMENTO */}
      {editingMed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800">Editar Medicamento</h3>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  {editingMed.name}
                </p>
              </div>
              <button
                onClick={() => setEditingMed(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateMed} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Nome Comercial
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={editingMed.name || ''}
                  onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Tipo
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                    value={editingMed.type ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingMed({ ...editingMed, type: e.target.value as Medication['type'] })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Lote
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                    value={editingMed.batch || ''}
                    onChange={(e) => setEditingMed({ ...editingMed, batch: e.target.value })}
                  />
                </div>
              </div>

              {/* Controle de Estoque com Botões */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Ajuste Rápido de Estoque
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingMed((prev) =>
                        prev ? { ...prev, stock: Math.max(0, (prev.stock ?? 0) - 1) } : null,
                      )
                    }
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                  >
                    <Minus size={20} />
                  </button>

                  <div className="text-center w-20">
                    <input
                      type="number"
                      className="w-full text-center bg-transparent font-black text-2xl text-slate-800 outline-none"
                      value={editingMed.stock}
                      onChange={(e) =>
                        setEditingMed({ ...editingMed, stock: Number(e.target.value) })
                      }
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Unidades</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingMed((prev) =>
                        prev ? { ...prev, stock: (prev.stock ?? 0) + 1 } : null,
                      )
                    }
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Validade
                </label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={editingMed.expiryDate || ''}
                  onChange={(e) => setEditingMed({ ...editingMed, expiryDate: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand/20 mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <Save size={18} /> Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Aplicação */}
      {showApplyMed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">
                {isEditingApp ? 'Editar Aplicação' : 'Registrar Aplicação'}
              </h3>
              <button
                onClick={() => setShowApplyMed(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveApp} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Pássaro
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                  value={newApp.birdId || ''}
                  onChange={(e) => setNewApp({ ...newApp, birdId: e.target.value })}
                  disabled={isEditingApp} // Bloqueia troca de pássaro na edição para não quebrar rastreio fácil
                >
                  <option value="">Selecione o pássaro...</option>
                  {state.birds
                    .filter((b) => b.status === 'Ativo')
                    .concat(
                      isEditingApp
                        ? state.birds.find((b) => b.id === newApp.birdId)
                          ? []
                          : [{ ...state.birds[0], id: newApp.birdId, name: 'Desconhecido' } as Bird]
                        : [],
                    )
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.ringNumber})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Medicamento
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                  value={newApp.medicationId || ''}
                  onChange={(e) => setNewApp({ ...newApp, medicationId: e.target.value })}
                  disabled={isEditingApp} // Bloqueia troca de medicamento para não complicar lógica de estoque
                >
                  <option value="">Selecione o item...</option>
                  {state.medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {(m.name ?? 'Sem nome').toUpperCase()}{' '}
                      {isExpired(m.expiryDate ?? '') ? '(VENCIDO)' : `(Estoque: ${m.stock ?? 0})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Data
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newApp.date}
                    onChange={(e) => setNewApp({ ...newApp, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Dosagem
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 5 gotas"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newApp.dosage || ''}
                    onChange={(e) => setNewApp({ ...newApp, dosage: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Observações
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-20 resize-none font-medium text-slate-700"
                  value={newApp.notes || ''}
                  onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand/20 mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <CheckCircle2 size={18} />{' '}
                {isEditingApp ? 'Salvar Alterações' : 'Confirmar Aplicação'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Tratamento (Apenas PRO) */}
      {showAddTreatment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">
                {isEditingTreatment ? 'Editar Tratamento' : 'Novo Tratamento'}
              </h3>
              <button
                onClick={() => setShowAddTreatment(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveTreatment} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Paciente / Alvo
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                  value={newTreatment.birdId || 'ALL'}
                  onChange={(e) => setNewTreatment({ ...newTreatment, birdId: e.target.value })}
                >
                  <option value="ALL">Coletivo (Todo o Plantel)</option>
                  {state.birds
                    .filter((b) => b.status === 'Ativo')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.ringNumber})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Medicamento
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                  value={newTreatment.medicationId || ''}
                  onChange={(e) =>
                    setNewTreatment({ ...newTreatment, medicationId: e.target.value })
                  }
                >
                  <option value="">Selecione o item...</option>
                  {state.medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Estoque: {m.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Data Início
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newTreatment.startDate}
                    onChange={(e) =>
                      setNewTreatment({ ...newTreatment, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Data Fim (Opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newTreatment.endDate || ''}
                    onChange={(e) => setNewTreatment({ ...newTreatment, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Frequência
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newTreatment.frequency}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setNewTreatment({
                        ...newTreatment,
                        frequency: e.target.value as ContinuousTreatment['frequency'],
                      })
                    }
                  >
                    <option value="Diário">Diário</option>
                    <option value="12h em 12h">12h em 12h</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Dosagem Padrão
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 2 gotas"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                    value={newTreatment.dosage || ''}
                    onChange={(e) => setNewTreatment({ ...newTreatment, dosage: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTreatment({ ...newTreatment, status: 'Ativo' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      newTreatment.status === 'Ativo'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTreatment({ ...newTreatment, status: 'Pausado' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      newTreatment.status === 'Pausado'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Pausado
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTreatment({ ...newTreatment, status: 'Concluído' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      newTreatment.status === 'Concluído'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Concluído
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200 mt-2 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Repeat size={18} />{' '}
                {isEditingTreatment ? 'Salvar Alterações' : 'Iniciar Tratamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <WizardLayout
      title="Medicamentos"
      steps={medWizardSteps.map((step) => ({ ...step, content: pageContent }))}
      activeStep={activeMedStepIndex}
      showNavigation={false}
      onStepChange={(index) => {
        const next = medWizardStepsBase[index]?.id || 'inventory';
        setActiveTab(next);
        setCurrentList('active');
      }}
    />
  );
};

export default MedsManager;
