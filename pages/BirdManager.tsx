/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import toast from 'react-hot-toast';
import { deleteBird as svcDeleteBird, permanentlyDeleteBird as svcDeleteBirdPermanent } from '../services/birds';
import ConfirmDialog from '../components/ConfirmDialog';
import BirdCardPrint from '../components/BirdCard';
import TagGenerator from '../components/TagGenerator';
import ViewSettings from '../components/ViewSettings';
import { HelpIcon } from '../components/Tooltip';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import DropdownMenu, { MenuItem } from '../components/ui/DropdownMenu';
import AlertBanner from '../components/ui/AlertBanner';
import Tabs, { TabItem } from '../components/ui/Tabs';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import PageHeader from '../components/ui/PageHeader';
import BirdListTabs from '../components/BirdListTabs';
import {
  Bird,
  AppState,
  Sex,
  TrainingStatus,
  BirdClassification,
  BirdDocument,
  MovementRecord,
  MovementType,
  ViewPreferences,
} from '../types';
import { getStatusBadgeVariant } from '../lib/designSystem';
import { syncPublicBirdsForUser } from '../services/firestoreService';
import {
  Plus,
  Search,
  X,
  Edit,
  Zap,
  Dna,
  Save,
  TestTube,
  Music,
  Trash2,
  RefreshCcw,
  Archive,
  Heart,
  Mic2,
  Award,
  ChevronDown,
  Filter,
  Calendar,
  SlidersHorizontal,
  Cake,
  Microscope,
  FileCheck,
  Truck,
  CheckCircle2,
  Clock,
  Upload,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Paperclip,
  Camera,
  Lock,
  Syringe,
  HelpCircle,
} from 'lucide-react';
import {
  BRAZILIAN_SPECIES,
  MAX_FREE_BIRDS,
  SPECIES_IMAGES,
  getDefaultBirdImage,
  isDefaultBirdImage,
} from '../constants';
import PedigreeTree from '../components/PedigreeTreeNew';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import WizardLayout, { WizardStep } from '../components/WizardLayout';

// Função para normalizar nomes de espécies (corrigir erros comuns)
const normalizeSpeciesName = (species: string): string => {
  const corrections: Record<string, string> = {
    Curiõ: 'Curió',
    curião: 'Curió',
    CURIÕ: 'Curió',
  };
  return corrections[species] || species;
};

interface BirdManagerProps {
  state: AppState;
  addBird: (bird: Bird) => Promise<boolean>;
  updateBird: (bird: Bird) => void;
  deleteBird: (id: string) => void;
  addMovement?: (mov: MovementRecord) => Promise<void>;
  restoreBird?: (id: string) => void;
  permanentlyDeleteBird?: (id: string) => void;
  saveSettings?: (settings: any) => Promise<boolean>;
  isAdmin?: boolean;
  initialList?: 'plantel' | 'lixeira' | 'sexagem' | 'histórico' | 'ibama-pendentes' | 'etiquetas';
  showListTabs?: boolean;
  includeSexingTab?: boolean;
  titleOverride?: string;
}

