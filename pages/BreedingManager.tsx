/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { AppState, Pair, Clutch, Bird } from '../types';
import {
  Plus,
  Heart,
  Trash2,
  Calendar,
  ClipboardList,
  Egg,
  Baby,
  Bell,
  CheckCircle2,
  Timer,
  Info,
  X,
  RefreshCcw,
  Archive,
  Edit2,
  Save,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import { SPECIES_INCUBATION_DAYS, getDefaultBirdImage } from '../constants';
import WizardShell from '../components/WizardShell';

interface BreedingManagerProps {
  state: AppState;
  addPair: (pair: Pair) => void;
  updatePair: (pair: Pair) => void;
  addBird: (bird: Bird) => void;
  addClutch: (clutch: Clutch) => void;
  updateClutch: (clutch: Clutch) => void;
  deletePair?: (id: string) => void;
  restorePair?: (id: string) => void;
  permanentlyDeletePair?: (id: string) => void;
  archivePair?: (id: string) => void;
  unarchivePair?: (id: string) => void;
  archiveFromTrashToPairs?: (id: string) => void;
}

interface PendingHatchling {
  name: string;
  ringNumber: string;
  sex: 'Desconhecido' | 'Macho' | 'Fêmea';
}

const BreedingManager: React.FC<BreedingManagerProps> = ({
  state,
  addPair,
  updatePair,
  addBird,
  addClutch,
  updateClutch,
  deletePair,
  restorePair,
  permanentlyDeletePair,
  archivePair,
  unarchivePair,
  archiveFromTrashToPairs,
}) => {
  const [showPairModal, setShowPairModal] = useState(false);
  const [showClutchModal, setShowClutchModal] = useState(false);
  const [showHatchlingModal, setShowHatchlingModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const [currentList, setCurrentList] = useState<'active' | 'archived' | 'trash'>('active');

  const [newPair, setNewPair] = useState<Partial<Pair>>({ status: 'Ativo' });
  const [newClutch, setNewClutch] = useState<Partial<Clutch>>({
    eggCount: 0,
    fertileCount: 0,
    hatchedCount: 0,
  });
  const [isEditingClutch, setIsEditingClutch] = useState(false);

  // State para reativação de casais
  const [reactivateData, setReactivateData] = useState<{
    startDate: string;
    clearHistory: boolean;
  }>({
    startDate: new Date().toISOString().split('T')[0],
    clearHistory: true,
  });

  // State para registro de filhotes
  const [hatchlingsToRegister, setHatchlingsToRegister] = useState<PendingHatchling[]>([]);
  const [hatchlingParentPairId, setHatchlingParentPairId] = useState<string | null>(null);
  const [hatchlingBirthDate, setHatchlingBirthDate] = useState<string>('');

  // Refs para gerenciar foco nos modais
  const clutchModalRef = useRef<HTMLDivElement | null>(null);
  const hatchlingModalRef = useRef<HTMLDivElement | null>(null);
  const reactivateModalRef = useRef<HTMLDivElement | null>(null);
  const clutchCloseRef = useRef<HTMLButtonElement | null>(null);
  const hatchlingCloseRef = useRef<HTMLButtonElement | null>(null);
  const reactivateCloseRef = useRef<HTMLButtonElement | null>(null);

  const focusFirstInteractive = (container: HTMLDivElement | null) => {
    if (!container) return;
    const selectors = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
    if (nodes.length > 0) {
      nodes[0].focus();
    } else {
      container.focus();
    }
  };

  const trapFocusFor = (container: HTMLDivElement | null, onClose: (() => void) | null) => {
    if (!container) return () => {};
    const selectors = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const active = document.activeElement as HTMLElement;
        if (e.shiftKey) {
          if (active === first || active === container) {
            e.preventDefault();
            (last || container).focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            (first || container).focus();
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  };

  const makeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Efeitos para foco automático e focus-trap nos modais
  useEffect(() => {
    if (showClutchModal) {
      if (clutchCloseRef.current) {
        clutchCloseRef.current.focus();
      } else {
        focusFirstInteractive(clutchModalRef.current);
      }
      const cleanup = trapFocusFor(clutchModalRef.current, () => setShowClutchModal(false));
      return cleanup;
    }
  }, [showClutchModal]);

  useEffect(() => {
    if (showHatchlingModal) {
      if (hatchlingCloseRef.current) {
        hatchlingCloseRef.current.focus();
      } else {
        focusFirstInteractive(hatchlingModalRef.current);
      }
      const cleanup = trapFocusFor(hatchlingModalRef.current, () => setShowHatchlingModal(false));
      return cleanup;
    }
  }, [showHatchlingModal]);

  useEffect(() => {
    if (showReactivateModal) {
      if (reactivateCloseRef.current) {
        reactivateCloseRef.current.focus();
      } else {
        focusFirstInteractive(reactivateModalRef.current);
      }
      const cleanup = trapFocusFor(reactivateModalRef.current, () => setShowReactivateModal(false));
      return cleanup;
    }
  }, [showReactivateModal]);

  // Listas base de aves ativas
  const males = useMemo(
    () => state.birds.filter((b) => b.sex === 'Macho' && b.status === 'Ativo'),
    [state.birds],
  );
  const females = useMemo(
    () => state.birds.filter((b) => b.sex === 'Fêmea' && b.status === 'Ativo'),
    [state.birds],
  );

  // Lógica de Filtragem Cruzada (Mesma Espécie)
  const selectedMaleBird = useMemo(
    () => males.find((m) => m.id === newPair.maleId),
    [males, newPair.maleId],
  );
  const selectedFemaleBird = useMemo(
    () => females.find((f) => f.id === newPair.femaleId),
    [females, newPair.femaleId],
  );

  const availableMales = useMemo(() => {
    if (selectedFemaleBird) {
      return males.filter((m) => m.species === selectedFemaleBird.species);
    }
    return males;
  }, [males, selectedFemaleBird]);

  const availableFemales = useMemo(() => {
    if (selectedMaleBird) {
      return females.filter((f) => f.species === selectedMaleBird.species);
    }
    return females;
  }, [females, selectedMaleBird]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSavePair = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    if (!newPair.maleId || !newPair.femaleId || !newPair.name) {
      setNotification({
        message: 'Erro: Preencha todos os campos obrigatórios (macho, fêmea e nome do casal).',
        type: 'error',
      });
      return;
    }

    // Validação de Espécie Cruzada
    const m = males.find((b) => b.id === newPair.maleId);
    const f = females.find((b) => b.id === newPair.femaleId);

    if (m && f && m.species !== f.species) {
      setNotification({
        message: `Erro: Não é permitido acasalar espécies diferentes (${m.species} + ${f.species}).`,
        type: 'error',
      });
      return;
    }

    // Criar o casal com todos os campos obrigatórios
    const pairData: Pair = {
      id: makeId(),
      userId: (state as any).userId || (state as any).settings?.userId || '',
      maleId: newPair.maleId,
      femaleId: newPair.femaleId,
      name: newPair.name,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Ativo',
    };

    await addPair(pairData);
    setShowPairModal(false);
    setNewPair({ status: 'Ativo' });
    setNotification({ message: 'Novo casal registrado com sucesso!', type: 'success' });
  };

  const handleSaveClutch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPairId) {
      const hatchedCount = newClutch.hatchedCount || 0;

      if (isEditingClutch && newClutch.id) {
        // Modo Edição
        await updateClutch(newClutch as Clutch);
        setNotification({ message: 'Dados da ninhada atualizados!', type: 'success' });
      } else {
        // Modo Criação
        const clutchData: Clutch = {
          ...(newClutch as Clutch),
          id: makeId(),
          pairId: selectedPairId,
        };
        await addClutch(clutchData);

        setNotification({ message: 'Postura registrada com sucesso.', type: 'info' });
      }

      setShowClutchModal(false);

      // Se houve nascimentos, prepara o modal de cadastro de filhotes
      if (hatchedCount > 0) {
        prepareHatchlingRegistration(
          selectedPairId,
          hatchedCount,
          newClutch.layDate || new Date().toISOString(),
        );
      } else {
        setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0 });
        setIsEditingClutch(false);
      }
    }
  };

  const prepareHatchlingRegistration = (pairId: string, count: number, layDate: string) => {
    const incubationDays = getIncubationDays(pairId);
    const estimatedBirthDate = new Date(
      new Date(layDate).getTime() + incubationDays * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split('T')[0];

    setHatchlingParentPairId(pairId);
    setHatchlingBirthDate(estimatedBirthDate);

    // Cria array inicial de filhotes
    const initialHatchlings: PendingHatchling[] = Array(count)
      .fill(null)
      .map((_, i) => ({
        name: `Filhote ${i + 1}`,
        ringNumber: '',
        sex: 'Desconhecido',
      }));

    setHatchlingsToRegister(initialHatchlings);
    setShowHatchlingModal(true);
  };

  const handleRegisterHatchlings = (pairId: string, count: number, layDate: string) => {
    if (count <= 0) return;
    prepareHatchlingRegistration(pairId, count, layDate);
  };

  const confirmHatchlingRegistration = async () => {
    // Validações
    if (!hatchlingParentPairId) {
      setNotification({ message: 'Erro: Casal não identificado', type: 'error' });
      return;
    }

    if (!hatchlingBirthDate) {
      setNotification({ message: 'Por favor, insira a data do nascimento', type: 'error' });
      return;
    }

    if (hatchlingsToRegister.length === 0) {
      setNotification({ message: 'Nenhum filhote para registrar', type: 'error' });
      return;
    }

    const pair = state.pairs.find((p) => p.id === hatchlingParentPairId);
    if (!pair) {
      setNotification({ message: 'Erro: Casal não encontrado', type: 'error' });
      return;
    }

    // Busca dados da mãe para herdar espécie
    const mother = state.birds.find((b) => b.id === pair.femaleId);
    const species = mother?.species || 'Espécie Indefinida';

    try {
      // Aguarda o salvamento de todos os filhotes
      await Promise.all(
        hatchlingsToRegister.map((hatchling) => {
          const newBird: Bird = {
            id: makeId(),
            name: hatchling.name,
            ringNumber: hatchling.ringNumber || 'S/A', // Sem Anilha
            species: species,
            sex: hatchling.sex,
            birthDate: hatchlingBirthDate,
            status: 'Ativo',
            breederId: (state as any).userId || (state as any).settings?.userId || makeId(),
            fatherId: pair.maleId,
            motherId: pair.femaleId,
            classification: 'Exemplar',
            songTrainingStatus: 'Não Iniciado',
            colorMutation: 'Clássico (Filhote)', // Padrão
            location: pair.name, // Herda localização do casal
            photoUrl: getDefaultBirdImage(species, hatchling.sex, hatchlingBirthDate),
            createdAt: new Date().toISOString(),
            isRepeater: false,
            songType: '',
          };
          return addBird(newBird);
        }),
      );

      await updatePair({ ...pair, lastHatchDate: hatchlingBirthDate });

      setNotification({
        message: `${hatchlingsToRegister.length} filhotes foram adicionados ao plantel!`,
        type: 'success',
      });

      // Reset e fecha
      setShowHatchlingModal(false);
      setHatchlingsToRegister([]);
      setHatchlingParentPairId('');
      setHatchlingBirthDate('');
      setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0 });
      setIsEditingClutch(false);
    } catch (error) {
      console.error('Erro ao registrar filhotes:', error);
      setNotification({ message: 'Erro ao registrar filhotes', type: 'error' });
    }
  };

  const openClutchModal = (pairId: string, clutchToEdit?: Clutch) => {
    setSelectedPairId(pairId);
    if (clutchToEdit) {
      setNewClutch({ ...clutchToEdit });
      setIsEditingClutch(true);
    } else {
      setNewClutch({
        eggCount: 0,
        fertileCount: 0,
        hatchedCount: 0,
        layDate: new Date().toISOString().split('T')[0],
      });
      setIsEditingClutch(false);
    }
    setShowClutchModal(true);
  };

  // Funções de Lixeira
  const handleDeleteClick = (id: string) => {
    if (deletePair) deletePair(id);
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restorePair) restorePair(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeletePair) permanentlyDeletePair(id);
  };

  // Funções de Arquivo
  const handleArchiveClick = (id: string) => {
    if (archivePair) archivePair(id);
  };

  const handleUnarchiveClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    handleReactivate(id);
  };

  const handleArchiveFromTrashClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (archiveFromTrashToPairs) archiveFromTrashToPairs(id);
  };

  // Reativar casal com atualização de datas
  const handleReactivate = (pairId: string) => {
    const pair = (state.archivedPairs || []).find((p) => p.id === pairId);
    if (!pair) return;

    setSelectedPairId(pairId);
    setReactivateData({
      startDate: reactivateData.startDate,
      clearHistory: true,
    });
    setShowReactivateModal(true);
  };

  const confirmReactivate = async () => {
    if (!selectedPairId) return;

    const pair = (state.archivedPairs || []).find((p) => p.id === selectedPairId);
    if (!pair) return;

    const updatedPair: Pair = {
      ...pair,
      startDate: reactivateData.startDate,
      lastHatchDate: reactivateData.clearHistory ? undefined : pair.lastHatchDate,
    };

    if (unarchivePair) {
      await unarchivePair(selectedPairId);
      // Atualizar dados do casal com novas datas
      await updatePair(updatedPair);
    }

    setShowReactivateModal(false);
    setNotification({
      message: `${pair.name} reativado com sucesso!`,
      type: 'success',
    });
  };

  const getBirdName = (id?: string) => state.birds.find((b) => b.id === id)?.name || 'N/A';
  const getPairName = (id: string) => state.pairs.find((p) => p.id === id)?.name || 'N/A';

  // Helper para obter dias de incubação baseado no casal
  const getIncubationDays = (pairId: string) => {
    const pair = state.pairs.find((p) => p.id === pairId);
    if (!pair) return 14;
    const female = state.birds.find((b) => b.id === pair.femaleId);
    return female ? SPECIES_INCUBATION_DAYS[female.species] || 14 : 14;
  };

  // Helper para nome da espécie
  const getPairSpecies = (pairId?: string) => {
    if (!pairId) return '';
    const pair = state.pairs.find((p) => p.id === pairId);
    if (!pair) return '';
    const female = state.birds.find((b) => b.id === pair.femaleId);
    return female?.species || '';
  };

  // Listagem condicional
  const visiblePairs =
    currentList === 'active'
      ? state.pairs
      : currentList === 'archived'
      ? state.archivedPairs || []
      : state.deletedPairs || [];

  // Calcular eclosões futuras com base na espécie
  const incubatorClutches = state.clutches
    .filter((c) => c.hatchedCount === 0 && c.fertileCount > 0)
    .map((c) => {
      const layDate = new Date(c.layDate);
      const incubationDays = getIncubationDays(c.pairId);
      const hatchDate = new Date(layDate);
      hatchDate.setDate(layDate.getDate() + incubationDays);
      return { ...c, hatchDate, incubationDays };
    })
    .sort((a, b) => a.hatchDate.getTime() - b.hatchDate.getTime());

  return (
    <WizardShell title="Acasalamentos" description="Gestão de casais, posturas e filhotes.">
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed top-8 right-8 z-[200] p-6 rounded-[24px] shadow-2xl flex items-center gap-4 border animate-in slide-in-from-right-full duration-300 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-800'
                : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}
          >
            <div
              className={`p-2 rounded-full ${
                notification.type === 'success'
                  ? 'bg-emerald-100'
                  : notification.type === 'error'
                  ? 'bg-rose-100'
                  : 'bg-blue-100'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 size={24} />
              ) : notification.type === 'error' ? (
                <AlertTriangle size={24} />
              ) : (
                <Bell size={24} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600 leading-none mb-1">Notificação</p>
              <p className="text-elderly-label text-slate-600 opacity-90">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 p-1 hover:bg-black/5 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Reprodução</h2>
            <p className="text-slate-400 font-medium text-sm mt-1">
              Gestão de casais, incubação e nascimentos.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mr-2">
              <button
                onClick={() => setCurrentList('active')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  currentList === 'active'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setCurrentList('archived')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  currentList === 'archived'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Archive size={12} /> Histórico
              </button>
              <button
                onClick={() => setCurrentList('trash')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  currentList === 'trash'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Trash2 size={12} /> Lixeira
              </button>
            </div>
            {currentList === 'active' && (
              <button
                onClick={() => {
                  setShowPairModal(true);
                  setNewPair({ status: 'Ativo' });
                }}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-md transition-all font-semibold text-sm"
              >
                <Plus size={18} />
                Novo Casal
              </button>
            )}
          </div>
        </header>

        {currentList === 'archived' && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-4">
            <p className="text-amber-700 font-bold text-sm">Histórico de Casais</p>
            <p className="text-amber-600 text-elderly-label">
              Casais que já produziram filhotes. Reative para voltar aos ativos ou envie para
              lixeira.
            </p>
          </div>
        )}

        {currentList === 'trash' && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl mb-4">
            <p className="text-rose-700 font-bold text-sm">Lixeira de Casais</p>
            <p className="text-rose-600 text-elderly-label">
              Restaure casais desfeitos acidentalmente, mova para histórico, ou remova
              definitivamente.
            </p>
            <p className="text-rose-600 text-elderly-label mt-1">
              Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos
              automaticamente.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lado Esquerdo: Casais */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                <Heart
                  size={20}
                  className={
                    currentList === 'archived'
                      ? 'text-amber-500'
                      : currentList === 'trash'
                      ? 'text-rose-500'
                      : 'text-[#0F172A]'
                  }
                />
                {currentList === 'active'
                  ? 'Casais Ativos'
                  : currentList === 'archived'
                  ? 'Histórico de Casais'
                  : 'Casais Excluídos'}
              </h3>
              <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg">
                {visiblePairs.length} Registros
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visiblePairs.length > 0 ? (
                visiblePairs.map((pair) => {
                  return (
                    <div
                      key={pair.id}
                      className={`group bg-white rounded-[28px] border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
                        currentList === 'trash' ? 'opacity-70' : ''
                      } ${
                        pair.lastHatchDate
                          ? 'border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/30'
                          : 'border-slate-100'
                      }`}
                    >
                      {pair.lastHatchDate && (
                        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
                      )}
                      
                      {/* Cabeçalho: Nome do Casal + Badge */}
                      <div className="px-6 pt-5 pb-3 border-b border-slate-100/50">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 text-lg leading-tight flex-1">
                            Casal {pair.name}
                          </h3>
                          {pair.lastHatchDate && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 whitespace-nowrap">
                              ✓ Reproduzindo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(pair.startDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {/* Pais: Macho | Fêmea */}
                      <div className="px-6 py-4 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            ♂ Macho
                          </label>
                          <div className="px-3 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg text-sm font-bold text-blue-800 truncate">
                            {getBirdName(pair.maleId)}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            ♀ Fêmea
                          </label>
                          <div className="px-3 py-2.5 bg-pink-50 border-2 border-pink-200 rounded-lg text-sm font-bold text-pink-800 truncate">
                            {getBirdName(pair.femaleId)}
                          </div>
                        </div>
                      </div>

                      {/* Espécie */}
                      <div className="px-6 py-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Espécie
                        </label>
                        <p className="text-sm font-semibold text-slate-700">
                          {getPairSpecies(pair.id) || '—'}
                        </p>
                      </div>

                      {/* Última Ninhada */}
                      {pair.lastHatchDate && (
                        <div className="px-6 py-2 border-t border-emerald-100/50 bg-emerald-50/20">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Última Ninhada
                          </label>
                          <p className="text-sm font-semibold text-emerald-700">
                            {new Date(pair.lastHatchDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}

                      {/* Ações */}
                      {currentList === 'active' && (
                        <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/30">
                          {pair.lastHatchDate && (
                            <button
                              onClick={() => handleArchiveClick(pair.id)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Arquivar"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(pair.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Mover para Lixeira"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}

                      {currentList === 'active' ? (
                        <div className="p-6 pt-0">
                          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                            <h4 className="text-elderly-label text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <ClipboardList size={14} /> Histórico Recente
                            </h4>
                            <div className="space-y-2">
                              {state.clutches
                                .filter((c) => c.pairId === pair.id)
                                .slice(0, 3)
                                .map((clutch) => (
                                  <div
                                    key={clutch.id}
                                    className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm group/clutch relative"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar size={14} className="text-slate-300" />
                                      <span className="text-xs font-bold text-slate-700">
                                        {new Date(clutch.layDate).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-elderly-label text-brand uppercase font-bold">
                                        {clutch.eggCount} OVOS
                                      </span>
                                      {clutch.hatchedCount > 0 ? (
                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-elderly-label uppercase tracking-widest font-bold flex items-center gap-1 whitespace-nowrap">
                                          <Baby size={10} /> {clutch.hatchedCount} NASCIDOS
                                        </span>
                                      ) : (
                                        <span className="text-elderly-label text-amber-500 uppercase flex items-center gap-1 whitespace-nowrap">
                                          <Timer size={10} /> INCUBANDO
                                        </span>
                                      )}
                                    </div>
                                    {/* Botão de Edição da Ninhada */}
                                    <button
                                      onClick={() => openClutchModal(pair.id, clutch)}
                                      className="absolute right-2 top-2 p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400 hover:text-brand hover:border-brand opacity-0 group-hover/clutch:opacity-100 transition-all"
                                      title="Editar Ninhada"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              <button
                                onClick={() => openClutchModal(pair.id)}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2"
                              >
                                <Plus size={14} /> Registrar Ninhada
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : currentList === 'archived' ? (
                        <div className="p-4 bg-amber-50 border-t border-amber-100 flex gap-2">
                          <button
                            onClick={(e) => handleUnarchiveClick(e, pair.id)}
                            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-600"
                          >
                            <RefreshCcw size={14} /> Reativar
                          </button>
                          <button
                            onClick={() => handleDeleteClick(pair.id)}
                            className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-600"
                          >
                            <Trash2 size={14} /> Lixeira
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-rose-50 border-t border-rose-100 flex gap-2">
                          <button
                            onClick={(e) => handleRestoreClick(e, pair.id)}
                            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-600"
                          >
                            <RefreshCcw size={14} /> Restaurar
                          </button>
                          <button
                            onClick={(e) => handleArchiveFromTrashClick(e, pair.id)}
                            className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-amber-600"
                          >
                            <Archive size={14} /> Histórico
                          </button>
                          <button
                            onClick={(e) => handlePermanentDelete(e, pair.id)}
                            className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-600"
                          >
                            <X size={14} /> Apagar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
                  <Heart size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {currentList === 'active'
                      ? 'Nenhum casal registrado'
                      : currentList === 'archived'
                      ? 'Nenhum casal no histórico'
                      : 'Nenhum casal na lixeira'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Alertas e Previsões (Visível apenas na lista ativa) */}
          {currentList === 'active' && (
            <div className="space-y-6">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                <Bell size={20} className="text-amber-500" />
                Previsão de Eclosão
              </h3>

              <div className="space-y-4">
                {incubatorClutches.length > 0 ? (
                  incubatorClutches.map((c) => {
                    const today = new Date();
                    const diff = Math.ceil(
                      (c.hatchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    const isLate = diff < 0;
                    const isToday = diff === 0;
                    const pair = state.pairs.find((p) => p.id === c.pairId);
                    const maleName = pair ? getBirdName(pair.maleId) : 'N/A';
                    const femaleName = pair ? getBirdName(pair.femaleId) : 'N/A';

                    return (
                      <div
                        key={c.id}
                        className={`p-6 rounded-[32px] border shadow-sm transition-all ${
                          isLate
                            ? 'bg-rose-50 border-rose-100'
                            : isToday
                            ? 'bg-emerald-50 border-emerald-100 animate-pulse'
                            : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div
                            className={`p-3 rounded-2xl ${
                              isLate
                                ? 'bg-rose-100 text-rose-600'
                                : isToday
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Egg size={24} />
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                isLate ? 'text-rose-500' : 'text-slate-400'
                              }`}
                            >
                              {isLate
                                ? 'Eclosão Atrasada'
                                : isToday
                                ? 'Previsto para HOJE'
                                : `Em ${diff} dias`}
                            </p>
                            <p className="text-xs font-black text-slate-800">
                              {c.hatchDate.toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Casal
                            </p>
                            <p className="text-sm font-black text-slate-700">
                              {getPairName(c.pairId)}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                                {maleName}
                              </span>
                              <span className="text-[10px] text-slate-300 font-black">Ø</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100">
                                {femaleName}
                              </span>
                            </div>
                          </div>

                          {/* Indicador de Espécie e Tempo */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-md">
                              {getPairSpecies(c.pairId)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              (Média {c.incubationDays} dias)
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                            <div className="flex items-center gap-1 text-[10px] font-black text-brand uppercase">
                              <Baby size={12} /> {c.fertileCount} Ovos Galados
                            </div>
                            <button
                              onClick={() => {
                                if (c.hatchedCount > 0) {
                                  handleRegisterHatchlings(c.pairId, c.hatchedCount, c.layDate);
                                } else {
                                  openClutchModal(c.pairId, c as Clutch);
                                }
                              }}
                              className="px-3 py-1 bg-[#0F172A] text-white text-[9px] font-black rounded-lg uppercase hover:opacity-80 transition-all"
                            >
                              {c.hatchedCount > 0
                                ? 'Registrar Filhotes (Data Real)'
                                : 'Registrar Nascimento'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-10 bg-slate-50/50 border border-slate-100 rounded-[32px] text-center">
                    <Timer size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                      Nenhuma eclosão pendente
                    </p>
                  </div>
                )}
              </div>

              {/* Carrossel de Dicas de Reprodução */}
              <Suspense fallback={<div />}>
                <TipCarousel category="breeding" />
              </Suspense>
            </div>
          )}
        </div>

        {/* New Pair Modal */}
        {showPairModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-800">Formar Casal</h3>
                <button
                  onClick={() => setShowPairModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={32} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleSavePair} className="p-10 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Identificação do Casal / Box
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Box 05 - Curiós"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700"
                    value={newPair.name || ''}
                    onChange={(e) => setNewPair({ ...newPair, name: e.target.value })}
                  />
                </div>

                {/* Alerta de Filtragem de Espécie */}
                {(selectedMaleBird || selectedFemaleBird) && (
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-bold border border-blue-100 flex items-center gap-2">
                    <Info size={14} />
                    Filtrando por espécie:{' '}
                    {selectedMaleBird?.species || selectedFemaleBird?.species}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Macho Selecionado{' '}
                      {selectedFemaleBird ? `(Apenas ${selectedFemaleBird.species})` : ''}
                    </label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700"
                      value={newPair.maleId || ''}
                      onChange={(e) => {
                        const newMaleId = e.target.value;
                        const newMale = males.find((m) => m.id === newMaleId);
                        // Se já tem fêmea selecionada e a espécie não bate, limpa a fêmea
                        if (newMale && newPair.femaleId) {
                          const currentFemale = females.find((f) => f.id === newPair.femaleId);
                          if (currentFemale && currentFemale.species !== newMale.species) {
                            setNewPair({ ...newPair, maleId: newMaleId, femaleId: '' });
                            return;
                          }
                        }
                        setNewPair({ ...newPair, maleId: newMaleId });
                      }}
                    >
                      <option value="">Selecione um Macho</option>
                      {availableMales.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.ringNumber}) - {m.species}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Fêmea Selecionada{' '}
                      {selectedMaleBird ? `(Apenas ${selectedMaleBird.species})` : ''}
                    </label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700"
                      value={newPair.femaleId || ''}
                      onChange={(e) => {
                        const newFemaleId = e.target.value;
                        const newFemale = females.find((f) => f.id === newFemaleId);
                        // Se já tem macho selecionado e a espécie não bate, limpa o macho
                        if (newFemale && newPair.maleId) {
                          const currentMale = males.find((m) => m.id === newPair.maleId);
                          if (currentMale && currentMale.species !== newFemale.species) {
                            setNewPair({ ...newPair, femaleId: newFemaleId, maleId: '' });
                            return;
                          }
                        }
                        setNewPair({ ...newPair, femaleId: newFemaleId });
                      }}
                    >
                      <option value="">Selecione uma Fêmea</option>
                      {availableFemales.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.ringNumber}) - {f.species}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all mt-4"
                >
                  Confirmar Casal
                </button>
              </form>
            </div>
          </div>
        )}

        {/* New/Edit Clutch Modal */}
        {showClutchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div
              ref={clutchModalRef}
              className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="clutch-modal-title"
              tabIndex={-1}
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 id="clutch-modal-title" className="text-2xl font-black text-slate-800">
                  {isEditingClutch ? 'Editar Ninhada' : 'Registrar Ninhada'}
                </h3>
                <button
                  ref={clutchCloseRef}
                  onClick={() => setShowClutchModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Fechar modal de ninhada"
                >
                  <Plus size={32} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleSaveClutch} className="p-10 space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                  <div className="flex gap-3 items-center">
                    <Info size={16} className="text-blue-600 flex-shrink-0" />
                    <p className="text-[11px] text-blue-900 leading-relaxed font-bold">
                      Casal: {getPairName(selectedPairId || '')}
                    </p>
                  </div>
                  {/* Info sobre a espécie e incubação */}
                  <div className="pl-7">
                    <p className="text-[10px] text-blue-700 font-medium">
                      Espécie: {getPairSpecies(selectedPairId || '')} • Incubação Média:{' '}
                      {getIncubationDays(selectedPairId || '')} dias
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Data da Postura
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700"
                    value={newClutch.layDate || ''}
                    onChange={(e) => setNewClutch({ ...newClutch, layDate: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center flex items-center justify-center gap-1">
                      <span>Ovos</span>
                      <div className="group relative cursor-help">
                        <HelpCircle size={12} className="text-slate-300 hover:text-slate-400" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-50">
                          Ovos colocados
                        </div>
                      </div>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-center font-black text-slate-700"
                      value={newClutch.eggCount}
                      onChange={(e) =>
                        setNewClutch({ ...newClutch, eggCount: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center text-brand flex items-center justify-center gap-1">
                      <span>Galados</span>
                      <div className="group relative cursor-help">
                        <HelpCircle size={12} className="text-slate-300 hover:text-slate-400" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-50">
                          Ovos férteis
                        </div>
                      </div>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none text-center font-black text-emerald-700"
                      value={newClutch.fertileCount}
                      onChange={(e) =>
                        setNewClutch({ ...newClutch, fertileCount: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center text-rose-500 flex items-center justify-center gap-1">
                      <span>Nascidos</span>
                      <div className="group relative cursor-help">
                        <HelpCircle size={12} className="text-slate-300 hover:text-slate-400" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-50">
                          Filhotes nascidos
                        </div>
                      </div>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none text-center font-black text-rose-700"
                      value={newClutch.hatchedCount}
                      onChange={(e) =>
                        setNewClutch({ ...newClutch, hatchedCount: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Observações
                  </label>
                  <textarea
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none h-20 resize-none font-medium text-slate-700"
                    value={newClutch.notes || ''}
                    onChange={(e) => setNewClutch({ ...newClutch, notes: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand/20 mt-4"
                >
                  {isEditingClutch ? 'Salvar Alterações' : 'Confirmar Registro'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Cadastro de Filhotes */}
        {showHatchlingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div
              ref={hatchlingModalRef}
              className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hatchling-modal-title"
              tabIndex={-1}
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div>
                  <h3 id="hatchling-modal-title" className="text-2xl font-black text-slate-800">
                    Registrar Filhotes
                  </h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    Confirme os dados para adicionar {hatchlingsToRegister.length} aves ao plantel.
                  </p>
                </div>
                <button
                  ref={hatchlingCloseRef}
                  onClick={() => setShowHatchlingModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Fechar modal de filhotes"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                    <Baby size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Cadastro Automático</p>
                    <p className="text-[10px] text-emerald-600 leading-tight">
                      A espécie e os pais já foram preenchidos automaticamente com base no casal
                      selecionado.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Data real do nascimento
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-brand"
                    value={hatchlingBirthDate}
                    onChange={(e) => setHatchlingBirthDate(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400">
                    Se nasceu antes da previsão, ajuste a data aqui.
                  </p>
                </div>

                <div className="space-y-4">
                  {hatchlingsToRegister.map((hatchling, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 p-5 rounded-2xl border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100">
                          Filhote #{index + 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Nascimento: {new Date(hatchlingBirthDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Nome / ID
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                            value={hatchling.name}
                            onChange={(e) => {
                              const newArr = [...hatchlingsToRegister];
                              newArr[index].name = e.target.value;
                              setHatchlingsToRegister(newArr);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Anilha
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                            placeholder="Opcional"
                            value={hatchling.ringNumber}
                            onChange={(e) => {
                              const newArr = [...hatchlingsToRegister];
                              newArr[index].ringNumber = e.target.value;
                              setHatchlingsToRegister(newArr);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Sexo
                          </label>
                          <select
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                            value={hatchling.sex}
                            onChange={(e) => {
                              const newArr = [...hatchlingsToRegister];
                              newArr[index].sex = e.target.value as any;
                              setHatchlingsToRegister(newArr);
                            }}
                          >
                            <option value="Desconhecido">Desconhecido</option>
                            <option value="Macho">Macho</option>
                            <option value="Fêmea">Fêmea</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 bg-white z-10 flex gap-4">
                <button
                  onClick={() => {
                    setShowHatchlingModal(false);
                    setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0 });
                    setIsEditingClutch(false);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Pular Cadastro
                </button>
                <button
                  onClick={confirmHatchlingRegistration}
                  className="flex-[2] py-4 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Confirmar Filhotes no Plantel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reativação de Casal */}
        {showReactivateModal && selectedPairId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
              ref={reactivateModalRef}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-100"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reactivate-modal-title"
              tabIndex={-1}
            >
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="reactivate-modal-title"
                  className="text-xl font-black text-slate-800 flex items-center gap-2"
                >
                  <RefreshCcw size={24} className="text-amber-500" /> Reativar Casal
                </h2>
                <button
                  ref={reactivateCloseRef}
                  onClick={() => setShowReactivateModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Fechar modal de reativação"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Nova Data de Início
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                    value={reactivateData.startDate}
                    onChange={(e) =>
                      setReactivateData({ ...reactivateData, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="clearHistory"
                    checked={reactivateData.clearHistory}
                    onChange={(e) =>
                      setReactivateData({ ...reactivateData, clearHistory: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <label
                    htmlFor="clearHistory"
                    className="text-xs font-bold text-amber-700 cursor-pointer"
                  >
                    Limpar histórico de ninhadas (começar do zero)
                  </label>
                </div>

                <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-xl">
                  ℹ️ Se desmarcar, o histórico de ninhadas será mantido.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold text-sm uppercase rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReactivate}
                  className="flex-1 py-3 px-4 bg-emerald-500 text-white font-bold text-sm uppercase rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={16} /> Reativar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
};

export default BreedingManager;
