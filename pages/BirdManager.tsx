
import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { deleteBird as svcDeleteBird } from '../services/birds';
import ConfirmDialog from '../components/ConfirmDialog';
import BirdCardPrint from '../components/BirdCard';
import { Bird, AppState, Sex, TrainingStatus, BirdClassification, BirdDocument, MovementRecord } from '../types';
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
  HelpCircle
} from 'lucide-react';
import { BRAZILIAN_SPECIES, MAX_FREE_BIRDS, SPECIES_IMAGES, getDefaultBirdImage, isDefaultBirdImage } from '../constants';
import PedigreeTree from '../components/PedigreeTree';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));

interface BirdManagerProps {
  state: AppState;
  addBird: (bird: Bird) => Promise<boolean>;
  updateBird: (bird: Bird) => void;
  deleteBird: (id: string) => void;
  addMovement?: (mov: MovementRecord) => Promise<void>;
  restoreBird?: (id: string) => void;
  permanentlyDeleteBird?: (id: string) => void;
  isAdmin?: boolean;
  initialList?: 'plantel' | 'lixeira' | 'sexagem';
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
  isAdmin,
  initialList = 'plantel',
  showListTabs = true,
  includeSexingTab = true,
  titleOverride
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentList, setCurrentList] = useState<'plantel' | 'histórico' | 'lixeira' | 'sexagem' | 'ibama-pendentes'>(initialList);
  
  // Confirmação de Deletar
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; birdId: string; birdName: string; isPermanent: boolean }>({
    isOpen: false,
    birdId: '',
    birdName: '',
    isPermanent: false
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
    newStatus: 'Óbito' as 'Óbito' | 'Fuga' | 'Vendido' | 'Doado',
    date: new Date().toISOString().split('T')[0],
    createMovement: true,
    notes: ''
  });
  
  // States da Central de Sexagem
  const [selectedForSexing, setSelectedForSexing] = useState<string[]>([]);
  const [showSendLabModal, setShowSendLabModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [labForm, setLabForm] = useState({ laboratory: '', sentDate: new Date().toISOString().split('T')[0] });
  const [resultForm, setResultForm] = useState({ birdId: '', resultDate: new Date().toISOString().split('T')[0], sex: 'Macho' as Sex, protocol: '', attachmentUrl: '' });

  // Filtros Avançados
  const [showFilters, setShowFilters] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // State for Add/Edit Tabs
  const [activeTab, setActiveTab] = useState<'dados' | 'genealogia' | 'docs'>('dados');
  
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'pedigree'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editingBird, setEditingBird] = useState<Partial<Bird>>({});
  
  // State para upload manual de documento na aba 'docs'
  const [newDocForm, setNewDocForm] = useState<Partial<BirdDocument>>({ type: 'Outro', date: new Date().toISOString().split('T')[0] });
  const docInputRef = useRef<HTMLInputElement>(null);
  const resultInputRef = useRef<HTMLInputElement>(null);
  
  // Ref para Upload de Foto da Ave
  const birdPhotoInputRef = useRef<HTMLInputElement>(null);

  // Verificação de Plano
  const isLimitReached = !isAdmin && state.settings.plan === 'Básico' && state.birds.length >= MAX_FREE_BIRDS;
  const isPro = isAdmin || state.settings.plan === 'Profissional' || !!state.settings.trialEndDate;

  // New Bird State
  const [newBird, setNewBird] = useState<Partial<Bird>>({
    sex: 'Indeterminado',
    status: 'Ativo',
    species: BRAZILIAN_SPECIES[0],
    classification: 'Não Definido',
    songTrainingStatus: 'Não Iniciado',
    isRepeater: false,
    photoUrl: getDefaultBirdImage(BRAZILIAN_SPECIES[0], 'Indeterminado', new Date().toISOString().split('T')[0]),
    birthDate: new Date().toISOString().split('T')[0],
    sexing: {
      protocol: '',
      laboratory: '',
      sentDate: ''
    }
  });

  const resolveBirdPhoto = (bird?: Partial<Bird>) => {
    const species = bird?.species || '';
    const sex = bird?.sex || 'Indeterminado';
    const birthDate = bird?.birthDate;
    return isDefaultBirdImage(bird?.photoUrl)
      ? getDefaultBirdImage(species, sex, birthDate)
      : (bird?.photoUrl || getDefaultBirdImage(species, sex, birthDate));
  };

  useEffect(() => {
    setCurrentList(initialList);
  }, [initialList]);

  const getLibraryImagesForSpecies = (species?: string) => {
    if (!species) return [];
    const entry = SPECIES_IMAGES[species];
    if (!entry) return [];
    return [
      { label: 'Macho', url: entry.male },
      { label: 'Fêmea', url: entry.female }
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
            <p className="text-elderly-label text-slate-600 uppercase tracking-widest">Acervo da espécie</p>
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
                    className={`rounded-2xl border p-2 text-left transition-all ${isSelected ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200 hover:border-brand/40'}`}
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100">
                      <img src={item.url} alt={`Foto ${item.label}`} className="w-full h-full object-cover object-center" />
                    </div>
                    <span className="mt-2 block text-elderly-label text-slate-600">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-elderly-label text-slate-600">Sem imagens desta espécie no acervo.</p>
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

  // Genealogy Form State
  const [genealogyMode, setGenealogyMode] = useState<{ father: 'plantel' | 'manual', mother: 'plantel' | 'manual' }>({
    father: 'plantel',
    mother: 'plantel'
  });
  
  const [manualAncestorsForm, setManualAncestorsForm] = useState({
    f: '', // Pai
    ff: '', // Avô Paterno
    fm: '', // Avó Paterna
    m: '', // Mãe
    mf: '', // Avô Materno
    mm: '' // Avó Materna
  });

  // Effect to populate manual ancestors form when editing starts
  useEffect(() => {
    if (isEditing && editingBird) {
      setGenealogyMode({
        father: editingBird.fatherId ? 'plantel' : 'manual',
        mother: editingBird.motherId ? 'plantel' : 'manual'
      });
      
      setManualAncestorsForm({
        f: editingBird.manualAncestors?.['f'] || '',
        ff: editingBird.manualAncestors?.['ff'] || '',
        fm: editingBird.manualAncestors?.['fm'] || '',
        m: editingBird.manualAncestors?.['m'] || '',
        mf: editingBird.manualAncestors?.['mf'] || '',
        mm: editingBird.manualAncestors?.['mm'] || ''
      });
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
        ibamaBaixaPendente: true // Sempre marca como pendente IBAMA
      };
      updateBird(updatedBird);

      // 2. Se marcado, criar movimentação também
      if (quickStatusData.createMovement && addMovement) {
        // Gerar UUID válido
        const movementId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Mapear status para tipo de movimentação
        let movementType: 'Óbito' | 'Fuga' | 'Transporte' | 'Venda' | 'Doação' = 'Óbito';
        if (quickStatusData.newStatus === 'Fuga') movementType = 'Fuga';
        else if (quickStatusData.newStatus === 'Vendido') movementType = 'Venda';
        else if (quickStatusData.newStatus === 'Doado') movementType = 'Doação';
        else if (quickStatusData.newStatus === 'Óbito') movementType = 'Óbito';
        
        const newMovement: MovementRecord = {
          id: movementId,
          birdId: quickStatusBird.id,
          type: movementType,
          date: quickStatusData.date,
          notes: quickStatusData.notes || '',
          gtrUrl: undefined,
          destination: undefined,
          buyerSispass: undefined
        };
        await addMovement(newMovement); // Espera a promessa resolver
      }

      setShowQuickStatusModal(false);
      setQuickStatusBird(null);
      setQuickStatusData({
        newStatus: 'Óbito',
        date: new Date().toISOString().split('T')[0],
        createMovement: true,
        notes: ''
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
        ibamaBaixaData: quickIbamaDate // Armazena data de registro
      };
      updateBird(updatedBird);

      // 2. Criar movimentação automaticamente baseada no status da ave
      const movementId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Mapear status para tipo de movimentação
      let movementType: 'Óbito' | 'Fuga' | 'Transporte' | 'Venda' | 'Doação' = 'Óbito';
      if (quickIbamaBird.status === 'Fuga') movementType = 'Fuga';
      else if (quickIbamaBird.status === 'Vendido') movementType = 'Venda';
      else if (quickIbamaBird.status === 'Doado') movementType = 'Doação';
      else if (quickIbamaBird.status === 'Óbito') movementType = 'Óbito';
      
      const newMovement: MovementRecord = {
        id: movementId,
        birdId: quickIbamaBird.id,
        type: movementType,
        date: quickIbamaDate, // Usa a data do registro IBAMA
        notes: `Registro IBAMA concluído em ${quickIbamaDate}`,
        gtrUrl: undefined,
        destination: undefined,
        buyerSispass: undefined
      };
      await addMovement(newMovement); // Espera a promessa resolver

      setShowQuickIbamaModal(false);
      setQuickIbamaBird(null);
      setQuickIbamaDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Lista dinâmica de espécies para o filtro (Padrão + Cadastradas)
  const availableSpecies = useMemo(() => {
    const registeredSpecies = state.birds.map(b => b.species);
    const uniqueSpecies = Array.from(new Set([...BRAZILIAN_SPECIES, ...registeredSpecies])).sort();
    return uniqueSpecies;
  }, [state.birds]);

  const filteredBirds = useMemo(() => {
    if (currentList === 'sexagem') return []; // Handled separately
    if (currentList === 'ibama-pendentes') {
      return state.birds.filter(b => b.ibamaBaixaPendente && (b.status === 'Óbito' || b.status === 'Fuga' || b.status === 'Vendido' || b.status === 'Doado'));
    }
    
    let list: Bird[] = [];
    if (currentList === 'plantel') {
      // Plantel mostra apenas aves Ativas
      list = state.birds.filter(b => b.status === 'Ativo');
    } else if (currentList === 'histórico') {
      // Histórico mostra aves com status não-ativo (Óbito, Fuga, Vendido, Doado)
      list = state.birds.filter(b => b.status !== 'Ativo');
    } else if (currentList === 'lixeira') {
      // Lixeira mostra aves deletadas
      list = state.deletedBirds || [];
    }
    
    return list.filter(bird => {
      const matchesSearch = bird.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            bird.ringNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpecies = filterSpecies ? bird.species === filterSpecies : true;
      const matchesSex = filterSex ? bird.sex === filterSex : true;
      const matchesTraining = filterTraining ? bird.songTrainingStatus === filterTraining : true;
      const matchesStatus = filterStatus ? bird.status === filterStatus : true;

      return matchesSearch && matchesSpecies && matchesSex && matchesTraining && matchesStatus;
    });
  }, [state.birds, state.deletedBirds, searchTerm, currentList, filterSpecies, filterSex, filterTraining, filterStatus]);

  // Listas para a Central de Sexagem
  const pendingSexingBirds = state.birds.filter(b => b.sex === 'Indeterminado' && (!b.sexing?.sentDate));
  const waitingResultBirds = state.birds.filter(b => b.sexing?.sentDate && !b.sexing?.resultDate);

  const males = state.birds.filter(b => b.sex === 'Macho');
  const females = state.birds.filter(b => b.sex === 'Fêmea');
  const getMedicationName = (id: string) => state.medications.find(m => m.id === id)?.name || 'Medicamento';
  const getMedicationHistoryForBird = (birdId: string) =>
    state.applications
      .filter(app => app.birdId === birdId)
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
      if (!newBird.ringNumber || newBird.ringNumber.trim() === '') {
        alert('❌ Número de anilha é obrigatório.');
        return;
      }

      if (newBird.name && newBird.ringNumber) {
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
          ? getDefaultBirdImage(newBird.species || '', newBird.sex || 'Indeterminado', newBird.birthDate)
          : newBird.photoUrl;

        const birdToSave: Bird = {
          ...newBird as Bird,
          photoUrl: resolvedPhotoUrl,
          // id and createdAt will be set by the DB (but keep fallback)
          id: makeId(),
          createdAt: new Date().toISOString(),
          manualAncestors: newBird.manualAncestors || {},
          documents: newBird.documents || []
        };

        // Process Genealogy
        processGenealogyForSave(birdToSave);

        console.log('📝 Tentando salvar ave:', {
          nome: birdToSave.name,
          anilha: birdToSave.ringNumber,
          especie: birdToSave.species,
          sexo: birdToSave.sex,
          status: birdToSave.status
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
         'f': manualAncestorsForm.f,
         'ff': manualAncestorsForm.ff,
         'fm': manualAncestorsForm.fm
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
         'm': manualAncestorsForm.m,
         'mf': manualAncestorsForm.mf,
         'mm': manualAncestorsForm.mm
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
    const birdToUpdate = state.birds.find(b => b.id === birdId);
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
        alert("A imagem deve ter no máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEditMode) {
          setEditingBird(prev => ({ ...prev, photoUrl: result }));
        } else {
          setNewBird(prev => ({ ...prev, photoUrl: result }));
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
        title: newDocForm.title,
        date: newDocForm.date,
        type: newDocForm.type as any || 'Outro',
        url: newDocForm.url,
        notes: newDocForm.notes
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
      const updatedDocuments = (editingBird.documents || []).filter(d => d.id !== docId);
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
        setResultForm({...resultForm, attachmentUrl: reader.result as string});
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
      setSelectedForSexing(selectedForSexing.filter(id => id !== birdId));
    } else {
      setSelectedForSexing([...selectedForSexing, birdId]);
    }
  };

  const handleSendToLab = () => {
    if (selectedForSexing.length === 0) return;
    
    selectedForSexing.forEach(birdId => {
      const bird = state.birds.find(b => b.id === birdId);
      if (bird) {
        updateBird({
          ...bird,
          sexing: {
            ...bird.sexing,
            protocol: '', // Será preenchido ou deixado em branco
            laboratory: labForm.laboratory,
            sentDate: labForm.sentDate
          }
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
      attachmentUrl: ''
    });
    setShowResultModal(true);
  };

  const handleSaveResult = () => {
    const bird = state.birds.find(b => b.id === resultForm.birdId);
    if (bird) {
      
      // 1. Cria o documento automaticamente se houver anexo ou apenas para registro
      const newSexingDoc: BirdDocument = {
          id: Math.random().toString(36).substr(2, 9),
          title: `Resultado Sexagem (${resultForm.protocol || 'S/N'})`,
          date: resultForm.resultDate,
          type: 'Exame',
          url: resultForm.attachmentUrl, // Salva o anexo aqui
          notes: `Laboratório: ${bird.sexing?.laboratory || 'N/A'}. Resultado: ${resultForm.sex}`
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
          attachmentUrl: resultForm.attachmentUrl
        }
      });
    }
    setShowResultModal(false);
  };

  // ------------------------------------

  // Função isolada e direta para DELETAR (Mover para Lixeira) - com confirmação
  const handleDeleteClick = (id: string) => {
    const bird = state.birds.find(b => b.id === id);
    if (bird) {
      setDeleteConfirm({
        isOpen: true,
        birdId: id,
        birdName: bird.name || 'Ave sem nome',
        isPermanent: false
      });
    }
  };

  // Confirmação de Delete - Mover para Lixeira
  const handleConfirmDelete = async () => {
    setIsDeletingBird(true);
    try {
      if (deleteConfirm.isPermanent && permanentlyDeleteBird) {
        await svcDeleteBird(deleteConfirm.birdId);
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
    const birdToRestore = state.birds.find(b => b.id === id);
    if (birdToRestore) {
      updateBird({
        ...birdToRestore,
        status: 'Ativo',
        ibamaBaixaPendente: false // Limpa também o pendente IBAMA
      });
    }
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede borbulhamento
    if (permanentlyDeleteBird) permanentlyDeleteBird(id);
  };

  const resetNewBird = () => {
    setNewBird({ 
      sex: 'Indeterminado', 
      status: 'Ativo', 
      species: BRAZILIAN_SPECIES[0],
      photoUrl: getDefaultBirdImage(BRAZILIAN_SPECIES[0], 'Indeterminado', new Date().toISOString().split('T')[0]),
      birthDate: new Date().toISOString().split('T')[0],
      sexing: { protocol: '', laboratory: '', sentDate: '' },
      songTrainingStatus: 'Não Iniciado',
      songType: '',
      isRepeater: false,
      classification: 'Não Definido'
    });
    setGenealogyMode({ father: 'plantel', mother: 'plantel' });
    setManualAncestorsForm({ f: '', ff: '', fm: '', m: '', mf: '', mm: '' });
    setActiveTab('dados');
  };

  // Helpers de Renderização
  const renderClassificationBadge = (cls: BirdClassification) => {
    switch (cls) {
      case 'Galador': return <span className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-md"><Heart size={10} fill="currentColor" /> Galador</span>;
      case 'Pássaro de Canto': return <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md"><Mic2 size={10} /> Canto</span>;
      case 'Ambos': return <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md"><Award size={10} /> Ambos</span>;
      default: return null;
    }
  };

  const renderTrainingStatusBadge = (status: TrainingStatus) => {
    if (status === 'Não Iniciado') return null;
    let color = 'bg-slate-100 text-slate-600';
    let label: string = status;
    let icon = <Music size={10} />;

    if (status === 'Fixado') { color = 'bg-amber-100 text-amber-700'; label = 'Mestre'; icon = <Award size={10} />; }
    if (status === 'Em Encarte') { color = 'bg-blue-100 text-blue-700'; label = 'Em Encarte'; }
    if (status === 'Pardo (Aprendizado)') { color = 'bg-orange-100 text-orange-700'; label = 'Pardo'; }

    return (
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${color}`}>
        {icon} {label}
      </div>
    );
  };

  const headerTitle = titleOverride || (currentList === 'sexagem' ? 'Central de Sexagem' : 'Plantel');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{headerTitle}</h2>
          {currentList === 'plantel' && state.settings.plan === 'Básico' && !isAdmin && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand transition-all" 
                  style={{ width: `${(state.birds.length / MAX_FREE_BIRDS) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs font-medium text-slate-500">
                {state.birds.length} de {MAX_FREE_BIRDS} aves (Plano Básico)
              </p>
            </div>
          )}
        </div>
        {showListTabs && (
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
           <button 
             onClick={() => setCurrentList('plantel')}
             className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${currentList === 'plantel' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
           >
             Aves Ativas
           </button>
           <button 
             onClick={() => setCurrentList('histórico')}
             className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${currentList === 'histórico' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
           >
             📋 Histórico
             {state.birds.filter(b => b.status !== 'Ativo').length > 0 && (
               <span className="bg-white/20 px-1.5 rounded text-elderly-label">{state.birds.filter(b => b.status !== 'Ativo').length}</span>
             )}
           </button>
           {includeSexingTab && (
             <button 
               onClick={() => setCurrentList('sexagem')}
               className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${currentList === 'sexagem' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
             >
               <Dna size={14} /> Sexagem
               {waitingResultBirds.length > 0 && (
                 <span className="bg-white/20 px-1.5 rounded text-elderly-label">{waitingResultBirds.length}</span>
               )}
             </button>
           )}
           <button 
             onClick={() => setCurrentList('lixeira')}
             className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${currentList === 'lixeira' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
           >
             <Trash2 size={14} /> Lixeira
           </button>
           <button 
             onClick={() => setCurrentList('ibama-pendentes')}
             className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${currentList === 'ibama-pendentes' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <Zap size={14} /> 
             {state.birds.filter(b => b.ibamaBaixaPendente).length > 0 && (
               <span className="px-1.5 rounded text-elderly-label">{state.birds.filter(b => b.ibamaBaixaPendente).length}</span>
             )}
             IBAMA
           </button>
        </div>
        )}
      </header>

      {/* --- MODO CENTRAL DE SEXAGEM --- */}
      {currentList === 'sexagem' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
           <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-1">Dica</p>
                <p className="text-xs text-blue-700">Aves com sexo indeterminado aparecem aqui para gerar a remessa da sexagem.</p>
              </div>
           </div>
           {/* ... (Existing Sexing Logic remains unchanged) ... */}
           {/* Seção 1: Pendentes de Envio */}
           <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-900 flex items-center gap-3">
                   <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Microscope size={20} /></div>
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
                   {pendingSexingBirds.map(bird => (
                     <div 
                        key={bird.id} 
                        onClick={() => handleToggleSelectForSexing(bird.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 group ${selectedForSexing.includes(bird.id) ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-100' : 'bg-slate-50 border-slate-100 hover:border-amber-200'}`}
                     >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedForSexing.includes(bird.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'}`}>
                           {selectedForSexing.includes(bird.id) && <CheckCircle2 size={14} />}
                        </div>
                        <div>
                           <p className="font-bold text-slate-800 text-sm">{bird.name}</p>
                           <p className="text-[10px] text-slate-500 font-mono">{bird.ringNumber} ÔÇó {bird.species}</p>
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
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Clock size={20} /></div>
                 Aguardando Laudo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {waitingResultBirds.length > 0 ? waitingResultBirds.map(bird => {
                   const daysWait = Math.floor((new Date().getTime() - new Date(bird.sexing?.sentDate || '').getTime()) / (1000 * 3600 * 24));
                   return (
                     <div key={bird.id} className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 flex flex-col justify-between h-full">
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
                              <p><span className="font-bold">Laboratório:</span> {bird.sexing?.laboratory}</p>
                              <p><span className="font-bold">Enviado em:</span> {new Date(bird.sexing?.sentDate || '').toLocaleDateString('pt-BR')}</p>
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
                 }) : (
                   <div className="col-span-full text-center py-10 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum exame em andamento</p>
                   </div>
                 )}
              </div>
           </div>

        </div>
      )}

      {/* --- MODO LISTA DE PLANTEL (PADRÃO) --- */}
      {currentList === 'plantel' && (
        <div className="space-y-4">
          {/* ... (Search and filter logic remains the same) ... */}
          <div className="flex gap-2">
             <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <label htmlFor="bird-search" className="sr-only">Pesquisar</label>
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
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3.5 rounded-lg border transition-all flex items-center gap-2 font-semibold text-sm ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden md:inline">Filtros</span>
            </button>

            <button 
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-black text-white rounded-lg shadow-md transition-all font-semibold text-sm"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Nova Ave</span>
            </button>
          </div>

          {/* ... (Filter Content remains the same) ... */}
          {showFilters && (
            <div className="p-6 bg-white border border-slate-100 rounded-[24px] shadow-sm animate-in slide-in-from-top-2 duration-200">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter size={14} /> Filtrar Resultados
                  </h4>
                  {(filterSpecies || filterSex || filterTraining || filterStatus) && (
                    <button 
                      onClick={() => { setFilterSpecies(''); setFilterSex(''); setFilterTraining(''); setFilterStatus(''); }}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Limpar Filtros
                    </button>
                  )}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Espécie</label>
                     <select 
                       value={filterSpecies}
                       onChange={(e) => setFilterSpecies(e.target.value)}
                       className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand"
                     >
                       <option value="">Todas</option>
                       {availableSpecies.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sexo</label>
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
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
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
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status de Canto</label>
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
            <p className="text-rose-600 text-xs">Aqui você pode restaurar aves excluías acidentalmente ou removê-las permanentemente.</p>
            <p className="text-rose-600 text-xs mt-1">Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos automaticamente.</p>
         </div>
      )}
      
      {currentList !== 'sexagem' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredBirds.map((bird) => (
          /* CARTÃO COM ESTRUTURA REVISADA */
          <div 
            key={bird.id} 
            className={`group relative bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${currentList === 'lixeira' ? 'border-red-200 opacity-90' : 'border-slate-200'}`}
          >
            {/* CONTEÚDO DO CARTÃO (ABRE MODAL) */}
            <div 
              className="flex-1 cursor-pointer w-full h-full flex flex-col"
              onClick={() => { 
                if (currentList === 'plantel') {
                  setSelectedBird(bird); setEditingBird(bird); setViewMode('details'); setIsEditing(false); 
                }
              }}
            >
                <div className="relative aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={resolveBirdPhoto(bird)} style={{...getImageFitStyle(resolveBirdPhoto(bird)), width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%'}} className={`object-contain ${currentList === 'lixeira' ? 'grayscale opacity-50' : ''}`} />
                  <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border shadow-sm ${
                      bird.sex === 'Macho' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      bird.sex === 'Fêmea' ? 'bg-pink-50 text-pink-600 border-pink-100' : 
                      'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                      {bird.sex}
                  </div>

                  {currentList === 'lixeira' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
                       <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">Na Lixeira</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-sm truncate pr-2">{bird.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      bird.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' :
                      bird.status === 'Óbito' ? 'bg-red-100 text-red-700' :
                      bird.status === 'Fuga' ? 'bg-orange-100 text-orange-700' :
                      bird.status === 'Vendido' ? 'bg-blue-100 text-blue-700' :
                      bird.status === 'Doado' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {bird.status}
                    </span>
                    {bird.ibamaBaixaPendente && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700 animate-pulse" title="Registro IBAMA Pendente">
                        ⚠️ IBAMA
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{bird.ringNumber}</p>
                    <p className="text-[10px] text-slate-600 font-bold flex items-center gap-1.5">
                       <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                       {bird.species}
                    </p>
                  </div>
                  
                  {currentList === 'plantel' && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      <span className="flex items-center gap-1 text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase" title="Idade aproximada">
                        <Cake size={8} className="text-slate-400" /> {calculateAge(bird.birthDate)}
                      </span>
                      {renderClassificationBadge(bird.classification)}
                      {renderTrainingStatusBadge(bird.songTrainingStatus)}
                      {bird.sexing?.resultDate && (
                        <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                          <TestTube size={8} /> Sexada
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>

            {/* BARRA DE AÇÕES INFERIOR - SEPARADA DO CORPO */}
            <div className={`p-2 border-t flex items-center justify-between gap-2 ${
              currentList === 'lixeira' ? 'bg-rose-50 border-rose-100' : 
              currentList === 'ibama-pendentes' ? 'bg-amber-50 border-amber-100' :
              'bg-slate-50 border-slate-100'
            }`}>
               {currentList === 'ibama-pendentes' ? (
                 <div className="w-full flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setQuickIbamaBird(bird); setShowQuickIbamaModal(true); setQuickIbamaDate(new Date().toISOString().split('T')[0]); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:bg-amber-600 transition-all"
                    >
                      <CheckCircle2 size={12} /> Registrar IBAMA
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedBird(bird); setEditingBird(bird); setViewMode('details'); setIsEditing(true); }}
                      className="flex items-center gap-1 px-3 py-2 text-[10px] font-bold uppercase text-slate-400 hover:text-brand hover:bg-white rounded-lg transition-all"
                    >
                      <Edit size={12} />
                    </button>
                 </div>
               ) : currentList === 'plantel' ? (
                 <div className="w-full flex gap-1 flex-wrap">
                    {bird.status === 'Ativo' && (
                      <>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setQuickStatusBird(bird); setQuickStatusData({newStatus: 'Óbito', date: new Date().toISOString().split('T')[0], createMovement: true, notes: ''}); setShowQuickStatusModal(true); }}
                          className="px-2 py-1.5 text-[9px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all border border-red-200"
                          title="Marcar como Óbito"
                        >
                          🔴 Óbito
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setQuickStatusBird(bird); setQuickStatusData({newStatus: 'Fuga', date: new Date().toISOString().split('T')[0], createMovement: true, notes: ''}); setShowQuickStatusModal(true); }}
                          className="px-2 py-1.5 text-[9px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all border border-orange-200"
                          title="Marcar como Fuga"
                        >
                          🟠 Fuga
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setQuickStatusBird(bird); setQuickStatusData({newStatus: 'Vendido', date: new Date().toISOString().split('T')[0], createMovement: true, notes: ''}); setShowQuickStatusModal(true); }}
                          className="px-2 py-1.5 text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-200"
                          title="Marcar como Vendido"
                        >
                          🔵 Vendido
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setQuickStatusBird(bird); setQuickStatusData({newStatus: 'Doado', date: new Date().toISOString().split('T')[0], createMovement: true, notes: ''}); setShowQuickStatusModal(true); }}
                          className="px-2 py-1.5 text-[9px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all border border-purple-200"
                          title="Marcar como Doado"
                        >
                          🟣 Doado
                        </button>
                      </>
                    )}
                    {bird.ibamaBaixaPendente && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setQuickIbamaBird(bird); setShowQuickIbamaModal(true); setQuickIbamaDate(new Date().toISOString().split('T')[0]); }}
                        className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all border border-amber-200"
                      >
                        ⚡ IBAMA
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(bird.id); }}
                      className="ml-auto flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                 </div>
               ) : currentList === 'histórico' ? (
                 <div className="w-full flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => handleRestoreToActive(e, bird.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:bg-emerald-600 transition-all"
                    >
                      <RefreshCcw size={12} /> Restaurar
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(bird.id); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-rose-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:bg-rose-600 transition-all"
                    >
                      <Trash2 size={12} /> Deletar
                    </button>
                 </div>
               ) : (
                 <div className="w-full flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => handleRestoreClick(e, bird.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:bg-emerald-600 transition-all"
                    >
                      <RefreshCcw size={12} /> Restaurar
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handlePermanentDelete(e, bird.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-rose-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:bg-rose-600 transition-all"
                    >
                      <X size={12} /> Apagar
                    </button>
                 </div>
               )}
            </div>
          </div>
        ))}

        {currentList === 'plantel' && (
          <button 
            onClick={handleOpenAddModal}
            className="h-full min-h-[250px] bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-slate-400 hover:text-blue-600 cursor-pointer"
          >
            <Plus size={32} />
            <span className="text-xs font-bold uppercase tracking-widest">Adicionar</span>
          </button>
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
                    <button onClick={() => setViewMode('details')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'details' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Ficha Técnica</button>
                    <button onClick={() => setViewMode('pedigree')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'pedigree' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Árvore Genealógica</button>
                  </>
                ) : (
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Edit size={18} /> Editando: {selectedBird.name}
                  </h3>
                )}
              </div>
              <div className="flex gap-2">
                 <button onClick={() => { deleteBird(selectedBird.id); setSelectedBird(null); }} className="p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Mover para Lixeira">
                    <Trash2 size={20} />
                 </button>
                 <button onClick={() => setSelectedBird(null)} className="p-3 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-600">
                    <X size={20} />
                 </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 bg-[#FBFCFD]">
               {isEditing ? (
                 <form onSubmit={handleUpdateBird} className="space-y-6">
                    <div className="flex border-b border-slate-100 mb-6">
                       <button type="button" onClick={() => setActiveTab('dados')} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'dados' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Dados Cadastrais</button>
                       <button type="button" onClick={() => setActiveTab('genealogia')} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'genealogia' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Genealogia</button>
                       <button type="button" onClick={() => setActiveTab('docs')} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'docs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Galeria & Docs</button>
                    </div>

                    {activeTab === 'dados' && (
                       <div className="space-y-6 animate-in fade-in duration-300">
                           
                           {/* OPCOES DE FOTO */}
                           <div className="mb-6">
                              {renderPhotoPicker(editingBird, true)}
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-label">Nome / Identificação</label>
                                  <input required className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={editingBird.name || ''} onChange={e => setEditingBird({...editingBird, name: e.target.value})} />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-label">Anilha</label>
                                  <input required className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={editingBird.ringNumber || ''} onChange={e => setEditingBird({...editingBird, ringNumber: e.target.value})} />
                               </div>
                           </div>

                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                               {/* ... Campos de especie, sexo, data ... */}
                               <div className="space-y-2">
                                  <label className="text-label">Espécie</label>
                                  <div className="space-y-2">
                                    <select 
                                      className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none" 
                                      value={BRAZILIAN_SPECIES.includes(editingBird.species || '') ? editingBird.species : 'custom'} 
                                      onChange={e => {
                                        if (e.target.value === 'custom') {
                                          updateEditingBirdWithDefaultPhoto({species: ''});
                                        } else {
                                          updateEditingBirdWithDefaultPhoto({species: e.target.value});
                                        }
                                      }}
                                    >
                                      {BRAZILIAN_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                                      <option value="custom">Outra (Digitar Nova)...</option>
                                    </select>
                                    {!BRAZILIAN_SPECIES.includes(editingBird.species || '') && (
                                      <input 
                                        type="text" 
                                        placeholder="Digite o nome da espécie..." 
                                        className="w-full p-4 bg-slate-50 border border-brand/20 rounded-2xl font-bold text-brand outline-none focus:border-brand animate-in fade-in"
                                        value={editingBird.species || ''}
                                        onChange={e => updateEditingBirdWithDefaultPhoto({species: e.target.value})}
                                        autoFocus
                                      />
                                    )}
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-label">Sexo</label>
                                  <select className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none" value={editingBird.sex} onChange={e => updateEditingBirdWithDefaultPhoto({...editingBird, sex: e.target.value as any})}>
                                    <option value="Macho">Macho</option>
                                    <option value="Fêmea">Fêmea</option>
                                    <option value="Indeterminado">Indeterminado</option>
                                  </select>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-label">Data Nasc.</label>
                                  <input type="date" className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={editingBird.birthDate} onChange={e => updateEditingBirdWithDefaultPhoto({...editingBird, birthDate: e.target.value})} />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-label">Mutação / Cor</label>
                                  <input className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={editingBird.colorMutation || ''} onChange={e => setEditingBird({...editingBird, colorMutation: e.target.value})} />
                               </div>
                           </div>

                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-label">Classificação</label>
                                 <select className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none" value={editingBird.classification} onChange={e => setEditingBird({...editingBird, classification: e.target.value as any})}>
                                   <option value="Não Definido">Não Definido</option>
                                   <option value="Galador">Galador</option>
                                   <option value="Pássaro de Canto">Pássaro de Canto</option>
                                   <option value="Ambos">Ambos</option>
                                 </select>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-label">Status</label>
                                 <select className="w-full p-3.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 appearance-none" value={editingBird.status} onChange={e => setEditingBird({...editingBird, status: e.target.value as any})}>
                                   <option value="Ativo">Ativo</option>
                                   <option value="Óbito">Óbito</option>
                                   <option value="Fuga">Fuga</option>
                                   <option value="Vendido">Vendido</option>
                                   <option value="Doado">Doado</option>
                                 </select>
                              </div>
                          </div>

                          {/* Controle de Registro IBAMA */}
                          {(editingBird.status === 'Óbito' || editingBird.status === 'Fuga' || editingBird.status === 'Vendido' || editingBird.status === 'Doado') && (
                            <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-4">
                              <div className="flex items-center gap-2 text-amber-800">
                                <Zap size={18} />
                                <h4 className="text-sm font-semibold">Controle de Registro IBAMA</h4>
                              </div>
                              <div className="p-3 bg-white border border-amber-200 rounded-xl mb-4">
                                <p className="text-xs font-bold text-amber-800">
                                  {editingBird.status === 'Óbito' && '⚠️ Óbito: Necessário dar baixa no sistema IBAMA'}
                                  {editingBird.status === 'Fuga' && '⚠️ Fuga: Necessário registrar a fuga no sistema IBAMA'}
                                  {editingBird.status === 'Vendido' && '⚠️ Venda: Necessário registrar a transferência no IBAMA (com SISPASS do comprador)'}
                                  {editingBird.status === 'Doado' && '⚠️ Doação: Necessário registrar a doação no IBAMA (com SISPASS do destinatário)'}
                                </p>
                              </div>
                              <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!editingBird.ibamaBaixaPendente} 
                                    onChange={e => setEditingBird({...editingBird, ibamaBaixaPendente: !e.target.checked, ibamaBaixaData: e.target.checked ? new Date().toISOString().split('T')[0] : undefined})}
                                    className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  <span className="text-sm font-bold text-amber-800">Registro IBAMA concluído</span>
                                </label>
                                {!editingBird.ibamaBaixaPendente && (
                                  <div className="space-y-2 animate-in fade-in">
                                    <label className="text-label text-amber-800">Data do Registro</label>
                                    <input 
                                      type="date" 
                                      className="w-full p-3.5 bg-white border border-amber-300 rounded-lg font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500" 
                                      value={editingBird.ibamaBaixaData || ''} 
                                      onChange={e => setEditingBird({...editingBird, ibamaBaixaData: e.target.value})} 
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
                         {/* ... (Existing Genealogy Code) ... */}
                         <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                            <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Dna size={16} /> Filiação Paterna
                            </h4>
                            <div className="flex gap-4 mb-4">
                               <button type="button" onClick={() => setGenealogyMode({...genealogyMode, father: 'plantel'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.father === 'plantel' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-400'}`}>Do Plantel</button>
                               <button type="button" onClick={() => setGenealogyMode({...genealogyMode, father: 'manual'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.father === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-400'}`}>Externo / Manual</button>
                            </div>
                            
                            {genealogyMode.father === 'plantel' ? (
                              <select className="w-full p-4 bg-white border border-blue-200 rounded-2xl font-bold text-slate-700 outline-none" value={editingBird.fatherId || ''} onChange={e => setEditingBird({...editingBird, fatherId: e.target.value})}>
                                <option value="">Selecione o Pai...</option>
                                {males.filter(m => m.id !== editingBird.id).map(m => <option key={m.id} value={m.id}>{m.name} - {m.ringNumber}</option>)}
                              </select>
                            ) : (
                              <div className="space-y-3">
                                 <input placeholder="Nome do Pai" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.f} onChange={e => setManualAncestorsForm({...manualAncestorsForm, f: e.target.value})} />
                                 <div className="grid grid-cols-2 gap-3">
                                   <input placeholder="Avô Paterno" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.ff} onChange={e => setManualAncestorsForm({...manualAncestorsForm, ff: e.target.value})} />
                                   <input placeholder="Avó Paterna" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.fm} onChange={e => setManualAncestorsForm({...manualAncestorsForm, fm: e.target.value})} />
                                 </div>
                              </div>
                            )}
                         </div>

                         <div className="p-6 bg-pink-50 rounded-3xl border border-pink-100">
                            <h4 className="text-sm font-black text-pink-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Dna size={16} /> Filiação Materna
                            </h4>
                            <div className="flex gap-4 mb-4">
                               <button type="button" onClick={() => setGenealogyMode({...genealogyMode, mother: 'plantel'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.mother === 'plantel' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-pink-400'}`}>Do Plantel</button>
                               <button type="button" onClick={() => setGenealogyMode({...genealogyMode, mother: 'manual'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.mother === 'manual' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-pink-400'}`}>Externa / Manual</button>
                            </div>
                            
                            {genealogyMode.mother === 'plantel' ? (
                              <select className="w-full p-4 bg-white border border-pink-200 rounded-2xl font-bold text-slate-700 outline-none" value={editingBird.motherId || ''} onChange={e => setEditingBird({...editingBird, motherId: e.target.value})}>
                                <option value="">Selecione a Mãe...</option>
                                {females.filter(f => f.id !== editingBird.id).map(f => <option key={f.id} value={f.id}>{f.name} - {f.ringNumber}</option>)}
                              </select>
                            ) : (
                              <div className="space-y-3">
                                 <input placeholder="Nome da Mãe" className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.m} onChange={e => setManualAncestorsForm({...manualAncestorsForm, m: e.target.value})} />
                                 <div className="grid grid-cols-2 gap-3">
                                   <input placeholder="Avô Materno" className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.mf} onChange={e => setManualAncestorsForm({...manualAncestorsForm, mf: e.target.value})} />
                                   <input placeholder="Avó Materna" className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.mm} onChange={e => setManualAncestorsForm({...manualAncestorsForm, mm: e.target.value})} />
                                 </div>
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
                                        onChange={e => setNewDocForm({...newDocForm, title: e.target.value})} 
                                    />
                                    <div className="flex gap-2">
                                        <input 
                                            type="date" 
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                                            value={newDocForm.date} 
                                            onChange={e => setNewDocForm({...newDocForm, date: e.target.value})} 
                                        />
                                        <select 
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                            value={newDocForm.type}
                                            onChange={e => setNewDocForm({...newDocForm, type: e.target.value as any})}
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
                                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-2"><CheckCircle2 size={14}/> Arquivo Selecionado</span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><Upload size={14}/> Anexar Arquivo</span>
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
                                                    reader.onloadend = () => setNewDocForm({...newDocForm, url: reader.result as string});
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
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Documentos Arquivados</h4>
                                {editingBird.documents && editingBird.documents.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {editingBird.documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${doc.type === 'Exame' ? 'bg-blue-50 text-blue-500' : doc.type === 'Foto' ? 'bg-purple-50 text-purple-500' : 'bg-slate-100 text-slate-500'}`}>
                                                        {doc.type === 'Exame' ? <FileText size={20} /> : doc.type === 'Foto' ? <ImageIcon size={20} /> : <Paperclip size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{doc.title}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(doc.date).toLocaleDateString('pt-BR')} ÔÇó {doc.type}</p>
                                                        {doc.notes && <p className="text-[10px] text-slate-500 mt-1 max-w-xs truncate">{doc.notes}</p>}
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
                                        <p className="text-xs font-bold uppercase tracking-widest">Pasta Vazia</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                        <button type="button" onClick={() => { setIsEditing(false); setEditingBird(selectedBird); }} className="w-full py-3.5 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors">
                          Cancelar
                        </button>
                        <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-black transition-colors">
                          <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                 </form>
               ) : (
                 viewMode === 'details' ? (
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
                          <button onClick={() => { setIsEditing(true); setEditingBird(selectedBird); setActiveTab('dados'); }} className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all">
                            <Edit size={18} /> Editar Dados
                          </button>
                          {state.settings?.plan === 'Profissional' && (
                            <BirdCardPrint 
                              bird={selectedBird}
                              breederName={state.settings?.breederName || 'AviGestão'}
                              breederLogo={state.settings?.logoUrl}
                              sispassNumber={state.settings?.sispassNumber}
                            />
                          )}
                        </div>
                     </div>
                     <div className="lg:col-span-8 space-y-8">
                         {/* ... (Existing Details Card) ... */}
                         <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                            <div className="flex justify-between">
                              <h3 className="text-xl font-black text-slate-800">Dados Básicos</h3>
                               <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${selectedBird.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{selectedBird.status}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</p>
                                 <p className="text-lg font-bold text-slate-800 mt-1">{selectedBird.name}</p>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anilha</p>
                                 <p className="text-lg font-bold text-slate-800 mt-1">{selectedBird.ringNumber}</p>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espécie</p>
                                 <p className="text-sm font-bold text-slate-800 mt-1">{selectedBird.species}</p>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sexo</p>
                                 <p className="text-sm font-bold text-slate-800 mt-1">{selectedBird.sex}</p>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idade</p>
                                 <p className="text-sm font-bold text-slate-800 mt-1">{calculateAge(selectedBird.birthDate)}</p>
                               </div>
                            </div>
                         </div>

                         {/* Seção Resumida de Documentos (Visualização Rápida) */}
                         <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                               <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                 <FolderOpen size={16} className="text-brand" /> Documentos Recentes
                               </h3>
                               <button onClick={() => { setIsEditing(true); setEditingBird(selectedBird); setActiveTab('docs'); }} className="text-[10px] font-bold text-brand hover:underline">
                                 Ver Todos ({selectedBird.documents?.length || 0})
                               </button>
                            </div>
                            
                            {selectedBird.documents && selectedBird.documents.length > 0 ? (
                               <div className="flex gap-4 overflow-x-auto pb-2">
                                  {selectedBird.documents.slice(0, 3).map(doc => (
                                     <div key={doc.id} className="min-w-[160px] p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center text-center gap-2">
                                        <div className={`p-2 rounded-lg ${doc.type === 'Exame' ? 'bg-blue-100 text-blue-500' : 'bg-slate-200 text-slate-500'}`}>
                                           {doc.type === 'Exame' ? <TestTube size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div>
                                           <p className="text-[10px] font-bold text-slate-700 truncate w-full max-w-[120px]">{doc.title}</p>
                                           <p className="text-[8px] font-bold text-slate-400">{new Date(doc.date).toLocaleDateString('pt-BR')}</p>
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
                                  {selectedBirdMedHistory.slice(0, 5).map(app => (
                                     <div key={app.id} className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <div className="min-w-0">
                                           <p className="text-xs font-bold text-slate-800 truncate">{getMedicationName(app.medicationId)}</p>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                             {new Date(app.date).toLocaleDateString('pt-BR')} ÔÇó {app.dosage}
                                           </p>
                                           {app.notes && <p className="text-[10px] text-slate-500 mt-1 truncate">{app.notes}</p>}
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-500 uppercase">Aplicação</span>
                                     </div>
                                  ))}
                                  {selectedBirdMedHistory.length > 5 && (
                                     <p className="text-[10px] text-slate-400 font-bold">+{selectedBirdMedHistory.length - 5} aplicações</p>
                                  )}
                               </div>
                            ) : (
                               <p className="text-xs text-slate-400 italic">Nenhuma aplicação registrada para esta ave.</p>
                            )}
                         </div>

                         {/* NOVA SEÇÃO: Gestão Rápida de Status */}
                         <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner space-y-6">
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                              <Zap size={16} className="text-amber-500" /> Gestão Rápida
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Classificação</label>
                                  <div className="relative">
                                    <select 
                                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 appearance-none outline-none focus:border-brand shadow-sm cursor-pointer"
                                      value={selectedBird.classification}
                                      onChange={(e) => handleQuickFieldUpdate(selectedBird.id, 'classification', e.target.value)}
                                    >
                                      <option value="Não Definido">Não Definido</option>
                                      <option value="Galador">Galador</option>
                                      <option value="Pássaro de Canto">Pássaro de Canto</option>
                                      <option value="Ambos">Ambos</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                      <ChevronDown size={16} />
                                    </div>
                                  </div>
                               </div>
                               
                               <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status de Canto</label>
                                  <div className="relative">
                                    <select 
                                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 appearance-none outline-none focus:border-brand shadow-sm cursor-pointer"
                                      value={selectedBird.songTrainingStatus}
                                      onChange={(e) => handleQuickFieldUpdate(selectedBird.id, 'songTrainingStatus', e.target.value)}
                                    >
                                      <option value="Não Iniciado">Não Iniciado</option>
                                      <option value="Pardo (Aprendizado)">Pardo (Aprendizado)</option>
                                      <option value="Em Encarte">Em Encarte / Andamento</option>
                                      <option value="Fixado">Mestre (Fixado)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                      <ChevronDown size={16} />
                                    </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                     </div>
                  </div>
                 ) : (
                   /* ... (Genealogy Tree View) ... */
                   <div className="flex flex-col lg:flex-row gap-12">
                       <div className="w-full lg:w-72 space-y-6 no-print">
                          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm"><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Informações</h4></div>
                          <button onClick={() => window.print()} className="w-full py-4 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">Imprimir</button>
                       </div>
                       <div id="printable-pedigree" className="flex-1 bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                          <PedigreeTree bird={selectedBird} allBirds={state.birds} settings={state.settings} />
                       </div>
                   </div>
                 )
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
                <p className="text-slate-400 text-xs font-medium mt-1">Cadastro completo e detalhado.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSaveBird} className="flex-1 overflow-y-auto bg-[#FBFCFD]">
               {/* ... (Tabs de Nova Ave e Conteúdo de Dados/Genealogia - inalterado) ... */}
               <div className="flex border-b border-slate-100 px-8 bg-white sticky top-0 z-10">
                  <button type="button" onClick={() => setActiveTab('dados')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'dados' ? 'border-brand text-brand' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Dados Cadastrais</button>
                  <button type="button" onClick={() => setActiveTab('genealogia')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'genealogia' ? 'border-brand text-brand' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Genealogia</button>
               </div>

               <div className="p-8">
                 {activeTab === 'dados' && (
                   <div className="space-y-6">
                      
                      {/* OPCOES DE FOTO */}
                      <div className="mb-6">
                         {renderPhotoPicker(newBird, false)}
                      </div>
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
                             <input required placeholder="Ex: Mestre Cantor" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand" value={newBird.name || ''} onChange={e => setNewBird({...newBird, name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                               <span>Anilha</span>
                               <div className="group relative cursor-help">
                                 <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                                   Número da anilha ou SISPASS
                                 </div>
                               </div>
                             </label>
                             <input required placeholder="Ex: SISPASS 123456" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand" value={newBird.ringNumber || ''} onChange={e => setNewBird({...newBird, ringNumber: e.target.value})} />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          {/* ... Selects de Especie, Sexo, Data ... */}
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Espécie</label>
                             <div className="space-y-2">
                              <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none" value={BRAZILIAN_SPECIES.includes(newBird.species || '') ? newBird.species : 'custom'} onChange={e => { if (e.target.value === 'custom') { updateNewBirdWithDefaultPhoto({ species: '' }); } else { updateNewBirdWithDefaultPhoto({ species: e.target.value }); } }}> {BRAZILIAN_SPECIES.map(s => <option key={s} value={s}>{s}</option>)} <option value="custom">Outra (Digitar Nova)...</option> </select>
                               {(!BRAZILIAN_SPECIES.includes(newBird.species || '')) && (<input type="text" placeholder="Digite o nome da nova espécie" className="w-full p-4 bg-slate-50 border border-brand/20 rounded-2xl font-bold text-brand outline-none focus:border-brand animate-in fade-in" value={newBird.species || ''} onChange={e => updateNewBirdWithDefaultPhoto({ species: e.target.value })} autoFocus />)}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sexo</label>
                             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none" value={newBird.sex} onChange={e => updateNewBirdWithDefaultPhoto({ sex: e.target.value as Sex })}> <option value="Macho">Macho</option> <option value="Fêmea">Fêmea</option> <option value="Indeterminado">Indeterminado</option> </select>
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Nasc.</label>
                             <input type="date" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand" value={newBird.birthDate} onChange={e => setNewBird({...newBird, birthDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mutação / Cor</label>
                             <input placeholder="Ex: Clássico" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand" value={newBird.colorMutation || ''} onChange={e => setNewBird({...newBird, colorMutation: e.target.value})} />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Classificação</label>
                             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none" value={newBird.classification} onChange={e => setNewBird({...newBird, classification: e.target.value as any})}> <option value="Não Definido">Não Definido</option> <option value="Galador">Galador</option> <option value="Pássaro de Canto">Pássaro de Canto</option> <option value="Ambos">Ambos</option> </select>
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none" value={newBird.status} onChange={e => setNewBird({...newBird, status: e.target.value as any})}> <option value="Ativo">Ativo</option> <option value="Vendido">Vendido</option> <option value="Falecido">Falecido</option> <option value="Transferido">Transferido</option> </select>
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fase de Canto</label>
                             <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand appearance-none" value={newBird.songTrainingStatus} onChange={e => setNewBird({...newBird, songTrainingStatus: e.target.value as any})}> <option value="Não Iniciado">Não Iniciado</option> <option value="Pardo (Aprendizado)">Pardo (Aprendizado)</option> <option value="Em Encarte">Em Encarte / Andamento</option> <option value="Fixado">Mestre (Fixado)</option> </select>
                          </div>
                      </div>
                   </div>
                 )}

                 {activeTab === 'genealogia' && (
                   /* ... (Genealogy in New Modal - same as previous) ... */
                   <div className="space-y-8">
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                         <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2"> <Dna size={16} /> Filiação Paterna </h4>
                         <div className="flex gap-4 mb-4"> <button type="button" onClick={() => setGenealogyMode({...genealogyMode, father: 'plantel'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.father === 'plantel' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-400'}`}>Do Plantel</button> <button type="button" onClick={() => setGenealogyMode({...genealogyMode, father: 'manual'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.father === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-400'}`}>Externo / Manual</button> </div>
                         {genealogyMode.father === 'plantel' ? ( <select className="w-full p-4 bg-white border border-blue-200 rounded-2xl font-bold text-slate-700 outline-none" value={newBird.fatherId || ''} onChange={e => setNewBird({...newBird, fatherId: e.target.value})}> <option value="">Selecione o Pai...</option> {males.map(m => <option key={m.id} value={m.id}>{m.name} - {m.ringNumber}</option>)} </select> ) : ( <div className="space-y-3"> <input placeholder="Nome do Pai" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.f} onChange={e => setManualAncestorsForm({...manualAncestorsForm, f: e.target.value})} /> <div className="grid grid-cols-2 gap-3"> <input placeholder="Avô Paterno" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.ff} onChange={e => setManualAncestorsForm({...manualAncestorsForm, ff: e.target.value})} /> <input placeholder="Avó Paterna" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.fm} onChange={e => setManualAncestorsForm({...manualAncestorsForm, fm: e.target.value})} /> </div> </div> )}
                      </div>
                      <div className="p-6 bg-pink-50 rounded-3xl border border-pink-100">
                         <h4 className="text-sm font-black text-pink-800 uppercase tracking-widest mb-4 flex items-center gap-2"> <Dna size={16} /> Filiação Materna </h4>
                         <div className="flex gap-4 mb-4"> <button type="button" onClick={() => setGenealogyMode({...genealogyMode, mother: 'plantel'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.mother === 'plantel' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-pink-400'}`}>Do Plantel</button> <button type="button" onClick={() => setGenealogyMode({...genealogyMode, mother: 'manual'})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${genealogyMode.mother === 'manual' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white text-pink-400'}`}>Externa / Manual</button> </div>
                         {genealogyMode.mother === 'plantel' ? ( <select className="w-full p-4 bg-white border border-pink-200 rounded-2xl font-bold text-slate-700 outline-none" value={newBird.motherId || ''} onChange={e => setNewBird({...newBird, motherId: e.target.value})}> <option value="">Selecione a Mãe...</option> {females.map(f => <option key={f.id} value={f.id}>{f.name} - {f.ringNumber}</option>)} </select> ) : ( <div className="space-y-3"> <input placeholder="Nome da Mãe" className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.m} onChange={e => setManualAncestorsForm({...manualAncestorsForm, m: e.target.value})} /> <div className="grid grid-cols-2 gap-3"> <input placeholder="Avô Materno" className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.mf} onChange={e => setManualAncestorsForm({...manualAncestorsForm, mf: e.target.value})} /> <input placeholder="Avó Materna" className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs font-bold" value={manualAncestorsForm.mm} onChange={e => setManualAncestorsForm({...manualAncestorsForm, mm: e.target.value})} /> </div> </div> )}
                      </div>
                   </div>
                 )}
               </div>

               <div className="p-8 pt-0 mt-4 border-t border-slate-50 bg-white sticky bottom-0 z-10">
                  <button type="submit" className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all mt-4">
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
               <button onClick={() => setShowResultModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                   <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><TestTube size={24} /></div>
                   <div>
                      <p className="text-xs font-bold text-blue-800">Resultado Definitivo</p>
                      <p className="text-[10px] text-blue-600">O sexo da ave será atualizado e o arquivo salvo em documentos.</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => setResultForm({...resultForm, sex: 'Macho'})}
                     className={`py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${resultForm.sex === 'Macho' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                   >
                      <span className="font-black text-sm uppercase">Macho</span>
                   </button>
                   <button 
                     onClick={() => setResultForm({...resultForm, sex: 'Fêmea'})}
                     className={`py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${resultForm.sex === 'Fêmea' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                   >
                      <span className="font-black text-sm uppercase">Fêmea</span>
                   </button>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocolo do Exame</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                     value={resultForm.protocol}
                     onChange={(e) => setResultForm({...resultForm, protocol: e.target.value})}
                   />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data do Laudo</label>
                   <input 
                     type="date" 
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                     value={resultForm.resultDate}
                     onChange={(e) => setResultForm({...resultForm, resultDate: e.target.value})}
                   />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anexar PDF/Imagem</label>
                   <div 
                     onClick={() => resultInputRef.current?.click()}
                     className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all"
                   >
                      {resultForm.attachmentUrl ? (
                         <span className="text-xs font-bold text-emerald-600 flex items-center gap-2"><CheckCircle2 size={16}/> Arquivo Pronto</span>
                      ) : (
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Upload size={16} /> Selecionar Arquivo</span>
                      )}
                   </div>
                   <input type="file" ref={resultInputRef} className="hidden" onChange={handleResultFileUpload} />
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

                <button onClick={handleSaveResult} className="w-full py-4 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
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
               <button onClick={() => setShowSendLabModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
             </div>
             <div className="p-8 space-y-6">
                <p className="text-sm text-slate-500">Você está enviando <strong>{selectedForSexing.length} amostras</strong> para sexagem.</p>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Laboratório</label>
                   <input 
                     type="text" 
                     placeholder="Ex: Ampligen, Unigen..."
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                     value={labForm.laboratory}
                     onChange={(e) => setLabForm({...labForm, laboratory: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data do Envio</label>
                   <input 
                     type="date" 
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                     value={labForm.sentDate}
                     onChange={(e) => setLabForm({...labForm, sentDate: e.target.value})}
                   />
                </div>
                <button onClick={handleSendToLab} className="w-full py-4 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
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
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Limite Atingido!</h3>
              <p className="text-slate-500 font-medium mt-4 max-w-sm mx-auto leading-relaxed">
                {state.settings.plan === 'Básico' && state.birds.length >= MAX_FREE_BIRDS && !isAdmin
                  ? `Você atingiu o limite de ${MAX_FREE_BIRDS} aves do plano básico. Migre para o profissional e tenha gestão ilimitada.`
                  : "O upload de fotos personalizadas é exclusivo do Plano Profissional."
                }
              </p>
              <div className="mt-10 space-y-3">
                <button className="w-full py-5 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.02] transition-all">
                  Assinar Plano PRO
                </button>
                <button onClick={() => setShowUpgradeModal(false)} className="w-full py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl">
                  Depois eu decido
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Registro Rápido IBAMA */}
      {showQuickIbamaModal && quickIbamaBird && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-8 bg-gradient-to-r from-amber-500 to-orange-500">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                       <Zap size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-xl font-black text-white tracking-tight">Registrar IBAMA</h3>
                       <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{quickIbamaBird.status}</p>
                    </div>
                    <button onClick={() => setShowQuickIbamaModal(false)} className="text-white/60 hover:text-white transition-colors">
                       <X size={24} />
                    </button>
                 </div>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Ave</p>
                    <p className="text-lg font-black text-slate-800">{quickIbamaBird.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{quickIbamaBird.ringNumber}</p>
                 </div>

                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Instruções</p>
                    <p className="text-xs text-amber-700 font-bold leading-relaxed">
                       {quickIbamaBird.status === 'Óbito' && 'Acesse o sistema IBAMA e registre a baixa do animal falecido.'}
                       {quickIbamaBird.status === 'Fuga' && 'Acesse o sistema IBAMA e registre o evento de fuga.'}
                       {quickIbamaBird.status === 'Vendido' && 'Acesse o sistema IBAMA e registre a transferência com o SISPASS do comprador.'}
                       {quickIbamaBird.status === 'Doado' && 'Acesse o sistema IBAMA e registre a doação com o SISPASS do destinatário.'}
                    </p>
                 </div>

                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Registro</label>
                    <input 
                       type="date" 
                       className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-500" 
                       value={quickIbamaDate}
                       onChange={(e) => setQuickIbamaDate(e.target.value)}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
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
           <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
              <div className={`p-8 bg-gradient-to-r ${
                quickStatusData.newStatus === 'Óbito' ? 'from-red-500 to-rose-500' :
                quickStatusData.newStatus === 'Fuga' ? 'from-orange-500 to-amber-500' :
                quickStatusData.newStatus === 'Vendido' ? 'from-blue-500 to-cyan-500' :
                'from-purple-500 to-pink-500'
              }`}>
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                       {quickStatusData.newStatus === 'Óbito' && '🔴'}
                       {quickStatusData.newStatus === 'Fuga' && '🟠'}
                       {quickStatusData.newStatus === 'Vendido' && '🔵'}
                       {quickStatusData.newStatus === 'Doado' && '🟣'}
                    </div>
                    <div className="flex-1">
                       <h3 className="text-xl font-black text-white tracking-tight">Marcar como {quickStatusData.newStatus}</h3>
                       <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{quickStatusBird.name}</p>
                    </div>
                    <button onClick={() => setShowQuickStatusModal(false)} className="text-white/60 hover:text-white transition-colors">
                       <X size={24} />
                    </button>
                 </div>
              </div>

              <div className="p-8 space-y-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Ave</p>
                    <p className="text-lg font-black text-slate-800">{quickStatusBird.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{quickStatusBird.ringNumber}</p>
                 </div>

                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Evento</label>
                    <input 
                       type="date" 
                       className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand" 
                       value={quickStatusData.date}
                       onChange={(e) => setQuickStatusData({...quickStatusData, date: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas (Opcional)</label>
                    <textarea 
                       className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand min-h-20 resize-none" 
                       placeholder="Ex: Detalhes sobre o evento..."
                       value={quickStatusData.notes}
                       onChange={(e) => setQuickStatusData({...quickStatusData, notes: e.target.value})}
                    />
                 </div>

                 <label className="flex items-center gap-3 cursor-pointer p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-colors">
                    <input 
                       type="checkbox" 
                       checked={quickStatusData.createMovement}
                       onChange={(e) => setQuickStatusData({...quickStatusData, createMovement: e.target.checked})}
                       className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-blue-800">Criar movimentação também</span>
                 </label>

                 <div className="grid grid-cols-2 gap-3">
                    <button 
                       onClick={() => setShowQuickStatusModal(false)}
                       className="py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                       Cancelar
                    </button>
                    <button 
                       onClick={handleQuickStatusConfirm}
                       className={`py-3 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all ${
                         quickStatusData.newStatus === 'Óbito' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                         quickStatusData.newStatus === 'Fuga' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' :
                         quickStatusData.newStatus === 'Vendido' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-200' :
                         'bg-purple-500 hover:bg-purple-600 shadow-purple-200'
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
        onCancel={() => setDeleteConfirm({ isOpen: false, birdId: '', birdName: '', isPermanent: false })}
        confirmText="Sim, Mover"
        cancelText="Cancelar"
        isDangerous={false}
        isLoading={isDeletingBird}
      />
    </div>
  );
};

export default BirdManager;