const BirdManager: React.FC<BirdManagerProps> = ({
  state,
  addBird,
  updateBird,
  deleteBird,
  addMovement,
  restoreBird,
  permanentlyDeleteBird,
  saveSettings,
  isAdmin,
  initialList = 'plantel',
  showListTabs = true,
  includeSexingTab = true,
  titleOverride,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentList, setCurrentList] = useState<
    'plantel' | 'histórico' | 'lixeira' | 'sexagem' | 'ibama-pendentes' | 'etiquetas'
  >(initialList);

  // Confirmação de Deletar
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    birdId: string;
    birdName: string;
    isPermanent: boolean;
  }>({
    isOpen: false,
    birdId: '',
    birdName: '',
    isPermanent: false,
  });
  const [isDeletingBird, setIsDeletingBird] = useState(false);

  // Modal de Registro Rápido IBAMA
  const [showQuickIbamaModal, setShowQuickIbamaModal] = useState(false);
  const [quickIbamaBird, setQuickIbamaBird] = useState<Bird | null>(null);
  const [quickIbamaDate, setQuickIbamaDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal de Status Rápido
  const [showQuickStatusModal, setShowQuickStatusModal] = useState(false);
  const [quickStatusBird, setQuickStatusBird] = useState<Bird | null>(null);
  const [quickStatusData, setQuickStatusData] = useState({
    newStatus: 'Óbito' as 'Óbito' | 'Vendido' | 'Doado' | 'Fuga' | 'Transferência',
    date: new Date().toISOString().split('T')[0],
    createMovement: true,
    notes: '',
    receptorName: '',
    receptorDocument: '',
    receptorDocumentType: 'ibama' as 'ibama' | 'cpf',
  });

  // States da Central de Sexagem
  const [selectedForSexing, setSelectedForSexing] = useState<string[]>([]);
  const [showSendLabModal, setShowSendLabModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [labForm, setLabForm] = useState({
    laboratory: '',
    sentDate: new Date().toISOString().split('T')[0],
  });
  const [resultForm, setResultForm] = useState({
    birdId: '',
    resultDate: new Date().toISOString().split('T')[0],
    sex: 'Macho' as Sex,
    protocol: '',
    attachmentUrl: '',
  });

  // Filtros Avançados
  const [showFilters, setShowFilters] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIbamaMovementType, setFilterIbamaMovementType] = useState<
    'Todos' | 'Óbito' | 'Fuga' | 'Venda' | 'Doação' | 'Transferência'
  >('Todos');

  // Preferências de Visualização
  const [viewPreferences, setViewPreferences] = useState(
    state.settings?.viewPreferences || {
      showBirdImages: true,
      badgeSize: 'xs' as const,
      compactMode: false,
    },
  );

  // Salvar preferências quando mudam
  // Só salva preferências se realmente mudarem
  useEffect(() => {
    if (!saveSettings) return;
    const prev = state.settings?.viewPreferences || {};
    const curr = viewPreferences || {};
    const changed = Object.keys(curr).some(
      (key) => curr[key as keyof typeof curr] !== prev[key as keyof typeof prev],
    );
    if (changed) {
      const updatedSettings = {
        ...state.settings,
        viewPreferences,
        _autoViewPrefUpdate: true, // flag para não mostrar toast
      };
      saveSettings(updatedSettings).catch((err) =>
        console.error('Erro ao salvar preferências:', err),
      );
    }
  }, [viewPreferences, saveSettings, state.settings]);

  useEffect(() => {
    if (!state.settings?.userId || !state.birds?.length) return;
    syncPublicBirdsForUser(state.settings.userId, state.birds);
  }, [state.settings?.userId, state.birds]);

  // State for Add/Edit Tabs
  const [activeTab, setActiveTab] = useState<'dados' | 'genealogia' | 'docs'>('dados');

  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'pedigree'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editingBird, setEditingBird] = useState<Partial<Bird>>({});

  // State para upload manual de documento na aba 'docs'
  const [newDocForm, setNewDocForm] = useState<Partial<BirdDocument>>({
    type: 'Outro',
    date: new Date().toISOString().split('T')[0],
  });
  const docInputRef = useRef<HTMLInputElement>(null);
  const resultInputRef = useRef<HTMLInputElement>(null);

  // Ref para Upload de Foto da Ave
  const birdPhotoInputRef = useRef<HTMLInputElement>(null);

  // Verificação de Plano
  const isLimitReached =
    !isAdmin && state.settings.plan === 'Básico' && state.birds.length >= MAX_FREE_BIRDS;
  const isPro = isAdmin || state.settings.plan === 'Profissional' || !!state.settings.trialEndDate;

  // New Bird State
  const [newBird, setNewBird] = useState<Partial<Bird>>({
    sex: 'Desconhecido',
    status: 'Ativo',
    species: BRAZILIAN_SPECIES[0],
    classification: 'Exemplar',
    songTrainingStatus: 'Não Iniciado',
    isRepeater: false,
    photoUrl: getDefaultBirdImage(
      BRAZILIAN_SPECIES[0],
      'Desconhecido',
      new Date().toISOString().split('T')[0],
    ),
    birthDate: new Date().toISOString().split('T')[0],
    sexing: {
      protocol: '',
      laboratory: '',
      sentDate: '',
    },
  });

  const resolveBirdPhoto = (bird?: Partial<Bird>) => {
    const species = bird?.species || '';
    const sex = bird?.sex || 'Indeterminado';
    const birthDate = bird?.birthDate;
    return isDefaultBirdImage(bird?.photoUrl)
      ? getDefaultBirdImage(species, sex, birthDate)
      : bird?.photoUrl || getDefaultBirdImage(species, sex, birthDate);
  };

  useEffect(() => {
    setCurrentList(initialList);
  }, [initialList]);

  // Resetar filtros quando muda de aba
  useEffect(() => {
    setSearchTerm('');
    setShowFilters(false);
    setFilterIbamaMovementType('Todos');
  }, [currentList]);

  const getLibraryImagesForSpecies = (species?: string) => {
    if (!species) return [];
    const entry = SPECIES_IMAGES[species];
    if (!entry) return [];
    return [
      { label: 'Macho', url: entry.male },
      { label: 'Fêmea', url: entry.female },
    ];
  };

  const setBirdPhoto = (url: string, isEditMode: boolean) => {
    if (isEditMode) {
      setEditingBird((prev) => ({ ...prev, photoUrl: url }));
    } else {
      setNewBird((prev) => ({ ...prev, photoUrl: url }));
    }
  };

  // Ajusta o encaixe da imagem: todas as imagens usam contain + center para consistência
  const getImageFitStyle = (url?: string): React.CSSProperties => {
    if (!url || !isDefaultBirdImage(url)) {
      return { objectFit: 'contain', objectPosition: 'center' };
    }
    // Todos os ícones padrão (PNG) usam contain + center para centralização perfeita
    return { objectFit: 'contain', objectPosition: 'center' };
  };

  const applyDefaultIcon = (bird: Partial<Bird>, isEditMode: boolean) => {
    const species = bird?.species || '';
    const sex = (bird?.sex || 'Indeterminado') as Sex;
    const birthDate = bird?.birthDate;
    setBirdPhoto(getDefaultBirdImage(species, sex, birthDate), isEditMode);
  };

  const renderPhotoPicker = (bird: Partial<Bird>, isEditMode: boolean) => {
    const libraryImages = getLibraryImagesForSpecies(bird?.species);
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100">
              <img
                src={resolveBirdPhoto(bird)}
                style={getImageFitStyle(resolveBirdPhoto(bird))}
                className="w-full h-full"
                alt="Foto da Ave"
              />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Camera className="text-white" size={24} />
            </div>
            {!isPro && (
              <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md border border-slate-100">
                <Lock size={14} className="text-amber-500" />
              </div>
            )}
          </div>
          <input
            type="file"
            ref={birdPhotoInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e, isEditMode)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-elderly-label text-slate-600 uppercase tracking-widest">
              Acervo da espécie
            </p>
            <button
              type="button"
              onClick={() => applyDefaultIcon(bird, isEditMode)}
              className="text-elderly-label uppercase tracking-widest text-slate-600 hover:text-brand transition-colors"
            >
              Usar ícone padrão
            </button>
          </div>

          {libraryImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {libraryImages.map((item) => {
                const isSelected = bird?.photoUrl === item.url;
                return (
                  <button
                    key={`${item.label}-${item.url}`}
                    type="button"
                    onClick={() => setBirdPhoto(item.url, isEditMode)}
                    className={`rounded-2xl border p-2 text-left transition-all ${
                      isSelected
                        ? 'border-brand ring-2 ring-brand/20'
                        : 'border-slate-200 hover:border-brand/40'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={item.url}
                        alt={`Foto ${item.label}`}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                    <span className="mt-2 block text-elderly-label text-slate-600">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-elderly-label text-slate-600">
              Sem imagens desta espécie no acervo.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePhotoClick}
              className="px-3 py-2 text-elderly-label uppercase tracking-widest rounded-xl border border-slate-200 text-slate-600 hover:text-brand hover:border-brand transition-all"
            >
              Upload personalizado
            </button>
            {!isPro && (
              <span className="text-elderly-label text-amber-600 flex items-center gap-1">
                <Lock size={12} /> Plano Profissional
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };
  const updateNewBirdWithDefaultPhoto = (updates: Partial<Bird>) => {
    setNewBird((prev) => {
      const next = { ...prev, ...updates };
      if (!isDefaultBirdImage(prev.photoUrl)) {
        return next;
      }
      const species = next.species || '';
      const sex = next.sex || 'Indeterminado';
      const birthDate = next.birthDate;
      return { ...next, photoUrl: getDefaultBirdImage(species, sex, birthDate) };
    });
  };

  const updateEditingBirdWithDefaultPhoto = (updates: Partial<Bird>) => {
    setEditingBird((prev) => {
      const next = { ...prev, ...updates };
      if (!isDefaultBirdImage(prev.photoUrl)) {
        return next;
      }
      const species = next.species || '';
      const sex = next.sex || 'Indeterminado';
      const birthDate = next.birthDate;
      return { ...next, photoUrl: getDefaultBirdImage(species, sex, birthDate) };
    });
  };

  // Genealogy Form State - Agora com suporte a múltiplas gerações
  const [genealogyMode, setGenealogyMode] = useState<{
    father: 'plantel' | 'manual';
    mother: 'plantel' | 'manual';
  }>({
    father: 'plantel',
    mother: 'plantel',
  });

  // Função para gerar paths para gerações recursivamente
  const generateGenealogyPaths = (maxDepth: number = 6): string[] => {
    const paths: string[] = [];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const count = Math.pow(2, depth);
      for (let i = 0; i < count; i++) {
        const path = i
          .toString(2)
          .padStart(depth, '0')
          .split('')
          .map((bit) => (bit === '0' ? 'f' : 'm'))
          .join('');
        paths.push(path);
      }
    }
    return paths;
  };

  // Detecta automaticamente profundidade máxima de gerações existentes
  const getMaxGenerationDepth = (bird?: Bird | Partial<Bird>): number => {
    if (!bird) return 2; // Default: até avós

    let maxDepth = 0;
    if ((bird as any).fatherId || (bird as any).manualAncestors?.['f'])
      maxDepth = Math.max(maxDepth, 1);
    if ((bird as any).motherId || (bird as any).manualAncestors?.['m'])
      maxDepth = Math.max(maxDepth, 1);

    const paths = generateGenealogyPaths(6);
    for (const path of paths) {
      if ((bird as any).manualAncestors && (bird as any).manualAncestors[path]) {
        maxDepth = Math.max(maxDepth, path.length);
      }
    }

    return Math.min(maxDepth + 1, 6); // Mínimo avós (2), máximo 6 gerações
  };

  const [manualAncestorsForm, setManualAncestorsForm] = useState<Record<string, string>>({});
  const [maxGenerationDepth, setMaxGenerationDepth] = useState(2);

  // Effect to populate manual ancestors form when editing starts
  useEffect(() => {
    if (isEditing && editingBird) {
      setGenealogyMode({
        father: editingBird.fatherId ? 'plantel' : 'manual',
        mother: editingBird.motherId ? 'plantel' : 'manual',
      });

      const depth = getMaxGenerationDepth(editingBird);
      setMaxGenerationDepth(depth);

      const paths = generateGenealogyPaths(depth);
      const newForm: Record<string, string> = {};

      for (const path of paths) {
        newForm[path] = editingBird.manualAncestors?.[path] || '';
      }

      setManualAncestorsForm(newForm);
    }
  }, [isEditing, editingBird]);

  const handleOpenAddModal = () => {
    if (isLimitReached) {
      setShowUpgradeModal(true);
    } else {
      resetNewBird();
      setShowModal(true);
    }
  };

  const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return 'Idade desc.';
    const birthDate = new Date(birthDateString);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (years === 0) {
      return `${months} meses`;
    }

    if (months < 0) months = 0;

    return months > 0 ? `${years}a ${months}m` : `${years} anos`;
  };

  // --- Função de Status Rápido ---
  const handleQuickStatusConfirm = async () => {
    if (quickStatusBird) {
      // 1. Atualizar status da ave
      const updatedBird = {
        ...quickStatusBird,
        status: quickStatusData.newStatus,
        ibamaBaixaPendente: true, // Sempre marca como pendente IBAMA
        ibamaBaixaData: undefined, // Limpa data anterior se houver
      };
      await updateBird(updatedBird);

      // Esperar um tick do React para garantir que o estado foi atualizado
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 2. Se marcado, criar movimentação também
      if (quickStatusData.createMovement && addMovement) {
        // Gerar UUID válido
        const movementId = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Mapear status para tipo de movimentação
        let movementType: MovementType = 'Entrada';
        if (quickStatusData.newStatus === 'Vendido') movementType = 'Venda';
        else if (quickStatusData.newStatus === 'Doado') movementType = 'Doação';
        else if (quickStatusData.newStatus === 'Transferência') movementType = 'Transferência';
        else if (quickStatusData.newStatus === 'Óbito') movementType = 'Óbito';
        else if (quickStatusData.newStatus === 'Fuga') movementType = 'Fuga';

        const newMovement: MovementRecord = {
          id: movementId,
          birdId: quickStatusBird.id,
          type: movementType,
          date: quickStatusData.date,
          notes: quickStatusData.notes || '',
          gtrUrl: undefined,
          destination: undefined,
          buyerSispass: undefined,
          ibamaBaixaPendente: true,
          // Dados do receptor (se aplicável)
          receptorName: ['Venda', 'Doação', 'Transferência'].includes(movementType)
            ? quickStatusData.receptorName
            : undefined,
          receptorDocument: ['Venda', 'Doação', 'Transferência'].includes(movementType)
            ? quickStatusData.receptorDocument
            : undefined,
          receptorDocumentType: ['Venda', 'Doação', 'Transferência'].includes(movementType)
            ? quickStatusData.receptorDocumentType
            : undefined,
        };
        console.log('[DEBUG] Criando movimento:', newMovement);
        await addMovement(newMovement); // Espera a promessa resolver
      }

      // Só fecha o modal se não for doação (doação fecha no botão onClick)
      if (quickStatusData.newStatus !== 'Doado') {
        setShowQuickStatusModal(false);
      }
      setQuickStatusBird(null);
      setQuickStatusData({
        newStatus: 'Óbito',
        date: new Date().toISOString().split('T')[0],
        createMovement: true,
        notes: '',
        receptorName: '',
        receptorDocument: '',
        receptorDocumentType: 'ibama',
      });
    }
  };

  // --- Função de Registro Rápido IBAMA ---
  const handleQuickIbamaRegister = async () => {
    if (quickIbamaBird && addMovement) {
      // 1. Atualizar ave com IBAMA registrado
      const updatedBird = {
        ...quickIbamaBird,
        ibamaBaixaPendente: false, // Marca como não pendente
        ibamaBaixaData: quickIbamaDate, // Armazena data de registro
      };
      updateBird(updatedBird);

      // 2. Criar movimentação automaticamente baseada no status da ave
      const movementId = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Mapear status para tipo de movimentação
      let movementType: MovementType = 'Entrada';
      if (quickIbamaBird.status === 'Vendido') movementType = 'Venda';
      else if (quickIbamaBird.status === 'Doado') movementType = 'Doação';
      else if (quickIbamaBird.status === 'Óbito') movementType = 'Óbito';
      else if (quickIbamaBird.status === 'Fuga') movementType = 'Fuga';

      const newMovement: MovementRecord = {
        id: movementId,
        birdId: quickIbamaBird.id,
        type: movementType,
        date: quickIbamaDate, // Usa a data do registro IBAMA
        notes: `Registro IBAMA concluído em ${quickIbamaDate}`,
        gtrUrl: undefined,
        destination: undefined,
        buyerSispass: undefined,
      };
      await addMovement(newMovement); // Espera a promessa resolver

      setShowQuickIbamaModal(false);
      setQuickIbamaBird(null);
      setQuickIbamaDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Lista dinâmica de espécies para o filtro (Padrão + Cadastradas)
  const availableSpecies = useMemo(() => {
    const registeredSpecies = state.birds.map((b) => b.species);
    const uniqueSpecies = Array.from(new Set([...BRAZILIAN_SPECIES, ...registeredSpecies])).sort();
    return uniqueSpecies;
  }, [state.birds]);

  const filteredBirds = useMemo(() => {
    if (currentList === 'sexagem') return []; // Handled separately
    if (currentList === 'ibama-pendentes') {
      let filtered = state.birds.filter(
        (b) =>
          b.ibamaBaixaPendente &&
          !b.deletedAt &&
          (b.status === 'Óbito' ||
            b.status === 'Vendido' ||
            b.status === 'Doado' ||
            b.status === 'Fuga' ||
            b.status === 'Transferência'),
      );
      // Aplicar filtro de tipo de movimento se não for "Todos"
      if (filterIbamaMovementType !== 'Todos') {
        filtered = filtered.filter((bird) => {
          // Buscar o movimento mais recente da ave
          const movement = state.movements
            .filter((m) => m.birdId === bird.id && !m.ibamaBaixaData && m.date)
            .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())[0];
          return movement?.type === filterIbamaMovementType;
        });
      }
      return filtered;
    }

    let list: Bird[] = [];
    if (currentList === 'plantel') {
      // Plantel mostra apenas aves Ativas
      list = state.birds.filter((b) => b.status === 'Ativo');
    } else if (currentList === 'histórico') {
      // Histórico mostra aves com status não-ativo (Óbito, Fuga, Vendido, Doado)
      list = state.birds.filter((b) => b.status !== 'Ativo');
    } else if (currentList === 'lixeira') {
      // Lixeira mostra aves deletadas
      list = state.deletedBirds || [];
    }

    return list.filter((bird) => {
      const matchesSearch =
        bird.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bird.ringNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesSpecies = filterSpecies ? bird.species === filterSpecies : true;
      const matchesSex = filterSex ? bird.sex === filterSex : true;
      const matchesTraining = filterTraining ? bird.songTrainingStatus === filterTraining : true;
      const matchesStatus = filterStatus ? bird.status === filterStatus : true;

      return matchesSearch && matchesSpecies && matchesSex && matchesTraining && matchesStatus;
    });
  }, [
    state.birds,
    state.deletedBirds,
    state.movements,
    searchTerm,
    currentList,
    filterSpecies,
    filterSex,
    filterTraining,
    filterStatus,
    filterIbamaMovementType,
  ]);

  // Listas para a Central de Sexagem
  const pendingSexingBirds = state.birds.filter(
    (b) => b.sex === 'Desconhecido' && !b.sexing?.sentDate && b.status === 'Ativo' && !b.deletedAt,
  );
  const waitingResultBirds = state.birds.filter(
    (b) => b.sexing?.sentDate && !b.sexing?.resultDate && b.status === 'Ativo' && !b.deletedAt,
  );

  const males = state.birds.filter((b) => b.sex === 'Macho');
  const females = state.birds.filter((b) => b.sex === 'Fêmea');
  const getMedicationName = (id: string): string => {
    const med = state.medications.find((m) => m.id === id);
    return (med?.name ?? 'Medicamento') as string;
  };
  const getMedicationHistoryForBird = (birdId: string) =>
    state.applications
      .filter((app) => app.birdId === birdId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const selectedBirdMedHistory = selectedBird ? getMedicationHistoryForBird(selectedBird.id) : [];

  const handleSaveBird = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      // Validação de campos obrigatórios
      if (!newBird.name || newBird.name.trim() === '') {
        alert('❌ Nome da ave é obrigatório.');
        return;
      }

      if (newBird.name) {
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

        const resolvedPhotoUrl = isDefaultBirdImage(newBird.photoUrl)
          ? getDefaultBirdImage(
              newBird.species || '',
              newBird.sex || 'Indeterminado',
              newBird.birthDate,
            )
          : newBird.photoUrl;

        const birdToSave: Bird = {
          ...(newBird as Bird),
          photoUrl: resolvedPhotoUrl,
          // id and createdAt will be set by the DB (but keep fallback)
          id: makeId(),
          createdAt: new Date().toISOString(),
          ringNumber: newBird.ringNumber || '', // Permitir vazio para filhotes
          manualAncestors: newBird.manualAncestors || {},
          documents: newBird.documents || [],
        };

        // Process Genealogy
        processGenealogyForSave(birdToSave);

        console.log('📝 Tentando salvar ave:', {
          nome: birdToSave.name,
          anilha: birdToSave.ringNumber || '(sem anilha - filhote?)',
          especie: birdToSave.species,
          sexo: birdToSave.sex,
          status: birdToSave.status,
        });

        const saved = await addBird(birdToSave);
        if (!saved) {
          alert('❌ Erro ao salvar ave. Verifique os dados e tente novamente.');
          return;
        }

        console.log('✅ Ave salva com sucesso!');
        setShowModal(false);
        resetNewBird();
      }
    })();
  };

  const processGenealogyForSave = (targetBird: Bird | Partial<Bird>) => {
    // Father Logic
    if (genealogyMode.father === 'plantel') {
      if (!targetBird.manualAncestors) targetBird.manualAncestors = {};
      delete targetBird.manualAncestors['f'];
    } else {
      targetBird.fatherId = undefined;
      targetBird.manualAncestors = {
        ...targetBird.manualAncestors,
        f: manualAncestorsForm.f,
        ff: manualAncestorsForm.ff,
        fm: manualAncestorsForm.fm,
      };
    }

    // Mother Logic
    if (genealogyMode.mother === 'plantel') {
      if (!targetBird.manualAncestors) targetBird.manualAncestors = {};
      delete targetBird.manualAncestors['m'];
    } else {
      targetBird.motherId = undefined;
      targetBird.manualAncestors = {
        ...targetBird.manualAncestors,
        m: manualAncestorsForm.m,
        mf: manualAncestorsForm.mf,
        mm: manualAncestorsForm.mm,
      };
    }
  };

  const handleUpdateBird = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBird = { ...editingBird };
    processGenealogyForSave(updatedBird);
    updateBird(updatedBird as Bird);
    setIsEditing(false);
    setSelectedBird(updatedBird as Bird);
  };

  // Função de Edição Rápida (Sem entrar no modo de edição)
  const handleQuickFieldUpdate = (birdId: string, field: keyof Bird, value: any) => {
    const birdToUpdate = state.birds.find((b) => b.id === birdId);
    if (birdToUpdate) {
      const updated = { ...birdToUpdate, [field]: value };
      updateBird(updated);
      setSelectedBird(updated); // Atualiza o modal aberto também
    }
  };

  // --- FUNÇÃO DE UPLOAD DE FOTO (PRO) ---
  const handlePhotoClick = () => {
    if (isPro) {
      birdPhotoInputRef.current?.click();
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEditMode) {
          setEditingBird((prev) => ({ ...prev, photoUrl: result }));
        } else {
          setNewBird((prev) => ({ ...prev, photoUrl: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- FUNÇÕES DE DOCUMENTOS ---

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.title) {
      alert('O titulo do documento e obrigatorio.');
      return;
    }
    if (newDocForm.date && editingBird.id) {
      const newDoc: BirdDocument = {
        id: Math.random().toString(36).substr(2, 9),
        title: newDocForm.title || '',
        date: newDocForm.date,
        type: (newDocForm.type as any) || 'Outro',
        ...(newDocForm.url && { url: newDocForm.url }),
        ...(newDocForm.notes && { notes: newDocForm.notes }),
      };

      const updatedDocuments = [...(editingBird.documents || []), newDoc];
      const updatedBird = { ...editingBird, documents: updatedDocuments };

      // Atualiza estado local e global
      setEditingBird(updatedBird);
      updateBird(updatedBird as Bird);
      if (selectedBird) setSelectedBird(updatedBird as Bird);

      // Reset Form
      setNewDocForm({ type: 'Outro', date: new Date().toISOString().split('T')[0] });
    }
  };

  const handleDeleteDocument = (docId: string) => {
    const updatedDocuments = (editingBird.documents || []).filter((d) => d.id !== docId);
    const updatedBird = { ...editingBird, documents: updatedDocuments };

    setEditingBird(updatedBird);
    updateBird(updatedBird as Bird);
    if (selectedBird) setSelectedBird(updatedBird as Bird);
  };

  const handleResultFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResultForm({ ...resultForm, attachmentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAttachment = (url?: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length < 2) return;
      const meta = parts[0];
      const data = parts[1];
      const match = /data:(.*?);base64/.exec(meta);
      const mime = match ? match[1] : 'application/octet-stream';
      const byteChars = atob(data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // --- FUNÇÕES DA CENTRAL DE SEXAGEM ---

  const handleToggleSelectForSexing = (birdId: string) => {
    if (selectedForSexing.includes(birdId)) {
      setSelectedForSexing(selectedForSexing.filter((id) => id !== birdId));
    } else {
      setSelectedForSexing([...selectedForSexing, birdId]);
    }
  };

  const handleSendToLab = () => {
    if (selectedForSexing.length === 0) return;

    selectedForSexing.forEach((birdId) => {
      const bird = state.birds.find((b) => b.id === birdId);
      if (bird) {
        updateBird({
          ...bird,
          sexing: {
            ...bird.sexing,
            protocol: '', // Será preenchido ou deixado em branco
            laboratory: labForm.laboratory,
            sentDate: labForm.sentDate,
          },
        });
      }
    });

    setSelectedForSexing([]);
    setShowSendLabModal(false);
    setLabForm({ laboratory: '', sentDate: new Date().toISOString().split('T')[0] });
  };

  const handleOpenResultModal = (bird: Bird) => {
    setResultForm({
      birdId: bird.id,
      resultDate: new Date().toISOString().split('T')[0],
      sex: 'Macho',
      protocol: bird.sexing?.protocol || '',
      attachmentUrl: '',
    });
    setShowResultModal(true);
  };

  const handleSaveResult = () => {
    const bird = state.birds.find((b) => b.id === resultForm.birdId);
    if (bird) {
      // 1. Cria o documento automaticamente se houver anexo ou apenas para registro
      const newSexingDoc: BirdDocument = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Resultado Sexagem (${resultForm.protocol || 'S/N'})`,
        date: resultForm.resultDate,
        type: 'Exame',
        ...(resultForm.attachmentUrl && { url: resultForm.attachmentUrl }),
        notes: `Laboratório: ${bird.sexing?.laboratory || 'N/A'}. Resultado: ${resultForm.sex}`,
      };

      const existingDocs = bird.documents || [];

      updateBird({
        ...bird,
        sex: resultForm.sex, // ATUALIZA O SEXO DA AVE NO PLANTEL
        documents: [...existingDocs, newSexingDoc], // ADICIONA AO REPOSITÓRIO DE DOCS
        sexing: {
          ...bird.sexing,
          // Mantém dados anteriores
          laboratory: bird.sexing?.laboratory || '',
          sentDate: bird.sexing?.sentDate || '',
          // Novos dados
          resultDate: resultForm.resultDate,
          protocol: resultForm.protocol,
          attachmentUrl: resultForm.attachmentUrl,
        },
      });
    }
    setShowResultModal(false);
  };

  // ------------------------------------

  // Função isolada e direta para DELETAR (Mover para Lixeira) - com confirmação
  const handleDeleteClick = (id: string) => {
    const bird = state.birds.find((b) => b.id === id);
    if (bird) {
      setDeleteConfirm({
        isOpen: true,
        birdId: id,
        birdName: bird.name || 'Ave sem nome',
        isPermanent: false,
      });
    }
  };

  // Confirmação de Delete - Mover para Lixeira
  const handleConfirmDelete = async () => {
    setIsDeletingBird(true);
    try {
      if (deleteConfirm.isPermanent && permanentlyDeleteBird) {
        await svcDeleteBirdPermanent(deleteConfirm.birdId);
        permanentlyDeleteBird(deleteConfirm.birdId);
      } else {
        await svcDeleteBird(deleteConfirm.birdId);
        deleteBird(deleteConfirm.birdId);
      }
      setDeleteConfirm({ isOpen: false, birdId: '', birdName: '', isPermanent: false });
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro ao deletar a ave');
    } finally {
      setIsDeletingBird(false);
    }
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede borbulhamento
    if (restoreBird) restoreBird(id);
  };

  const handleRestoreToActive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede borbulhamento
    // Encontra a ave no histórico e restaura seu status para Ativo
    const birdToRestore = state.birds.find((b) => b.id === id);
    if (birdToRestore) {
      updateBird({
        ...birdToRestore,
        status: 'Ativo',
        ibamaBaixaPendente: false, // Limpa também o pendente IBAMA
      });
      toast.success(`${birdToRestore.name} restaurada para o plantel ativo!`);
    }
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede borbulhamento
    if (permanentlyDeleteBird) permanentlyDeleteBird(id);
  };

  const resetNewBird = () => {
    setNewBird({
      sex: 'Desconhecido',
      status: 'Ativo',
      species: BRAZILIAN_SPECIES[0],
      photoUrl: getDefaultBirdImage(
        BRAZILIAN_SPECIES[0],
        'Desconhecido',
        new Date().toISOString().split('T')[0],
      ),
      birthDate: new Date().toISOString().split('T')[0],
      sexing: { protocol: '', laboratory: '', sentDate: '' },
      songTrainingStatus: 'Não Iniciado',
      songType: '',
      isRepeater: false,
      classification: 'Exemplar',
      manualAncestors: {},
    });
    setGenealogyMode({ father: 'plantel', mother: 'plantel' });
    setMaxGenerationDepth(2);
    setManualAncestorsForm({});
    setActiveTab('dados');
  };

  // Helpers de Renderização
  const renderClassificationBadge = (cls: BirdClassification) => {
    switch (cls) {
      case 'Reprodutor':
        return (
          <span className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-md">
            <Heart size={10} fill="currentColor" /> Reprodutor
          </span>
        );
      case 'Exemplar':
        return (
          <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
            <Mic2 size={10} /> Exemplar
          </span>
        );
      case 'Descarte':
        return (
          <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
            <Award size={10} /> Descarte
          </span>
        );
      default:
        return null;
    }
  };

  const renderTrainingStatusBadge = (status: TrainingStatus) => {
    if (status === 'Não Iniciado') return null;
    let color = 'bg-slate-100 text-slate-600';
    let label: string = status;
    let icon = <Music size={10} />;

    if (status === 'Em Progresso') {
      color = 'bg-amber-100 text-amber-700';
      label = 'Em Progresso';
      icon = <Award size={10} />;
    }
    if (status === 'Concluído') {
      color = 'bg-green-100 text-green-700';
      label = 'Concluído';
    }
    if (status === 'Certificado') {
      color = 'bg-blue-100 text-blue-700';
      label = 'Certificado';
    }

    return (
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${color}`}>
        {icon} {label}
      </div>
    );
  };

  const headerTitle =
    titleOverride ||
    (currentList === 'sexagem'
      ? 'Central de Sexagem'
      : currentList === 'etiquetas'
      ? 'Gerador de Etiquetas'
      : 'Plantel');

  const birdWizardStepsBase: Array<{ id: typeof currentList; label: string }> = [
    { id: 'plantel', label: 'Plantel' },
    { id: 'etiquetas', label: 'Etiquetas' },
    { id: 'histórico', label: 'Histórico' },
    { id: 'sexagem', label: 'Sexagem' },
    { id: 'ibama-pendentes', label: 'IBAMA' },
    { id: 'lixeira', label: 'Lixeira' },
  ];

  const birdWizardSteps: WizardStep[] = birdWizardStepsBase.map((step) => ({
    id: step.id,
    label: step.label,
    content: null,
  }));

  const activeWizardIndex = Math.max(
    0,
    birdWizardStepsBase.findIndex((step) => step.id === currentList),
  );

  const pageContent = (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={<>{headerTitle}</>}
        subtitle="Cadastre, edite e organize suas aves"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative group flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <label htmlFor="bird-search" className="sr-only">
                Pesquisar
              </label>
              <input
                id="bird-search"
                name="birdSearch"
                type="text"
                placeholder="Pesquisar por nome ou anilha..."
                aria-label="Pesquisar por nome ou anilha"
                autoComplete="off"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <SecondaryButton
              onClick={() => setShowFilters(!showFilters)}
              className={`${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
              } px-4 py-3.5 rounded-lg flex items-center gap-2 text-sm`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden md:inline">Filtros</span>
            </SecondaryButton>

            {currentList === 'plantel' && (
              <ViewSettings
                preferences={viewPreferences}
                onPreferencesChange={(prefs) => setViewPreferences(prefs)}
              />
            )}

            <PrimaryButton onClick={handleOpenAddModal} className="flex items-center gap-2">
              <Plus size={18} />
              <span className="hidden md:inline">Nova Ave</span>
            </PrimaryButton>
          </div>
        }
      />

      {/* --- MODO CENTRAL DE SEXAGEM --- */}
      {currentList === 'sexagem' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-900 mb-1">Dica</p>
              <p className="text-xs text-blue-700">
                Aves com sexo indeterminado aparecem aqui para gerar a remessa da sexagem.
              </p>
            </div>
          </div>
          {/* ... (Existing Sexing Logic remains unchanged) ... */}
          {/* Seção 1: Pendentes de Envio */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Microscope size={20} />
                </div>
                Pendentes de Envio
              </h3>
              <button
                onClick={() => setShowSendLabModal(true)}
                disabled={selectedForSexing.length === 0}
                className="px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-md disabled:opacity-50 disabled:shadow-none hover:bg-amber-700 transition-all flex items-center gap-2"
              >
                <Truck size={16} /> Gerar Remessa ({selectedForSexing.length})
              </button>
            </div>

            {pendingSexingBirds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pendingSexingBirds.map((bird) => (
                  <div
                    key={bird.id}
                    onClick={() => handleToggleSelectForSexing(bird.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 group ${
                      selectedForSexing.includes(bird.id)
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-100'
                        : 'bg-slate-50 border-slate-100 hover:border-amber-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedForSexing.includes(bird.id)
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedForSexing.includes(bird.id) && <CheckCircle2 size={14} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{bird.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {bird.ringNumber} ÔÇó {normalizeSpeciesName(bird.species)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma ave pendente</p>
              </div>
            )}
          </div>

          {/* Seção 2: Aguardando Resultados */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Clock size={20} />
              </div>
              Aguardando Laudo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingResultBirds.length > 0 ? (
                waitingResultBirds.map((bird) => {
                  const daysWait = Math.floor(
                    (new Date().getTime() - new Date(bird.sexing?.sentDate || '').getTime()) /
                      (1000 * 3600 * 24),
                  );
                  return (
                    <div
                      key={bird.id}
                      className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 flex flex-col justify-between h-full"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-slate-800">{bird.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{bird.ringNumber}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-lg uppercase">
                          {daysWait} dias
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500">
                          <p>
                            <span className="font-bold">Laboratório:</span>{' '}
                            {bird.sexing?.laboratory}
                          </p>
                          <p>
                            <span className="font-bold">Enviado em:</span>{' '}
                            {new Date(bird.sexing?.sentDate || '').toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <button
                          onClick={() => handleOpenResultModal(bird)}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <FileCheck size={16} /> Registrar Resultado
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-10 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Nenhum exame em andamento
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODO IBAMA PENDENTES --- */}
      {currentList === 'ibama-pendentes' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative group flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <label htmlFor="ibama-search" className="sr-only">
                Pesquisar
              </label>
              <input
                id="ibama-search"
                name="ibamaSearch"
                type="text"
                placeholder="Pesquisar por nome ou anilha..."
                aria-label="Pesquisar por nome ou anilha"
                autoComplete="off"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm font-medium shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3.5 rounded-lg border transition-all flex items-center gap-2 font-semibold text-sm ${
                showFilters
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden md:inline">Filtrar</span>
            </button>
          </div>

          {/* Filtro de Tipo de Movimento IBAMA */}
          {showFilters && (
            <div className="p-6 bg-white border border-slate-100 rounded-[24px] shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Filter size={14} /> Filtrar por Tipo de Movimento
                </h4>
                {filterIbamaMovementType !== 'Todos' && (
                  <button
                    onClick={() => setFilterIbamaMovementType('Todos')}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['Todos', 'Óbito', 'Fuga', 'Venda', 'Doação', 'Transferência'] as const).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilterIbamaMovementType(type)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        filterIbamaMovementType === type
                          ? 'bg-amber-500 text-white shadow-lg'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'Venda' && '💰'}
                      {type === 'Doação' && '🎁'}
                      {type === 'Transferência' && '🔄'}
                      {type === 'Óbito' && '⚠️'}
                      {type === 'Fuga' && '🚨'}
                      {type === 'Todos' && '📋'} {type}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 mb-1">Registros Pendentes</p>
              <p className="text-xs text-amber-700">
                Aves listadas aqui precisam ser registradas no portal do IBAMA. Clique em
                &quot;Registrar IBAMA&quot; para marcar como concluído.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- MODO LISTA DE PLANTEL (PADRÃO) --- */}
      {currentList === 'plantel' && (
        <div className="space-y-4">
          {/* ... (Search and filter logic remains the same) ... */}
          {/* Search and actions moved to PageHeader above */}

          {/* ... (Filter Content remains the same) ... */}
          {showFilters && (
            <div className="p-6 bg-white border border-slate-100 rounded-[24px] shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Filter size={14} /> Filtrar Resultados
                </h4>
                {(filterSpecies || filterSex || filterTraining || filterStatus) && (
                  <button
                    onClick={() => {
                      setFilterSpecies('');
                      setFilterSex('');
                      setFilterTraining('');
                      setFilterStatus('');
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Espécie
                  </label>
                  <select
                    value={filterSpecies}
                    onChange={(e) => setFilterSpecies(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand"
                  >
                    <option value="">Todas</option>
                    {availableSpecies.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Sexo
                  </label>
                  <select
                    value={filterSex}
                    onChange={(e) => setFilterSex(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand"
                  >
                    <option value="">Todos</option>
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                    <option value="Indeterminado">Indeterminado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand"
                  >
                    <option value="">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Óbito">Óbito</option>
                    <option value="Fuga">Fuga</option>
                    <option value="Vendido">Vendido</option>
                    <option value="Doado">Doado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Status de Canto
                  </label>
                  <select
                    value={filterTraining}
                    onChange={(e) => setFilterTraining(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand"
                  >
                    <option value="">Todos</option>
                    <option value="Não Iniciado">Não Iniciado</option>
                    <option value="Pardo (Aprendizado)">Pardo (Aprendizado)</option>
                    <option value="Em Encarte">Em Encarte</option>
                    <option value="Fixado">Mestre (Fixado)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentList === 'lixeira' && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
          <p className="text-rose-700 font-bold text-sm">Aves na Lixeira</p>
          <p className="text-rose-600 text-xs">
            Aqui você pode restaurar aves excluías acidentalmente ou removê-las permanentemente.
          </p>
          <p className="text-rose-600 text-xs mt-1">
            Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos
            automaticamente.
          </p>
        </div>
      )}

      {/* Seção de Gerador de Etiquetas */}
      {currentList === 'etiquetas' && (
        <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl p-6 border border-blue-200">
          <TagGenerator birds={state.birds} settings={state.settings} />
        </div>
      )}

      {currentList !== 'sexagem' && currentList !== 'etiquetas' && (
        <div
          className={`grid ${viewPreferences.compactMode ? 'gap-3' : 'gap-6'} ${
            viewPreferences.badgeSize === 'lg'
              ? 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'
              : viewPreferences.badgeSize === 'md'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
              : viewPreferences.badgeSize === 'sm'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4'
              : viewPreferences.badgeSize === 'xs'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'
              : 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
          }`}
        >
          {filteredBirds.map((bird) => (
            <Card
              key={bird.id}
              interactive
              hover
              onClick={() => {
                if (currentList === 'plantel') {
                  setSelectedBird(bird);
                  setEditingBird(bird);
                  setViewMode('details');
                  setIsEditing(false);
                }
              }}
              className={`${currentList === 'lixeira' ? 'opacity-75' : ''} ${
                viewPreferences.badgeSize === 'lg'
                  ? viewPreferences.compactMode
                    ? 'p-2'
                    : 'p-4'
                  : viewPreferences.badgeSize === 'md'
                  ? viewPreferences.compactMode
                    ? 'p-2'
                    : 'p-3'
                  : viewPreferences.badgeSize === 'sm'
                  ? viewPreferences.compactMode
                    ? 'p-1.5'
                    : 'p-2'
                  : viewPreferences.badgeSize === 'xs'
                  ? viewPreferences.compactMode
                    ? 'p-0.5'
                    : 'p-1'
                  : viewPreferences.compactMode
                  ? 'p-0.5'
                  : 'p-0.5'
              }`}
            >
              {/* Foto - Mostrar/Ocultar conforme preferência */}
              {viewPreferences.showBirdImages !== false ? (
                <div
                  className={`relative bg-slate-50 rounded-lg overflow-hidden ${
                    viewPreferences.badgeSize === 'lg' ? 'aspect-video mb-6' : 'aspect-square mb-4'
                  }`}
                >
                  <img
                    src={resolveBirdPhoto(bird)}
                    alt={bird.name}
                    style={{
                      ...getImageFitStyle(resolveBirdPhoto(bird)),
                      width: '100%',
                      height: '100%',
                      maxWidth: '100%',
                      maxHeight: '100%',
                    }}
                    className={`object-contain ${
                      currentList === 'lixeira' ? 'grayscale opacity-50' : ''
                    }`}
                  />
                  {currentList === 'lixeira' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                      <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                        Na Lixeira
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`relative bg-gradient-to-br ${
                    bird.sex === 'Macho'
                      ? 'from-blue-100 to-blue-50'
                      : bird.sex === 'Fêmea'
                      ? 'from-pink-100 to-pink-50'
                      : 'from-slate-100 to-slate-50'
                  } rounded-lg overflow-hidden flex items-center justify-center ${
                    viewPreferences.badgeSize === 'lg' ? 'aspect-video mb-6' : 'aspect-square mb-4'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div
                      className={`text-5xl ${viewPreferences.badgeSize === 'lg' ? 'text-6xl' : ''}`}
                    >
                      {bird.sex === 'Macho' && '♂️'}
                      {bird.sex === 'Fêmea' && '♀️'}
                      {bird.sex !== 'Macho' && bird.sex !== 'Fêmea' && '❓'}
                    </div>
                    <span
                      className={`font-bold text-slate-600 ${
                        viewPreferences.badgeSize === 'lg' ? 'text-base' : 'text-sm'
                      }`}
                    >
                      {bird.sex === 'Macho' && 'Macho'}
                      {bird.sex === 'Fêmea' && 'Fêmea'}
                      {bird.sex !== 'Macho' && bird.sex !== 'Fêmea' && 'Desconhecido'}
                    </span>
                  </div>
                </div>
              )}

              {/* Cabeçalho: nome + status */}
              <div
                className={`flex items-start justify-between ${
                  viewPreferences.compactMode ? 'mb-2' : 'mb-3'
                } gap-2`}
              >
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-bold text-slate-900 truncate ${
                      viewPreferences.badgeSize === 'lg'
                        ? 'text-lg'
                        : viewPreferences.badgeSize === 'md'
                        ? 'text-base'
                        : viewPreferences.badgeSize === 'sm'
                        ? 'text-sm'
                        : 'text-xs'
                    }`}
                  >
                    {bird.name}
                  </h4>
                  <p
                    className={`text-slate-500 flex items-center gap-1 ${
                      viewPreferences.badgeSize === 'lg'
                        ? 'text-sm'
                        : viewPreferences.badgeSize === 'md'
                        ? 'text-xs'
                        : viewPreferences.badgeSize === 'sm'
                        ? 'text-[10px]'
                        : 'text-[8px]'
                    }`}
                  >
                    <span className="truncate">{bird.ringNumber}</span>
                    <HelpIcon tooltip="S/A = Número da Anilha (Anel de Identificação)" />
                  </p>
                </div>
                <Badge
                  variant={getStatusBadgeVariant(bird.status)}
                  size={viewPreferences.badgeSize || 'xs'}
                >
                  {bird.status}
                </Badge>
              </div>

              {/* Info essencial */}
              <div
                className={`space-y-1 ${viewPreferences.compactMode ? 'mb-2' : 'mb-4'} ${
                  viewPreferences.badgeSize === 'lg'
                    ? 'space-y-2'
                    : viewPreferences.compactMode
                    ? 'space-y-0.5'
                    : 'space-y-1'
                }`}
              >
                <p
                  className={`text-slate-600 flex items-center gap-1 ${
                    viewPreferences.badgeSize === 'lg'
                      ? 'text-base'
                      : viewPreferences.badgeSize === 'md'
                      ? 'text-sm'
                      : viewPreferences.badgeSize === 'sm'
                      ? 'text-xs'
                      : 'text-[10px]'
                  }`}
                >
                  {normalizeSpeciesName(bird.species)}
                  <HelpIcon tooltip="Espécie do pássaro" />
                </p>
                <p
                  className={`text-slate-500 flex items-center gap-1 ${
                    viewPreferences.badgeSize === 'lg'
                      ? 'text-sm'
                      : viewPreferences.badgeSize === 'md'
                      ? 'text-xs'
                      : viewPreferences.badgeSize === 'sm'
                      ? 'text-[10px]'
                      : 'text-[8px]'
                  }`}
                >
                  {calculateAge(bird.birthDate)}
                  <HelpIcon tooltip={`Data de nascimento: ${bird.birthDate || 'N/A'}`} />
                </p>
              </div>

              {/* Alerta IBAMA se pendente */}
              {bird.ibamaBaixaPendente && (
                <AlertBanner
                  variant="warning"
                  className={`mb-4 ${
                    viewPreferences.badgeSize === 'lg'
                      ? 'text-sm'
                      : viewPreferences.badgeSize === 'md'
                      ? 'text-xs'
                      : 'text-[10px]'
                  }`}
                >
                  Registro IBAMA pendente
                </AlertBanner>
              )}

              {/* IBAMA Pendentes View - Mostrar detalhes do movimento */}
              {currentList === 'ibama-pendentes' && bird.ibamaBaixaPendente && (
                <div
                  className={`bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 mb-4`}
                >
                  {/* Buscar movimento relacionado */}
                  {state.movements
                    .filter((m) => m.birdId === bird.id && !m.ibamaBaixaData && m.date)
                    .sort(
                      (a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
                    )[0] &&
                    (() => {
                      const movement = state.movements
                        .filter((m) => m.birdId === bird.id && !m.ibamaBaixaData && m.date)
                        .sort(
                          (a, b) =>
                            new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
                        )[0];
                      return (
                        <>
                          <div>
                            <p className="text-[10px] font-bold text-amber-800 uppercase">
                              Tipo: {movement?.type}
                            </p>
                            <p className="text-[9px] text-amber-700">Data: {movement?.date}</p>
                          </div>
                          {['Venda', 'Doação', 'Transferência'].includes(movement?.type || '') && (
                            <div className="bg-white rounded p-2 space-y-1 border border-amber-100">
                              <p className="text-[9px] font-bold text-slate-700">
                                👤 {movement?.receptorName}
                              </p>
                              <p className="text-[8px] text-slate-600">
                                {movement?.receptorDocumentType === 'ibama'
                                  ? '🔐 IBAMA:'
                                  : '📋 CPF:'}{' '}
                                {movement?.receptorDocument}
                              </p>
                            </div>
                          )}
                          <PrimaryButton
                            onClick={() => {
                              setQuickIbamaBird(bird);
                              setQuickIbamaDate(new Date().toISOString().split('T')[0]);
                              setShowQuickIbamaModal(true);
                            }}
                            className="w-full text-[10px] font-bold bg-green-500 hover:bg-green-600"
                          >
                            ✅ Registrar no IBAMA
                          </PrimaryButton>
                        </>
                      );
                    })()}
                </div>
              )}

              {/* Badges de info (plantel apenas) */}
              {currentList === 'plantel' && (
                <div
                  className={`flex flex-wrap gap-2 mb-4 ${
                    viewPreferences.badgeSize === 'lg' ? 'gap-3' : ''
                  }`}
                >
                  {bird.classification && (
                    <Badge variant="info" size={viewPreferences.badgeSize === 'lg' ? 'md' : 'sm'}>
                      {bird.classification}
                    </Badge>
                  )}
                  {bird.songTrainingStatus && bird.songTrainingStatus !== 'Não Iniciado' && (
                    <Badge variant="info" size={viewPreferences.badgeSize === 'lg' ? 'md' : 'sm'}>
                      {bird.songTrainingStatus}
                    </Badge>
                  )}
                  {bird.sexing?.resultDate && (
                    <Badge
                      variant="success"
                      size={viewPreferences.badgeSize === 'lg' ? 'md' : 'sm'}
                    >
                      ✓ Sexada
                    </Badge>
                  )}
                </div>
              )}

              {/* Menu de Ações */}
              {currentList === 'plantel' && bird.status === 'Ativo' && (
                <DropdownMenu
                  trigger={
                    <SecondaryButton
                      className={`w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium flex items-center justify-between ${
                        viewPreferences.badgeSize === 'lg'
                          ? 'text-base py-3'
                          : viewPreferences.badgeSize === 'md'
                          ? 'text-sm py-2'
                          : viewPreferences.badgeSize === 'sm'
                          ? 'text-xs py-1.5'
                          : 'text-[10px] py-1'
                      }`}
                    >
                      Ações
                      <ChevronDown
                        size={
                          viewPreferences.badgeSize === 'lg'
                            ? 16
                            : viewPreferences.badgeSize === 'md'
                            ? 14
                            : 12
                        }
                      />
                    </SecondaryButton>
                  }
                  items={
                    [
                      {
                        id: 'edit',
                        label: 'Editar',
                        icon: <Edit size={14} />,
                        onClick: () => {
                          setSelectedBird(bird);
                          setEditingBird(bird);
                          setViewMode('details');
                          setIsEditing(true);
                        },
                      },
                      {
                        id: 'status',
                        label: 'Mudar Status',
                        icon: <CheckCircle2 size={14} />,
                        onClick: () => {
                          setQuickStatusBird(bird);
                          setQuickStatusData({
                            newStatus: 'Óbito',
                            date: new Date().toISOString().split('T')[0],
                            createMovement: true,
                            notes: '',
                            receptorName: '',
                            receptorDocument: '',
                            receptorDocumentType: 'ibama',
                          });
                          setShowQuickStatusModal(true);
                        },
                      },
                      bird.ibamaBaixaPendente
                        ? {
                            id: 'ibama',
                            label: 'Registrar IBAMA',
                            icon: <Zap size={14} />,
                            onClick: () => {
                              setQuickIbamaBird(bird);
                              setShowQuickIbamaModal(true);
                              setQuickIbamaDate(new Date().toISOString().split('T')[0]);
                            },
                          }
                        : null,
                      { divider: true },
                      {
                        id: 'delete',
                        label: 'Mover para Lixeira',
                        icon: <Trash2 size={14} />,
                        onClick: () => handleDeleteClick(bird.id),
                        variant: 'danger',
                      },
                    ].filter(Boolean) as MenuItem[]
                  }
                />
              )}

              {currentList === 'ibama-pendentes' && (
                <PrimaryButton
                  onClick={() => {
                    setQuickIbamaBird(bird);
                    setShowQuickIbamaModal(true);
                    setQuickIbamaDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="w-full flex items-center gap-2"
                >
                  <CheckCircle2 size={14} /> Registrar IBAMA
                </PrimaryButton>
              )}

              {currentList === 'histórico' && (
                <div className="flex items-center gap-2 w-full">
                  <SecondaryButton
                    onClick={(e) => handleRestoreToActive(e, bird.id)}
                    className="flex-1 min-w-0 px-2 py-2"
                    title="Restaurar"
                  >
                    <RefreshCcw size={18} />
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => handleDeleteClick(bird.id)}
                    className="flex-1 min-w-0 px-2 py-2 btn-danger"
                    title="Deletar"
                  >
                    <Trash2 size={18} />
                  </SecondaryButton>
                </div>
              )}

              {currentList === 'lixeira' && (
                <div className="flex items-center gap-2 w-full">
                  <SecondaryButton
                    onClick={() => handleRestoreClick(null as any, bird.id)}
                    className="flex-1 min-w-0 px-2 py-2"
                    title="Restaurar"
                  >
                    <RefreshCcw size={18} />
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => handlePermanentDelete(null as any, bird.id)}
                    className="flex-1 min-w-0 px-2 py-2 btn-danger"
                    title="Apagar permanentemente"
                  >
                    <X size={18} />
                  </SecondaryButton>
                </div>
              )}
            </Card>
          ))}

          {currentList === 'plantel' && (
            <PrimaryButton
              onClick={handleOpenAddModal}
              className="h-full min-h-[320px] bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-slate-400 hover:text-blue-600 cursor-pointer"
            >
              <Plus size={40} />
              <span className="text-sm font-bold uppercase tracking-widest">Adicionar Ave</span>
            </PrimaryButton>
          )}
        </div>
      )}

      {/* MODAL EDITAR / DETALHES */}
      {selectedBird && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10 no-print">
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    {viewMode === 'details' ? (
                      <PrimaryButton onClick={() => setViewMode('details')}>
                        Ficha Técnica
                      </PrimaryButton>
                    ) : (
                      <SecondaryButton onClick={() => setViewMode('details')}>
                        Ficha Técnica
                      </SecondaryButton>
                    )}
                    {viewMode === 'pedigree' ? (
                      <PrimaryButton onClick={() => setViewMode('pedigree')}>
                        Árvore Genealógica
                      </PrimaryButton>
                    ) : (
                      <SecondaryButton onClick={() => setViewMode('pedigree')}>
                        Árvore Genealógica
                      </SecondaryButton>
                    )}
                  </>
                ) : (
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Edit size={18} /> Editando: {selectedBird.name}
                  </h3>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    deleteBird(selectedBird.id);
                    setSelectedBird(null);
                  }}
                  className="p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title="Mover para Lixeira"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => setSelectedBird(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 bg-[#FBFCFD]">
              {isEditing ? (
                <form onSubmit={handleUpdateBird} className="space-y-6">
                  <div className="flex border-b border-slate-100 mb-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dados')}
                      className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'dados'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dados Cadastrais
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('genealogia')}
                      className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'genealogia'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Genealogia
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('docs')}
                      className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'docs'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Galeria & Docs
                    </button>
                  </div>

                  {activeTab === 'dados' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* OPCOES DE FOTO */}
                      <div className="mb-6">{renderPhotoPicker(editingBird, true)}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-label">Nome / Identificação</label>
                          <input
                            required
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={editingBird.name || ''}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-label">Anilha</label>
                          <input
                            required
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={editingBird.ringNumber || ''}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, ringNumber: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* ... Campos de especie, sexo, data ... */}
                        <div className="space-y-2">
                          <label className="text-label">Espécie</label>
                          <div className="space-y-2">
                            <select
                              className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none"
                              value={
                                BRAZILIAN_SPECIES.includes(editingBird.species || '')
                                  ? editingBird.species
                                  : 'custom'
                              }
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  updateEditingBirdWithDefaultPhoto({ species: '' });
                                } else {
                                  updateEditingBirdWithDefaultPhoto({ species: e.target.value });
                                }
                              }}
                            >
                              {BRAZILIAN_SPECIES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                              <option value="custom">Outra (Digitar Nova)...</option>
                            </select>
                            {!BRAZILIAN_SPECIES.includes(editingBird.species || '') && (
                              <input
                                type="text"
                                placeholder="Digite o nome da espécie..."
                                className="w-full p-4 bg-slate-50 border border-brand/20 rounded-2xl font-bold text-brand outline-none focus:border-brand animate-in fade-in"
                                value={editingBird.species || ''}
                                onChange={(e) =>
                                  updateEditingBirdWithDefaultPhoto({ species: e.target.value })
                                }
                                autoFocus
                              />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-label">Sexo</label>
                          <select
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none"
                            value={editingBird.sex}
                            onChange={(e) =>
                              updateEditingBirdWithDefaultPhoto({
                                ...editingBird,
                                sex: e.target.value as any,
                              })
                            }
                          >
                            <option value="Macho">Macho</option>
                            <option value="Fêmea">Fêmea</option>
                            <option value="Indeterminado">Indeterminado</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-label">Data Nasc.</label>
                          <input
                            type="date"
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={editingBird.birthDate}
                            onChange={(e) =>
                              updateEditingBirdWithDefaultPhoto({
                                ...editingBird,
                                birthDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-label">Mutação / Cor</label>
                          <input
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={editingBird.colorMutation || ''}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, colorMutation: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-label">Classificação</label>
                          <select
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none"
                            value={editingBird.classification}
                            onChange={(e) =>
                              setEditingBird({
                                ...editingBird,
                                classification: e.target.value as any,
                              })
                            }
                          >
                            <option value="Não Definido">Não Definido</option>
                            <option value="Galador">Galador</option>
                            <option value="Pássaro de Canto">Pássaro de Canto</option>
                            <option value="Ambos">Ambos</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-label">Status</label>
                          <select
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none"
                            value={editingBird.status}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, status: e.target.value as any })
                            }
                          >
                            <option value="Ativo">Ativo</option>
                            <option value="Óbito">Óbito</option>
                            <option value="Fuga">Fuga</option>
                            <option value="Vendido">Vendido</option>
                            <option value="Doado">Doado</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-label">Status de Canto</label>
                          <select
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none"
                            value={editingBird.songTrainingStatus}
                            onChange={(e) =>
                              setEditingBird({
                                ...editingBird,
                                songTrainingStatus: e.target.value as any,
                              })
                            }
                          >
                            <option value="Não Iniciado">Não Iniciado</option>
                            <option value="Pardo (Aprendizado)">Pardo (Aprendizado)</option>
                            <option value="Em Encarte">Em Encarte / Andamento</option>
                            <option value="Fixado">Mestre (Fixado)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-label">Tipo de Canto (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ex: Praia Clássico, Curió, etc"
                            value={editingBird.songType || ''}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, songType: e.target.value })
                            }
                            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Visibilidade Pública */}
                      <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingBird.isPublic || false}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, isPublic: e.target.checked })
                            }
                            className="w-5 h-5 text-purple-600 bg-white border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
                          />
                          <div className="flex-1">
                            <span className="font-bold text-purple-900">
                              Tornar este pássaro público
                            </span>
                            <p className="text-xs text-purple-700 mt-1">
                              Pássaros públicos podem ser visualizados por qualquer pessoa na
                              galeria pública, incluindo sua árvore genealógica.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Controle de Registro IBAMA */}
                      {(editingBird.status === 'Óbito' ||
                        editingBird.status === 'Vendido' ||
                        editingBird.status === 'Doado') && (
                        <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-4">
                          <div className="flex items-center gap-2 text-amber-800">
                            <Zap size={18} />
                            <h4 className="text-sm font-semibold">Controle de Registro IBAMA</h4>
                          </div>
                          <div className="p-3 bg-white border border-amber-200 rounded-xl mb-4">
                            <p className="text-xs font-bold text-amber-800">
                              {editingBird.status === 'Óbito' &&
                                '⚠️ Óbito: Necessário dar baixa no sistema IBAMA'}
                              {editingBird.status === 'Vendido' &&
                                '⚠️ Venda: Necessário registrar a transferência no IBAMA (com SISPASS do comprador)'}
                              {editingBird.status === 'Doado' &&
                                '⚠️ Doação: Necessário registrar a doação no IBAMA (com SISPASS do destinatário)'}
                            </p>
                          </div>
                          <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!editingBird.ibamaBaixaPendente}
                                onChange={(e) =>
                                  setEditingBird({
                                    ...editingBird,
                                    ibamaBaixaPendente: !e.target.checked,
                                    ibamaBaixaData: e.target.checked
                                      ? new Date().toISOString().split('T')[0]
                                      : undefined,
                                  })
                                }
                                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-sm font-bold text-amber-800">
                                Registro IBAMA concluído
                              </span>
                            </label>
                            {!editingBird.ibamaBaixaPendente && (
                              <div className="space-y-2 animate-in fade-in">
                                <label className="text-label text-amber-800">
                                  Data do Registro
                                </label>
                                <input
                                  type="date"
                                  className="w-full p-3.5 bg-white border border-amber-300 rounded-lg font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                                  value={editingBird.ibamaBaixaData || ''}
                                  onChange={(e) =>
                                    setEditingBird({
                                      ...editingBird,
                                      ibamaBaixaData: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'genealogia' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* LADO PATERNO */}
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Dna size={16} /> Filiação Paterna
                          </h4>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                if (genealogyMode.father === 'manual') {
                                  setMaxGenerationDepth(Math.min(maxGenerationDepth + 1, 6));
                                }
                              }}
                              disabled={genealogyMode.father === 'plantel'}
                              className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                                genealogyMode.father === 'plantel'
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                  : 'bg-white text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50'
                              }`}
                            >
                              + Adicionar Geração
                            </button>
                            {genealogyMode.father === 'plantel' && (
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-lg">
                                Mude para &quot;Externo / Manual&quot; para adicionar gerações
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setGenealogyMode({ ...genealogyMode, father: 'plantel' })
                            }
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              genealogyMode.father === 'plantel'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-blue-400'
                            }`}
                          >
                            Do Plantel
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenealogyMode({ ...genealogyMode, father: 'manual' })}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              genealogyMode.father === 'manual'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-blue-400'
                            }`}
                          >
                            Externo / Manual
                          </button>
                        </div>

                        {genealogyMode.father === 'plantel' ? (
                          <select
                            className="w-full p-4 bg-white border border-blue-200 rounded-2xl font-bold text-slate-700 outline-none"
                            value={editingBird.fatherId || ''}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, fatherId: e.target.value })
                            }
                          >
                            <option value="">Selecione o Pai...</option>
                            {males
                              .filter((m) => m.id !== editingBird.id)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} - {m.ringNumber}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="space-y-3">
                            {/* Pai (Geração 1) */}
                            <div>
                              <label className="text-[10px] font-bold text-blue-800 uppercase mb-1 block">
                                👨 Pai
                              </label>
                              <input
                                placeholder="Nome do Pai"
                                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold"
                                value={manualAncestorsForm.f || ''}
                                onChange={(e) =>
                                  setManualAncestorsForm({
                                    ...manualAncestorsForm,
                                    f: e.target.value,
                                  })
                                }
                              />
                            </div>

                            {/* Avós Paternos (Geração 2) */}
                            {maxGenerationDepth >= 2 && (
                              <div>
                                <label className="text-[10px] font-bold text-blue-700 uppercase mb-1 block pl-2 border-l-2 border-blue-300">
                                  👴👵 Avós Paternos
                                </label>
                                <div className="grid grid-cols-2 gap-3 pl-2">
                                  <input
                                    placeholder="Avô Paterno"
                                    className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold"
                                    value={manualAncestorsForm.ff || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        ff: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Avó Paterna"
                                    className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold"
                                    value={manualAncestorsForm.fm || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        fm: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {/* Bisavós Paternos (Geração 3) */}
                            {maxGenerationDepth >= 3 && (
                              <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block pl-4 border-l-2 border-blue-300">
                                  👴👴👴👵 Bisavós Paternos
                                </label>
                                <div className="grid grid-cols-4 gap-2 pl-4">
                                  <input
                                    placeholder="Bisa. FF"
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.fff || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        fff: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Bisa. FM"
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.ffm || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        ffm: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Bisa. FMF"
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.fmf || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        fmf: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Bisa. FMM"
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.fmm || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        fmm: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {/* Tatarávos Paternos (Geração 4) */}
                            {maxGenerationDepth >= 4 && (
                              <div>
                                <label className="text-[10px] font-bold text-blue-500 uppercase mb-1 block pl-6 border-l-2 border-blue-300">
                                  👶👶👶👶 Tatarávos Paternos
                                </label>
                                <div className="grid grid-cols-8 gap-1 pl-6">
                                  {[
                                    'ffff',
                                    'fffm',
                                    'ffmf',
                                    'ffmm',
                                    'fmff',
                                    'fmfm',
                                    'fmmf',
                                    'fmmm',
                                  ].map((path) => (
                                    <input
                                      key={path}
                                      placeholder={path.length.toString()}
                                      className="w-full p-1.5 bg-white border border-blue-200 rounded-lg text-[9px] font-bold"
                                      value={manualAncestorsForm[path] || ''}
                                      onChange={(e) =>
                                        setManualAncestorsForm({
                                          ...manualAncestorsForm,
                                          [path]: e.target.value,
                                        })
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Geração 5 */}
                            {maxGenerationDepth >= 5 && (
                              <div>
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block pl-8 border-l-2 border-blue-200">
                                  5ª Geração
                                </label>
                                <div className="grid grid-cols-8 gap-1 pl-8 text-[8px]">
                                  {Array.from(
                                    { length: 16 },
                                    (_, i) => `fffff${i.toString(2).padStart(1, '0')}`,
                                  ).map((path) => (
                                    <input
                                      key={path}
                                      placeholder="."
                                      className="w-full p-1 bg-white border border-blue-200 rounded text-[7px] font-bold"
                                      value={manualAncestorsForm[path] || ''}
                                      onChange={(e) =>
                                        setManualAncestorsForm({
                                          ...manualAncestorsForm,
                                          [path]: e.target.value,
                                        })
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* LADO MATERNO */}
                      <div className="p-6 bg-pink-50 rounded-3xl border border-pink-100">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-black text-pink-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Dna size={16} /> Filiação Materna
                          </h4>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                if (genealogyMode.mother === 'manual') {
                                  setMaxGenerationDepth(Math.min(maxGenerationDepth + 1, 6));
                                }
                              }}
                              disabled={genealogyMode.mother === 'plantel'}
                              className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                                genealogyMode.mother === 'plantel'
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                  : 'bg-white text-pink-600 hover:text-pink-800 border-pink-200 hover:bg-pink-50'
                              }`}
                            >
                              + Adicionar Geração
                            </button>
                            {genealogyMode.mother === 'plantel' && (
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-lg">
                                Mude para &quot;Externa / Manual&quot; para adicionar gerações
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setGenealogyMode({ ...genealogyMode, mother: 'plantel' })
                            }
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              genealogyMode.mother === 'plantel'
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'bg-white text-pink-400'
                            }`}
                          >
                            Do Plantel
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenealogyMode({ ...genealogyMode, mother: 'manual' })}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              genealogyMode.mother === 'manual'
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'bg-white text-pink-400'
                            }`}
                          >
                            Externa / Manual
                          </button>
                        </div>

                        {genealogyMode.mother === 'plantel' ? (
                          <select
                            className="w-full p-4 bg-white border border-pink-200 rounded-2xl font-bold text-slate-700 outline-none"
                            value={editingBird.motherId || ''}
                            onChange={(e) =>
                              setEditingBird({ ...editingBird, motherId: e.target.value })
                            }
                          >
                            <option value="">Selecione a Mãe...</option>
                            {females
                              .filter((f) => f.id !== editingBird.id)
                              .map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name} - {f.ringNumber}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="space-y-3">
                            {/* Mãe (Geração 1) */}
                            <div>
                              <label className="text-[10px] font-bold text-pink-800 uppercase mb-1 block">
                                👩 Mãe
                              </label>
                              <input
                                placeholder="Nome da Mãe"
                                className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold"
                                value={manualAncestorsForm.m || ''}
                                onChange={(e) =>
                                  setManualAncestorsForm({
                                    ...manualAncestorsForm,
                                    m: e.target.value,
                                  })
                                }
                              />
                            </div>

                            {/* Avós Maternos (Geração 2) */}
                            {maxGenerationDepth >= 2 && (
                              <div>
                                <label className="text-[10px] font-bold text-pink-700 uppercase mb-1 block pl-2 border-l-2 border-pink-300">
                                  👴👵 Avós Maternos
                                </label>
                                <div className="grid grid-cols-2 gap-3 pl-2">
                                  <input
                                    placeholder="Avô Materno"
                                    className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold"
                                    value={manualAncestorsForm.mf || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        mf: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Avó Materna"
                                    className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold"
                                    value={manualAncestorsForm.mm || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        mm: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {/* Bisavós Maternos (Geração 3) */}
                            {maxGenerationDepth >= 3 && (
                              <div>
                                <label className="text-[10px] font-bold text-pink-600 uppercase mb-1 block pl-4 border-l-2 border-pink-300">
                                  👴👴👴👵 Bisavós Maternos
                                </label>
                                <div className="grid grid-cols-4 gap-2 pl-4">
                                  <input
                                    placeholder="Bisa. MF"
                                    className="w-full p-2 bg-white border border-pink-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.mff || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        mff: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Bisa. MM"
                                    className="w-full p-2 bg-white border border-pink-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.mfm || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        mfm: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Bisa. MMF"
                                    className="w-full p-2 bg-white border border-pink-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.mmf || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        mmf: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Bisa. MMM"
                                    className="w-full p-2 bg-white border border-pink-200 rounded-lg text-xs font-bold"
                                    value={manualAncestorsForm.mmm || ''}
                                    onChange={(e) =>
                                      setManualAncestorsForm({
                                        ...manualAncestorsForm,
                                        mmm: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {/* Tatarávos Maternos (Geração 4) */}
                            {maxGenerationDepth >= 4 && (
                              <div>
                                <label className="text-[10px] font-bold text-pink-500 uppercase mb-1 block pl-6 border-l-2 border-pink-300">
                                  👶👶👶👶 Tatarávos Maternos
                                </label>
                                <div className="grid grid-cols-8 gap-1 pl-6">
                                  {[
                                    'mfff',
                                    'mffm',
                                    'mfmf',
                                    'mfmm',
                                    'mmff',
                                    'mmfm',
                                    'mmmf',
                                    'mmmm',
                                  ].map((path) => (
                                    <input
                                      key={path}
                                      placeholder={path.length.toString()}
                                      className="w-full p-1.5 bg-white border border-pink-200 rounded-lg text-[9px] font-bold"
                                      value={manualAncestorsForm[path] || ''}
                                      onChange={(e) =>
                                        setManualAncestorsForm({
                                          ...manualAncestorsForm,
                                          [path]: e.target.value,
                                        })
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Geração 5 */}
                            {maxGenerationDepth >= 5 && (
                              <div>
                                <label className="text-[10px] font-bold text-pink-400 uppercase mb-1 block pl-8 border-l-2 border-pink-200">
                                  5ª Geração
                                </label>
                                <div className="grid grid-cols-8 gap-1 pl-8 text-[8px]">
                                  {Array.from(
                                    { length: 16 },
                                    (_, i) => `mmmmm${i.toString(2).padStart(1, '0')}`,
                                  ).map((path) => (
                                    <input
                                      key={path}
                                      placeholder="."
                                      className="w-full p-1 bg-white border border-pink-200 rounded text-[7px] font-bold"
                                      value={manualAncestorsForm[path] || ''}
                                      onChange={(e) =>
                                        setManualAncestorsForm({
                                          ...manualAncestorsForm,
                                          [path]: e.target.value,
                                        })
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'docs' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* Área de Adicionar Novo Documento */}
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <FolderOpen size={16} /> Adicionar Documento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            placeholder="Título (ex: Exame de Fezes)"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                            value={newDocForm.title || ''}
                            onChange={(e) =>
                              setNewDocForm({ ...newDocForm, title: e.target.value })
                            }
                          />
                          <div className="flex gap-2">
                            <input
                              type="date"
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                              value={newDocForm.date}
                              onChange={(e) =>
                                setNewDocForm({ ...newDocForm, date: e.target.value })
                              }
                            />
                            <select
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                              value={newDocForm.type}
                              onChange={(e) =>
                                setNewDocForm({ ...newDocForm, type: e.target.value as any })
                              }
                            >
                              <option value="Exame">Exame</option>
                              <option value="Foto">Foto</option>
                              <option value="Documento">Documento</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <div
                              onClick={() => docInputRef.current?.click()}
                              className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-white transition-all"
                            >
                              {newDocForm.url ? (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                                  <CheckCircle2 size={14} /> Arquivo Selecionado
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                  <Upload size={14} /> Anexar Arquivo
                                </span>
                              )}
                            </div>
                            <input
                              type="file"
                              ref={docInputRef}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () =>
                                    setNewDocForm({ ...newDocForm, url: reader.result as string });
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddDocument}
                            className="md:col-span-2 w-full py-3 bg-brand text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                          >
                            <Plus size={16} /> Salvar na Galeria
                          </button>
                        </div>
                      </div>

                      {/* Lista de Documentos */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
                          Documentos Arquivados
                        </h4>
                        {editingBird.documents && editingBird.documents.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {editingBird.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div
                                    className={`p-3 rounded-xl ${
                                      doc.type === 'Exame'
                                        ? 'bg-blue-50 text-blue-500'
                                        : doc.type === 'Foto'
                                        ? 'bg-purple-50 text-purple-500'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {doc.type === 'Exame' ? (
                                      <FileText size={20} />
                                    ) : doc.type === 'Foto' ? (
                                      <ImageIcon size={20} />
                                    ) : (
                                      <Paperclip size={20} />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{doc.title}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                                      {new Date(doc.date).toLocaleDateString('pt-BR')} ÔÇó{' '}
                                      {doc.type}
                                    </p>
                                    {doc.notes && (
                                      <p className="text-[10px] text-slate-500 mt-1 max-w-xs truncate">
                                        {doc.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {doc.url && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openAttachment(doc.url)}
                                        className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors"
                                      >
                                        <ExternalLink size={16} />
                                      </button>
                                      <a
                                        href={doc.url}
                                        download={doc.title}
                                        className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 rounded-lg transition-colors"
                                      >
                                        <Download size={16} />
                                      </a>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                            <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-bold uppercase tracking-widest">
                              Pasta Vazia
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingBird(selectedBird);
                      }}
                      className="w-full py-3.5 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-slate-900 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-black transition-colors"
                    >
                      <Save size={18} /> Salvar Alterações
                    </button>
                  </div>
                </form>
              ) : viewMode === 'details' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-6">
                    {/* ... (Existing Avatar/Edit Button) ... */}
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative group">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center relative">
                        <img
                          src={resolveBirdPhoto(selectedBird)}
                          style={getImageFitStyle(resolveBirdPhoto(selectedBird))}
                          className="w-full h-full"
                          alt="Foto da Ave"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setEditingBird(selectedBird);
                          setActiveTab('dados');
                        }}
                        className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
                      >
                        <Edit size={18} /> Editar Dados
                      </button>
                      {state.settings?.plan === 'Profissional' && (
                        <BirdCardPrint
                          bird={selectedBird}
                          breederName={state.settings?.breederName || 'AviGestão'}
                          breederLogo={state.settings?.logoUrl}
                          sispassNumber={state.settings?.sispassNumber}
                          allBirds={state.birds}
                        />
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-8 space-y-8">
                    {/* ... (Existing Details Card) ... */}
                    <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                      <div className="flex justify-between">
                        <h3 className="text-xl font-black text-slate-800">Dados Básicos</h3>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                            selectedBird.status === 'Ativo'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {selectedBird.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nome
                          </p>
                          <p className="text-lg font-bold text-slate-800 mt-1">
                            {selectedBird.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Anilha
                          </p>
                          <p className="text-lg font-bold text-slate-800 mt-1">
                            {selectedBird.ringNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Espécie
                          </p>
                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {normalizeSpeciesName(selectedBird.species)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Sexo
                          </p>
                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {selectedBird.sex}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Idade
                          </p>
                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {calculateAge(selectedBird.birthDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seção Resumida de Documentos (Visualização Rápida) */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <FolderOpen size={16} className="text-brand" /> Documentos Recentes
                        </h3>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setEditingBird(selectedBird);
                            setActiveTab('docs');
                          }}
                          className="text-[10px] font-bold text-brand hover:underline"
                        >
                          Ver Todos ({selectedBird.documents?.length || 0})
                        </button>
                      </div>

                      {selectedBird.documents && selectedBird.documents.length > 0 ? (
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {selectedBird.documents.slice(0, 3).map((doc) => (
                            <div
                              key={doc.id}
                              className="min-w-[160px] p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center text-center gap-2"
                            >
                              <div
                                className={`p-2 rounded-lg ${
                                  doc.type === 'Exame'
                                    ? 'bg-blue-100 text-blue-500'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {doc.type === 'Exame' ? (
                                  <TestTube size={16} />
                                ) : (
                                  <FileText size={16} />
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-700 truncate w-full max-w-[120px]">
                                  {doc.title}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400">
                                  {new Date(doc.date).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              {doc.url && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openAttachment(doc.url)}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-blue-600"
                                  >
                                    Abrir
                                  </button>
                                  <a
                                    href={doc.url}
                                    download={doc.title}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-emerald-600"
                                  >
                                    Baixar
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Nenhum documento anexado.</p>
                      )}
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <Syringe size={16} className="text-emerald-500" /> Histórico de Medicações
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase">
                          {selectedBirdMedHistory.length}
                        </span>
                      </div>

                      {selectedBirdMedHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedBirdMedHistory.slice(0, 5).map((app) => (
                            <div
                              key={app.id}
                              className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {getMedicationName(app.medicationId ?? '')}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                  {new Date(app.date).toLocaleDateString('pt-BR')} ÔÇó{' '}
                                  {app.dosage ?? '-'}
                                </p>
                                {app.notes && (
                                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                                    {app.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-[9px] font-black text-emerald-500 uppercase">
                                Aplicação
                              </span>
                            </div>
                          ))}
                          {selectedBirdMedHistory.length > 5 && (
                            <p className="text-[10px] text-slate-400 font-bold">
                              +{selectedBirdMedHistory.length - 5} aplicações
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Nenhuma aplicação registrada para esta ave.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Genealogy Tree View */
                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="w-full lg:w-72 space-y-6 no-print">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">
                        Informações
                      </h4>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="w-full py-4 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                    >
                      Imprimir
                    </button>
                  </div>
                  <div
                    id="printable-pedigree"
                    className="flex-1 bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm"
                  >
                    <PedigreeTree
                      bird={selectedBird}
                      allBirds={state.birds}
                      settings={state.settings}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ... (Modal de Nova Ave - Código existente) ... */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Nova Ave</h3>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  Cadastro completo e detalhado.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveBird} className="flex-1 overflow-y-auto bg-[#FBFCFD]">
              {/* ... (Tabs de Nova Ave e Conteúdo de Dados/Genealogia - inalterado) ... */}
              <div className="flex border-b border-slate-100 px-8 bg-white sticky top-0 z-10">
                <button
                  type="button"
                  onClick={() => setActiveTab('dados')}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                    activeTab === 'dados'
                      ? 'border-brand text-brand'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Dados Cadastrais
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('genealogia')}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                    activeTab === 'genealogia'
                      ? 'border-brand text-brand'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Genealogia
                </button>
              </div>

              <div className="p-8">
                {activeTab === 'dados' && (
                  <div className="space-y-6">
                    {/* OPCOES DE FOTO */}
                    <div className="mb-6">{renderPhotoPicker(newBird, false)}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span>Nome / Identificação</span>
                          <div className="group relative cursor-help">
                            <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                              Nome ou apelido da ave
                            </div>
                          </div>
                        </label>
                        <input
                          required
                          placeholder="Ex: Mestre Cantor"
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand"
                          value={newBird.name || ''}
                          onChange={(e) => setNewBird({ ...newBird, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span>
                            Anilha <span className="text-slate-300 text-xs">(opcional)</span>
                          </span>
                          <div className="group relative cursor-help">
                            <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                              Deixe vazio para filhotes com menos de 6 dias
                            </div>
                          </div>
                        </label>
                        <input
                          placeholder="Ex: SISPASS 123456 (opcional)"
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand"
                          value={newBird.ringNumber || ''}
                          onChange={(e) => setNewBird({ ...newBird, ringNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {/* ... Selects de Especie, Sexo, Data ... */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Espécie
                        </label>
                        <div className="space-y-2">
                          <select
                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none"
                            value={
                              BRAZILIAN_SPECIES.includes(newBird.species || '')
                                ? newBird.species
                                : 'custom'
                            }
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                updateNewBirdWithDefaultPhoto({ species: '' });
                              } else {
                                updateNewBirdWithDefaultPhoto({ species: e.target.value });
                              }
                            }}
                          >
                            {' '}
                            {BRAZILIAN_SPECIES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}{' '}
                            <option value="custom">Outra (Digitar Nova)...</option>{' '}
                          </select>
                          {!BRAZILIAN_SPECIES.includes(newBird.species || '') && (
                            <input
                              type="text"
                              placeholder="Digite o nome da nova espécie"
                              className="w-full p-4 bg-slate-50 border border-brand/20 rounded-2xl font-bold text-brand outline-none focus:border-brand animate-in fade-in"
                              value={newBird.species || ''}
                              onChange={(e) =>
                                updateNewBirdWithDefaultPhoto({ species: e.target.value })
                              }
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Sexo
                        </label>
                        <select
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none"
                          value={newBird.sex}
                          onChange={(e) =>
                            updateNewBirdWithDefaultPhoto({ sex: e.target.value as Sex })
                          }
                        >
                          {' '}
                          <option value="Macho">Macho</option> <option value="Fêmea">Fêmea</option>{' '}
                          <option value="Indeterminado">Indeterminado</option>{' '}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Data Nasc.
                        </label>
                        <input
                          type="date"
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand"
                          value={newBird.birthDate}
                          onChange={(e) => setNewBird({ ...newBird, birthDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Mutação / Cor
                        </label>
                        <input
                          placeholder="Ex: Clássico"
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand"
                          value={newBird.colorMutation || ''}
                          onChange={(e) =>
                            setNewBird({ ...newBird, colorMutation: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Classificação
                        </label>
                        <select
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none"
                          value={newBird.classification}
                          onChange={(e) =>
                            setNewBird({ ...newBird, classification: e.target.value as any })
                          }
                        >
                          {' '}
                          <option value="Não Definido">Não Definido</option>{' '}
                          <option value="Galador">Galador</option>{' '}
                          <option value="Pássaro de Canto">Pássaro de Canto</option>{' '}
                          <option value="Ambos">Ambos</option>{' '}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Status
                        </label>
                        <select
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none"
                          value={newBird.status}
                          onChange={(e) =>
                            setNewBird({ ...newBird, status: e.target.value as any })
                          }
                        >
                          {' '}
                          <option value="Ativo">Ativo</option>{' '}
                          <option value="Vendido">Vendido</option>{' '}
                          <option value="Falecido">Falecido</option>{' '}
                          <option value="Transferido">Transferido</option>{' '}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Status de Canto
                        </label>
                        <select
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none"
                          value={newBird.songTrainingStatus}
                          onChange={(e) =>
                            setNewBird({ ...newBird, songTrainingStatus: e.target.value as any })
                          }
                        >
                          {' '}
                          <option value="Não Iniciado">Não Iniciado</option>{' '}
                          <option value="Pardo (Aprendizado)">Pardo (Aprendizado)</option>{' '}
                          <option value="Em Encarte">Em Encarte / Andamento</option>{' '}
                          <option value="Fixado">Mestre (Fixado)</option>{' '}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Tipo de Canto (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Praia Clássico, Curió, etc"
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand"
                          value={newBird.songType || ''}
                          onChange={(e) => setNewBird({ ...newBird, songType: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'genealogia' && (
                  /* ... (Genealogy in New Modal - same as previous) ... */
                  <div className="space-y-8">
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                      <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        {' '}
                        <Dna size={16} /> Filiação Paterna{' '}
                      </h4>
                      <div className="flex gap-4 mb-4">
                        {' '}
                        <button
                          type="button"
                          onClick={() => setGenealogyMode({ ...genealogyMode, father: 'plantel' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            genealogyMode.father === 'plantel'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white text-blue-400'
                          }`}
                        >
                          Do Plantel
                        </button>{' '}
                        <button
                          type="button"
                          onClick={() => setGenealogyMode({ ...genealogyMode, father: 'manual' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            genealogyMode.father === 'manual'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white text-blue-400'
                          }`}
                        >
                          Externo / Manual
                        </button>{' '}
                      </div>
                      {genealogyMode.father === 'plantel' ? (
                        <select
                          className="w-full p-4 bg-white border border-blue-200 rounded-2xl font-bold text-slate-700 outline-none"
                          value={newBird.fatherId || ''}
                          onChange={(e) => setNewBird({ ...newBird, fatherId: e.target.value })}
                        >
                          {' '}
                          <option value="">Selecione o Pai...</option>{' '}
                          {males.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} - {m.ringNumber}
                            </option>
                          ))}{' '}
                        </select>
                      ) : (
                        <div className="space-y-3">
                          {' '}
                          <input
                            placeholder="Nome do Pai"
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold"
                            value={manualAncestorsForm.f}
                            onChange={(e) =>
                              setManualAncestorsForm({ ...manualAncestorsForm, f: e.target.value })
                            }
                          />{' '}
                          <div className="grid grid-cols-2 gap-3">
                            {' '}
                            <input
                              placeholder="Avô Paterno"
                              className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold"
                              value={manualAncestorsForm.ff}
                              onChange={(e) =>
                                setManualAncestorsForm({
                                  ...manualAncestorsForm,
                                  ff: e.target.value,
                                })
                              }
                            />{' '}
                            <input
                              placeholder="Avó Paterna"
                              className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold"
                              value={manualAncestorsForm.fm}
                              onChange={(e) =>
                                setManualAncestorsForm({
                                  ...manualAncestorsForm,
                                  fm: e.target.value,
                                })
                              }
                            />{' '}
                          </div>{' '}
                        </div>
                      )}
                    </div>
                    <div className="p-6 bg-pink-50 rounded-3xl border border-pink-100">
                      <h4 className="text-sm font-black text-pink-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        {' '}
                        <Dna size={16} /> Filiação Materna{' '}
                      </h4>
                      <div className="flex gap-4 mb-4">
                        {' '}
                        <button
                          type="button"
                          onClick={() => setGenealogyMode({ ...genealogyMode, mother: 'plantel' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            genealogyMode.mother === 'plantel'
                              ? 'bg-pink-600 text-white shadow-lg'
                              : 'bg-white text-pink-400'
                          }`}
                        >
                          Do Plantel
                        </button>{' '}
                        <button
                          type="button"
                          onClick={() => setGenealogyMode({ ...genealogyMode, mother: 'manual' })}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            genealogyMode.mother === 'manual'
                              ? 'bg-pink-600 text-white shadow-lg'
                              : 'bg-white text-pink-400'
                          }`}
                        >
                          Externa / Manual
                        </button>{' '}
                      </div>
                      {genealogyMode.mother === 'plantel' ? (
                        <select
                          className="w-full p-4 bg-white border border-pink-200 rounded-2xl font-bold text-slate-700 outline-none"
                          value={newBird.motherId || ''}
                          onChange={(e) => setNewBird({ ...newBird, motherId: e.target.value })}
                        >
                          {' '}
                          <option value="">Selecione a Mãe...</option>{' '}
                          {females.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} - {f.ringNumber}
                            </option>
                          ))}{' '}
                        </select>
                      ) : (
                        <div className="space-y-3">
                          {' '}
                          <input
                            placeholder="Nome da Mãe"
                            className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold"
                            value={manualAncestorsForm.m}
                            onChange={(e) =>
                              setManualAncestorsForm({ ...manualAncestorsForm, m: e.target.value })
                            }
                          />{' '}
                          <div className="grid grid-cols-2 gap-3">
                            {' '}
                            <input
                              placeholder="Avô Materno"
                              className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold"
                              value={manualAncestorsForm.mf}
                              onChange={(e) =>
                                setManualAncestorsForm({
                                  ...manualAncestorsForm,
                                  mf: e.target.value,
                                })
                              }
                            />{' '}
                            <input
                              placeholder="Avó Materna"
                              className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold"
                              value={manualAncestorsForm.mm}
                              onChange={(e) =>
                                setManualAncestorsForm({
                                  ...manualAncestorsForm,
                                  mm: e.target.value,
                                })
                              }
                            />{' '}
                          </div>{' '}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 pt-0 mt-4 border-t border-slate-50 bg-white sticky bottom-0 z-10">
                <button
                  type="submit"
                  className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all mt-4"
                >
                  Salvar Ave no Plantel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO RESULTADO SEXAGEM - Atualizado com Upload */}
      {showResultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">Registrar Laudo</h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <TestTube size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800">Resultado Definitivo</p>
                  <p className="text-[10px] text-blue-600">
                    O sexo da ave será atualizado e o arquivo salvo em documentos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setResultForm({ ...resultForm, sex: 'Macho' })}
                  className={`py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    resultForm.sex === 'Macho'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <span className="font-black text-sm uppercase">Macho</span>
                </button>
                <button
                  onClick={() => setResultForm({ ...resultForm, sex: 'Fêmea' })}
                  className={`py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    resultForm.sex === 'Fêmea'
                      ? 'border-pink-500 bg-pink-50 text-pink-600'
                      : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <span className="font-black text-sm uppercase">Fêmea</span>
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Protocolo do Exame
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={resultForm.protocol}
                  onChange={(e) => setResultForm({ ...resultForm, protocol: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Data do Laudo
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={resultForm.resultDate}
                  onChange={(e) => setResultForm({ ...resultForm, resultDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Anexar PDF/Imagem
                </label>
                <div
                  onClick={() => resultInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all"
                >
                  {resultForm.attachmentUrl ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Arquivo Pronto
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Upload size={16} /> Selecionar Arquivo
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={resultInputRef}
                  className="hidden"
                  onChange={handleResultFileUpload}
                />
                {resultForm.attachmentUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openAttachment(resultForm.attachmentUrl)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-blue-600"
                    >
                      Abrir
                    </button>
                    <a
                      href={resultForm.attachmentUrl}
                      download={`laudo-${resultForm.birdId || 'ave'}`}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-emerald-600"
                    >
                      Baixar
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveResult}
                className="w-full py-4 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Salvar Resultado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Remessa e Upgrade mantidos, sem alterações necessárias */}
      {showSendLabModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">Enviar para Laboratório</h3>
              <button
                onClick={() => setShowSendLabModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500">
                Você está enviando <strong>{selectedForSexing.length} amostras</strong> para
                sexagem.
              </p>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Laboratório
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ampligen, Unigen..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={labForm.laboratory}
                  onChange={(e) => setLabForm({ ...labForm, laboratory: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Data do Envio
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                  value={labForm.sentDate}
                  onChange={(e) => setLabForm({ ...labForm, sentDate: e.target.value })}
                />
              </div>
              <button
                onClick={handleSendToLab}
                className="w-full py-4 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
              >
                <Truck size={18} /> Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-50 rounded-full opacity-50 blur-3xl"></div>
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Zap size={40} fill="currentColor" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              Limite Atingido!
            </h3>
            <p className="text-slate-500 font-medium mt-4 max-w-sm mx-auto leading-relaxed">
              {state.settings.plan === 'Básico' && state.birds.length >= MAX_FREE_BIRDS && !isAdmin
                ? `Você atingiu o limite de ${MAX_FREE_BIRDS} aves do plano básico. Migre para o profissional e tenha gestão ilimitada.`
                : 'O upload de fotos personalizadas é exclusivo do Plano Profissional.'}
            </p>
            <div className="mt-10 space-y-3">
              <button className="w-full py-5 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.02] transition-all">
                Assinar Plano PRO
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl"
              >
                Depois eu decido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro Rápido IBAMA */}
      {showQuickIbamaModal && quickIbamaBird && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 bg-amber-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Zap size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white tracking-tight">Registrar IBAMA</h3>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
                    {quickIbamaBird.status}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuickIbamaModal(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                  Ave
                </p>
                <p className="text-lg font-black text-slate-800">{quickIbamaBird.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{quickIbamaBird.ringNumber}</p>
              </div>

              {/* Detalhes do Movimento/Receptor */}
              {(() => {
                const movement = state.movements
                  .filter((m) => m.birdId === quickIbamaBird.id && !m.ibamaBaixaData && m.date)
                  .sort(
                    (a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
                  )[0];

                if (!movement) return null;

                return (
                  <>
                    {['Venda', 'Doação', 'Transferência'].includes(movement.type || '') && (
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">
                          📋 Receptor
                        </p>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-slate-800">
                            {movement.receptorName || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded font-bold">
                              {(movement.receptorDocumentType || 'ibama') === 'ibama'
                                ? '🔐 IBAMA'
                                : '📋 CPF'}
                            </span>
                            <span className="text-slate-600 font-mono">
                              {movement.receptorDocument || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
                  Instruções
                </p>
                <p className="text-xs text-amber-700 font-bold leading-relaxed">
                  {quickIbamaBird.status === 'Óbito' &&
                    'Acesse o sistema IBAMA e registre a baixa do animal falecido.'}
                  {quickIbamaBird.status === 'Vendido' &&
                    'Acesse o sistema IBAMA e registre a transferência com o SISPASS do comprador.'}
                  {quickIbamaBird.status === 'Doado' &&
                    'Acesse o sistema IBAMA e registre a doação com o SISPASS do destinatário.'}
                  {quickIbamaBird.status === 'Fuga' &&
                    'Acesse o sistema IBAMA e registre o desaparecimento do animal.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Data do Registro
                </label>
                <input
                  type="date"
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-500"
                  value={quickIbamaDate}
                  onChange={(e) => setQuickIbamaDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 sticky bottom-0 bg-white pt-4">
                <button
                  onClick={() => setShowQuickIbamaModal(false)}
                  className="py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleQuickIbamaRegister}
                  className="py-3 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Status Rápido */}
      {showQuickStatusModal && quickStatusBird && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div
              className={`p-8 ${
                quickStatusData.newStatus === 'Óbito'
                  ? 'bg-red-500'
                  : quickStatusData.newStatus === 'Fuga'
                  ? 'bg-orange-500'
                  : quickStatusData.newStatus === 'Vendido'
                  ? 'bg-blue-500'
                  : 'bg-purple-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                  {quickStatusData.newStatus === 'Óbito' && '🔴'}
                  {quickStatusData.newStatus === 'Fuga' && '🟠'}
                  {quickStatusData.newStatus === 'Vendido' && '🔵'}
                  {quickStatusData.newStatus === 'Doado' && '🟣'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Marcar como {quickStatusData.newStatus}
                  </h3>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
                    {quickStatusBird.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuickStatusModal(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                  Ave
                </p>
                <p className="text-lg font-black text-slate-800">{quickStatusBird.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{quickStatusBird.ringNumber}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Novo Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Óbito', 'Fuga', 'Vendido', 'Doado', 'Transferência'] as const).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          setQuickStatusData({ ...quickStatusData, newStatus: status as any })
                        }
                        className={`py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
                          quickStatusData.newStatus === status
                            ? status === 'Óbito'
                              ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                              : status === 'Fuga'
                              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                              : status === 'Vendido'
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                              : status === 'Transferência'
                              ? 'bg-teal-500 text-white shadow-lg shadow-teal-200'
                              : 'bg-purple-500 text-white shadow-lg shadow-purple-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {status === 'Óbito' && '🔴'} {status === 'Fuga' && '🟠'}{' '}
                        {status === 'Vendido' && '🔵'} {status === 'Doado' && '🟣'}{' '}
                        {status === 'Transferência' && '🔄'} {status}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Data do Evento
                </label>
                <input
                  type="date"
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand"
                  value={quickStatusData.date}
                  onChange={(e) => setQuickStatusData({ ...quickStatusData, date: e.target.value })}
                />
              </div>

              {/* Campos do Receptor (apenas para Venda/Doação/Transferência) */}
              {['Vendido', 'Doado', 'Transferência'].includes(quickStatusData.newStatus) && (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <p className="text-xs font-bold text-blue-700 mb-3">
                      📋 Informações do Receptor
                    </p>

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nome do receptor"
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500"
                        value={quickStatusData.receptorName}
                        onChange={(e) =>
                          setQuickStatusData({ ...quickStatusData, receptorName: e.target.value })
                        }
                      />

                      <div className="flex gap-2">
                        <select
                          className="w-24 p-3 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500"
                          value={quickStatusData.receptorDocumentType}
                          onChange={(e) =>
                            setQuickStatusData({
                              ...quickStatusData,
                              receptorDocumentType: e.target.value as 'ibama' | 'cpf',
                            })
                          }
                        >
                          <option value="ibama">IBAMA</option>
                          <option value="cpf">CPF</option>
                        </select>
                        <input
                          type="text"
                          placeholder={
                            quickStatusData.receptorDocumentType === 'ibama'
                              ? 'Registro IBAMA'
                              : 'CPF'
                          }
                          className="flex-1 p-3 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500"
                          value={quickStatusData.receptorDocument}
                          onChange={(e) =>
                            setQuickStatusData({
                              ...quickStatusData,
                              receptorDocument: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Notas (Opcional)
                </label>
                <textarea
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand min-h-20 resize-none"
                  placeholder="Ex: Detalhes sobre o evento..."
                  value={quickStatusData.notes}
                  onChange={(e) =>
                    setQuickStatusData({ ...quickStatusData, notes: e.target.value })
                  }
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={quickStatusData.createMovement}
                  onChange={(e) =>
                    setQuickStatusData({ ...quickStatusData, createMovement: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-blue-800">Criar movimentação também</span>
              </label>

              <div className="grid grid-cols-2 gap-3 pb-2 sticky bottom-0 bg-white pt-4">
                <button
                  onClick={() => setShowQuickStatusModal(false)}
                  className="py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleQuickStatusConfirm();
                    // Se for doação, força a aba IBAMA a atualizar imediatamente
                    if (quickStatusData.newStatus === 'Doado') {
                      setShowQuickStatusModal(false);
                      // Pequeno delay para garantir que o estado propagou
                      setTimeout(() => setCurrentList('ibama-pendentes'), 100);
                    }
                  }}
                  className={`py-3 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all ${
                    quickStatusData.newStatus === 'Óbito'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                      : quickStatusData.newStatus === 'Fuga'
                      ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                      : quickStatusData.newStatus === 'Vendido'
                      ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                      : 'bg-purple-500 hover:bg-purple-600 shadow-purple-200'
                  }`}
                >
                  <CheckCircle2 size={16} /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Delete */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Mover para Lixeira?"
        message={`Tem certeza que deseja mover "${deleteConfirm.birdName}" para a lixeira? Você poderá restaurá-la depois.`}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, birdId: '', birdName: '', isPermanent: false })
        }
        confirmText="Sim, Mover"
        cancelText="Cancelar"
        isDangerous={false}
        isLoading={isDeletingBird}
      />
    </div>
  );

  return (
    <WizardLayout
      title="Plantel"
      steps={birdWizardSteps.map((step) => ({ ...step, content: pageContent }))}
      activeStep={activeWizardIndex}
      showNavigation={false}
      onStepChange={(index) => setCurrentList(birdWizardStepsBase[index]?.id || 'plantel')}
    />
  );
};

export default BirdManager;
