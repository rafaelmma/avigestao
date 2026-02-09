/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  Trophy,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  MapPin,
  User,
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import WizardShell from '../components/WizardShell';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import PageHeader from '../components/ui/PageHeader';
import {
  computeStageScore,
  computeTotalScore,
  ScoreDetail,
  ScoreDetailsByStage,
} from '../lib/scoring/brasilia';

interface Tournament {
  id?: string;
  name: string;
  description: string;
  startDate: any;
  endDate: any;
  species: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  createdBy: string;
  createdAt?: any;
  maxParticipants: number;
  rules?: string;
  address?: string;
  city?: string;
  state?: string;
  organizer?: string;
  numberOfStages?: number;
  categories?: string[];
  stages?: StageInfo[];
}

interface StageInfo {
  index: number;
  date?: any;
  address?: string;
  city?: string;
  state?: string;
}

interface Inscription {
  id?: string;
  tournamentId: string;
  userId: string;
  userName: string;
  participantName?: string;
  breederName?: string | null;
  participantEmail?: string | null;
  birdName: string;
  birdId: string;
  birdSpecies: string;
  registeredAt: any;
  status: 'pending' | 'registered' | 'disqualified' | 'completed';
  category?: string;
  placement?: number;
  score?: number;
  totalScore?: number;
  championshipPoints?: number;
  notes?: Record<number, number>; // notas por etapa: {1: 8.5, 2: 9.0}
  scoreDetails?: ScoreDetailsByStage; // detalhes por etapa (base e deduções)
  stageAttendance?: Record<number, 'present' | 'absent' | 'not-set'>;
}

interface BirdLite {
  id: string;
  name: string;
  species: string;
}

const BRAZILIAN_SPECIES = [
  'Curió',
  'Bicudo',
  'Trinca Ferro',
  'Canário da Terra',
  'Azulão',
  'Coleiro',
  'Sabiá',
];

const CATEGORY_OPTIONS = [
  'Pardo - Repetição',
  'Pardo - Não repetição',
  'Preto - Repetição',
  'Preto - Não repetição',
];

const PLACEMENT_POINTS = [15, 13, 11, 9, 7, 5, 4, 3, 2, 1];

// Helper para converter data do Firebase
const parsePtBrDateTime = (value: string): Date | null => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, ss] = match;
  const parsed = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    ss ? Number(ss) : 0,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const convertToDate = (date: any): Date => {
  if (date instanceof Date) return date;
  if (date?.toDate) return date.toDate();
  if (typeof date === 'string') {
    const parsedPtBr = parsePtBrDateTime(date);
    if (parsedPtBr) return parsedPtBr;
  }
  return new Date(date);
};

// Helper para converter para string local (datetime-local)
const toLocalInputValue = (date: any): string => {
  const d = convertToDate(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const formatDateTime = (date: any): string => {
  if (!date) return '--';
  return convertToDate(date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const buildMapsUrl = (address?: string, city?: string, state?: string) => {
  const query = [address, city, state].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const normalizeStages = (count: number, stages: StageInfo[] = []): StageInfo[] => {
  const desired = Math.max(1, count || 1);
  const normalized: StageInfo[] = [];
  for (let i = 1; i <= desired; i++) {
    const existing = stages.find((s) => s.index === i);
    normalized.push(existing || { index: i });
  }
  return normalized;
};

const TournamentManager: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [enrollTournament, setEnrollTournament] = useState<Tournament | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [inscriptionSearch, setInscriptionSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'inscriptions'>('list');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userBirds, setUserBirds] = useState<BirdLite[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedBirdId, setSelectedBirdId] = useState('');
  const [enrollCategory, setEnrollCategory] = useState(CATEGORY_OPTIONS[0]);
  const [scoreCategory, setScoreCategory] = useState(CATEGORY_OPTIONS[0]);
  const [participantName, setParticipantName] = useState('');
  const [breederName, setBreederName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'enrolling' | 'success' | 'error'>(
    'idle',
  );
  const [enrollMessage, setEnrollMessage] = useState('');

  const [scoreDetailModalOpen, setScoreDetailModalOpen] = useState(false);
  const [scoreDetailStage, setScoreDetailStage] = useState(1);
  const [scoreDetailInscription, setScoreDetailInscription] = useState<Inscription | null>(null);
  const [scoreDetailDraft, setScoreDetailDraft] = useState<ScoreDetail>({});

  const [formData, setFormData] = useState<Tournament>({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    species: [],
    status: 'upcoming',
    createdBy: 'admin',
    maxParticipants: 50,
    rules: '',
    address: '',
    city: '',
    state: '',
    organizer: '',
    numberOfStages: 1,
    stages: [{ index: 1 }],
  });

  // Carregar torneios
  useEffect(() => {
    loadTournaments();
  }, []);

  const filteredTournamentsList = tournaments.filter((t) => {
    if (!tournamentSearch) return true;
    const q = tournamentSearch.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.city || '').toLowerCase().includes(q) ||
      (t.organizer || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadUserBirds(currentUserId);
    } else {
      setUserBirds([]);
    }
  }, [currentUserId]);

  const loadTournaments = async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      })) as Tournament[];
      setTournaments(data);
    } catch (error) {
      console.error('Erro ao carregar torneios:', error);
    }
  };

  const loadUserBirds = async (userId: string) => {
    try {
      const birdsRef = collection(db, 'users', userId, 'birds');
      const snapshot = await getDocs(birdsRef);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      })) as BirdLite[];
      setUserBirds(data);
    } catch (error) {
      console.error('Erro ao carregar pássaros:', error);
    }
  };

  const isOwner = (tournament: Tournament) => {
    return !!currentUserId && tournament.createdBy === currentUserId;
  };

  const loadInscriptions = async (tournamentId: string) => {
    try {
      const q = query(
        collection(db, 'tournament_inscriptions'),
        where('tournamentId', '==', tournamentId),
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      })) as Inscription[];
      const sorted = [...data].sort((a, b) => {
        const aDate = a.registeredAt?.toDate
          ? a.registeredAt.toDate().getTime()
          : new Date(a.registeredAt).getTime();
        const bDate = b.registeredAt?.toDate
          ? b.registeredAt.toDate().getTime()
          : new Date(b.registeredAt).getTime();
        return bDate - aDate;
      });
      setInscriptions(sorted);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    }
  };

  const getRegisteredCount = (list: Inscription[]) =>
    list.filter((i) => i.status === 'registered').length;

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setErrorMessage('Você precisa estar logado para criar torneios!');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    if (editingId && formData.createdBy !== currentUser.uid) {
      setErrorMessage('Apenas o organizador pode editar este torneio.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const startDateSafe = convertToDate(formData.startDate);
      const endDateSafe = convertToDate(formData.endDate);
      const stagesSafe = normalizeStages(formData.numberOfStages || 1, formData.stages || []).map(
        (stage) => ({
          ...stage,
          date: stage.date ? convertToDate(stage.date) : null,
        }),
      );

      if (Number.isNaN(startDateSafe.getTime()) || Number.isNaN(endDateSafe.getTime())) {
        setErrorMessage('Datas inválidas. Ajuste a data de início e fim.');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, 'tournaments', editingId), {
          ...formData,
          startDate: startDateSafe,
          endDate: endDateSafe,
          stages: stagesSafe,
        });
      } else {
        await addDoc(collection(db, 'tournaments'), {
          ...formData,
          startDate: startDateSafe,
          endDate: endDateSafe,
          stages: stagesSafe,
          createdBy: currentUser.uid,
          createdAt: new Date(),
        });
      }

      setSaveStatus('success');
      setTimeout(() => {
        loadTournaments();
        setShowForm(false);
        setEditingId(null);
        resetForm();
        setSaveStatus('idle');
      }, 1500);
    } catch (error: unknown) {
      console.error('Erro ao salvar torneio:', error);
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(msg || 'Erro ao salvar torneio. Verifique sua conexão.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    const tournament = tournaments.find((t) => t.id === id);
    if (tournament && !isOwner(tournament)) {
      alert('Apenas o organizador pode excluir este torneio.');
      return;
    }
    if (confirm('Tem certeza que deseja deletar este torneio?')) {
      try {
        await deleteDoc(doc(db, 'tournaments', id));
        loadTournaments();
      } catch (error) {
        console.error('Erro ao deletar torneio:', error);
      }
    }
  };

  const handleDeleteInscription = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta inscrição?')) {
      try {
        await deleteDoc(doc(db, 'tournament_inscriptions', id));
        if (selectedTournament?.id) {
          loadInscriptions(selectedTournament.id);
        }
      } catch (error) {
        console.error('Erro ao deletar inscrição:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      species: [],
      status: 'upcoming',
      createdBy: 'admin',
      maxParticipants: 50,
      rules: '',
      address: '',
      city: '',
      state: '',
      organizer: '',
      numberOfStages: 1,
      stages: [{ index: 1 }],
    });
  };

  const handleEditTournament = (tournament: Tournament) => {
    if (!isOwner(tournament)) {
      setErrorMessage('Apenas o organizador pode editar este torneio.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }
    const stages = normalizeStages(tournament.numberOfStages || 1, tournament.stages || []);
    setFormData({ ...tournament, stages });
    setEditingId(tournament.id || null);
    setShowForm(true);
  };

  const handleEnrollTournament = (tournament: Tournament) => {
    if (!currentUserId) {
      setEnrollMessage('Você precisa estar logado para se inscrever.');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
      return;
    }

    if (tournament.status === 'completed') {
      setEnrollMessage('Este torneio já foi concluído.');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
      return;
    }

    const compatibleBirds = userBirds.filter((bird) => tournament.species.includes(bird.species));
    if (compatibleBirds.length === 0) {
      setEnrollMessage(`Você não tem pássaros das espécies: ${tournament.species.join(', ')}`);
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
      return;
    }

    const currentUser = auth.currentUser;
    (async () => {
      try {
        const countQuery = query(
          collection(db, 'tournament_inscriptions'),
          where('tournamentId', '==', tournament.id),
        );
        const countSnapshot = await getDocs(countQuery);
        const registeredCount = countSnapshot.docs.filter(
          (doc) => ((doc.data() as Record<string, unknown>).status as string) === 'registered',
        ).length;
        if (registeredCount >= tournament.maxParticipants) {
          setEnrollMessage('Limite de participantes atingido.');
          setEnrollStatus('error');
          setTimeout(() => setEnrollStatus('idle'), 3000);
          return;
        }

        setEnrollTournament(tournament);
        setSelectedBirdId('');
        setEnrollCategory(CATEGORY_OPTIONS[0]);
        setScoreCategory(CATEGORY_OPTIONS[0]);
        setParticipantName(currentUser?.displayName || currentUser?.email || '');
        setParticipantEmail(currentUser?.email || '');
        try {
          const storageKey = `avigestao_state_v2:${currentUserId}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            const nameFromSettings = parsed?.data?.settings?.breederName || '';
            if (nameFromSettings) setBreederName(nameFromSettings);
          }
        } catch {
          /* ignore localStorage errors */
        }
        setShowEnrollModal(true);
      } catch (error) {
        console.error('Erro ao validar vagas:', error);
        setEnrollMessage('Erro ao validar vagas. Tente novamente.');
        setEnrollStatus('error');
        setTimeout(() => setEnrollStatus('idle'), 3000);
      }
    })();
  };

  const confirmEnrollment = async () => {
    if (!enrollTournament || !selectedBirdId) return;
    const user = auth.currentUser;
    if (!user) return;

    const bird = userBirds.find((b) => b.id === selectedBirdId);
    if (!bird) return;

    setEnrollStatus('enrolling');

    try {
      const existingQuery = query(
        collection(db, 'tournament_inscriptions'),
        where('tournamentId', '==', enrollTournament.id),
      );
      const existingSnapshot = await getDocs(existingQuery);
      // Checagem de duplicidade por (tournamentId, userId, birdId)
      const alreadyEnrolled = existingSnapshot.docs.some((d) => {
        const data = d.data() as Record<string, unknown>;
        return data.userId === user.uid && data.birdId === bird.id;
      });

      if (alreadyEnrolled) {
        setEnrollMessage('Esta ave já está inscrita neste torneio.');
        setEnrollStatus('error');
        setTimeout(() => setEnrollStatus('idle'), 3000);
        return;
      }

      const registeredCount = existingSnapshot.docs.filter(
        (doc) => ((doc.data() as Record<string, unknown>).status as string) === 'registered',
      ).length;
      if (registeredCount >= (enrollTournament.maxParticipants || 0)) {
        setEnrollMessage('Limite de participantes atingido.');
        setEnrollStatus('error');
        setTimeout(() => setEnrollStatus('idle'), 3000);
        return;
      }

      await addDoc(collection(db, 'tournament_inscriptions'), {
        tournamentId: enrollTournament.id,
        userId: user.uid,
        userName: participantName || user.displayName || user.email || 'Usuário',
        participantName: participantName || user.displayName || user.email || 'Usuário',
        breederName: breederName || null,
        participantEmail: participantEmail || user.email || null,
        birdName: bird.name,
        birdId: bird.id,
        birdSpecies: bird.species,
        category: enrollCategory,
        registeredAt: new Date(),
        status: 'pending',
        notes: {},
        stageAttendance: {},
      });

      try {
        const taskId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startDate = enrollTournament.startDate?.toDate
          ? enrollTournament.startDate.toDate()
          : new Date(enrollTournament.startDate);
        const pad = (value: number) => String(value).padStart(2, '0');
        const dueDate = isNaN(startDate.getTime())
          ? new Date().toISOString().split('T')[0]
          : `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(
              startDate.getDate(),
            )}`;

        const taskPayload = {
          id: taskId,
          title: `Torneio: ${enrollTournament.name}`,
          dueDate,
          isCompleted: false,
          priority: 'Média',
          frequency: 'Única',
          remindMe: true,
          tournamentId: enrollTournament.id,
          tournamentName: enrollTournament.name,
          notes: `Inscrição no torneio ${enrollTournament.name} com a ave ${bird.name}.`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await addDoc(collection(db, 'users', user.uid, 'tasks'), taskPayload);

        try {
          const storageKey = `avigestao_state_v2:${user.uid}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            const data = parsed?.data || {};
            const tasks = Array.isArray(data.tasks) ? data.tasks : [];
            const updatedTasks = [...tasks, taskPayload];
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                ...parsed,
                data: { ...data, tasks: updatedTasks },
              }),
            );
          }
        } catch {
          /* ignore localStorage errors */
        }
      } catch (taskError) {
        console.error('Erro ao criar tarefa de torneio:', taskError);
      }

      setEnrollStatus('success');
      setEnrollMessage('Inscrição realizada com sucesso!');
      setTimeout(() => {
        setShowEnrollModal(false);
        setEnrollStatus('idle');
        setEnrollTournament(null);
        setSelectedBirdId('');
        setEnrollCategory(CATEGORY_OPTIONS[0]);
        setScoreCategory(CATEGORY_OPTIONS[0]);
        setParticipantName('');
        setBreederName('');
        setParticipantEmail('');
        loadTournaments();
      }, 2000);
    } catch (error: unknown) {
      console.error('Erro ao inscrever:', error);
      const msg = error instanceof Error ? error.message : String(error);
      setEnrollMessage(msg || 'Erro ao realizar inscrição');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
    }
  };

  const handleViewDetails = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    if (tournament.id) {
      loadInscriptions(tournament.id);
    }
    setViewMode('details');
  };

  const handleViewInscriptions = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    loadInscriptions(tournament.id || '');
    setViewMode('inscriptions');
  };

  const openScoreDetailModal = (inscription: Inscription, stage: number) => {
    const existing = inscription.scoreDetails?.[stage] || {};
    const baseFromNote =
      typeof inscription.notes?.[stage] === 'number' ? inscription.notes?.[stage] : undefined;
    setScoreDetailDraft({
      ...existing,
      baseScore: existing.baseScore ?? baseFromNote,
    });
    setScoreDetailStage(stage);
    setScoreDetailInscription(inscription);
    setScoreDetailModalOpen(true);
  };

  const saveScoreDetail = async () => {
    if (!scoreDetailInscription?.id) return;
    const updatedDetails: ScoreDetailsByStage = {
      ...(scoreDetailInscription.scoreDetails || {}),
      [scoreDetailStage]: scoreDetailDraft,
    };
    const updatedNotes = {
      ...(scoreDetailInscription.notes || {}),
      [scoreDetailStage]: computeStageScore(scoreDetailDraft),
    } as Record<number, number>;
    const totalScore = computeTotalScore(updatedNotes);

    await updateDoc(doc(db, 'tournament_inscriptions', scoreDetailInscription.id), {
      scoreDetails: updatedDetails,
      notes: updatedNotes,
      totalScore,
    });

    setInscriptions((prev) =>
      prev.map((item) =>
        item.id === scoreDetailInscription.id
          ? { ...item, scoreDetails: updatedDetails, notes: updatedNotes, totalScore }
          : item,
      ),
    );
    setScoreDetailModalOpen(false);
    setScoreDetailInscription(null);
    setScoreDetailDraft({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '📅 Próximo';
      case 'ongoing':
        return '🔴 Em Andamento';
      case 'completed':
        return '✅ Concluído';
      default:
        return status;
    }
  };

  return (
    <WizardShell title="Gerenciar Torneios" description="Cadastro e acompanhamento de torneios.">
      <div className="space-y-6">
        {viewMode === 'list' && (
          <>
            <PageHeader
              title={
                <>
                  <Trophy size={32} /> Central de Torneios
                </>
              }
              subtitle="Cadastro e acompanhamento de torneios."
              actions={
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Buscar torneio, cidade ou organizador..."
                    aria-label="Buscar torneio, cidade ou organizador"
                    value={tournamentSearch}
                    onChange={(e) => setTournamentSearch(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                    style={{ width: 320 }}
                  />
                  <SecondaryButton
                    aria-label="Limpar busca"
                    onClick={() => {
                      setTournamentSearch('');
                      loadTournaments();
                    }}
                  >
                    Limpar
                  </SecondaryButton>
                  <PrimaryButton
                    aria-label="Criar novo torneio"
                    onClick={() => {
                      resetForm();
                      setEditingId(null);
                      setShowForm(!showForm);
                    }}
                  >
                    <Plus size={16} />
                    <span className="ml-2">Novo Torneio</span>
                  </PrimaryButton>
                </div>
              }
            />

            {showForm && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? 'Editar Torneio' : 'Criar Novo Torneio'}
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Buscar participante ou ave..."
                    aria-label="Buscar participante ou ave"
                    value={inscriptionSearch}
                    onChange={(e) => setInscriptionSearch(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                    style={{ width: 260 }}
                  />
                  <button
                    onClick={() => setInscriptionSearch('')}
                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                  >
                    Limpar
                  </button>
                  <button
                    aria-label="Exportar inscrições em CSV"
                    onClick={() => {
                      // Export CSV of current (filtered) inscriptions
                      const rows = (inscriptions || [])
                        .filter((i) => {
                          if (!inscriptionSearch) return true;
                          const q = inscriptionSearch.toLowerCase();
                          return (
                            (i.participantName || '').toLowerCase().includes(q) ||
                            (i.birdName || '').toLowerCase().includes(q) ||
                            (i.userName || '').toLowerCase().includes(q)
                          );
                        })
                        .map((i) => ({
                          participantName: i.participantName || i.userName,
                          birdName: i.birdName,
                          category: i.category || '',
                          status: i.status || '',
                          registeredAt: i.registeredAt?.toDate
                            ? i.registeredAt.toDate().toISOString()
                            : i.registeredAt || '',
                        }));
                      const header = ['Participante', 'Ave', 'Categoria', 'Status', 'Inscrição Em'];
                      const csv = [
                        header.join(','),
                        ...rows.map((r) =>
                          [r.participantName, r.birdName, r.category, r.status, r.registeredAt]
                            .map((v) => `"${String(v || '')}"`)
                            .join(','),
                        ),
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${(selectedTournament?.name || 'inscricoes').replace(
                        /[^a-z0-9\-_]/gi,
                        '_',
                      )}_inscricoes.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm"
                  >
                    Exportar CSV
                  </button>
                </div>
                <form onSubmit={handleSaveTournament} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nome do Torneio"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as unknown as Tournament['status'],
                        })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="upcoming">Próximo</option>
                      <option value="ongoing">Em Andamento</option>
                      <option value="completed">Concluído</option>
                    </select>
                  </div>

                  <textarea
                    placeholder="Descrição do Torneio"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={3}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Data Início
                      </label>
                      <input
                        type="datetime-local"
                        value={toLocalInputValue(formData.startDate)}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: new Date(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Data Fim
                      </label>
                      <input
                        type="datetime-local"
                        value={toLocalInputValue(formData.endDate)}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: new Date(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Máx. Participantes
                      </label>
                      <input
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) =>
                          setFormData({ ...formData, maxParticipants: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        min={1}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Espécies Permitidas
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {BRAZILIAN_SPECIES.map((species) => (
                        <label key={species} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.species.includes(species)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  species: [...formData.species, species],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  species: formData.species.filter((s) => s !== species),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{species}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Organizador
                      </label>
                      <input
                        type="text"
                        placeholder="Nome ou Entidade"
                        value={formData.organizer || ''}
                        onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Número de Etapas
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 3"
                        value={formData.numberOfStages || 1}
                        onChange={(e) => {
                          const count = Number(e.target.value) || 1;
                          setFormData((prev) => ({
                            ...prev,
                            numberOfStages: count,
                            stages: normalizeStages(count, prev.stages || []),
                          }));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Local do Torneio
                    </label>
                    <input
                      type="text"
                      placeholder="Endereço Completo"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Estado (UF)"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Etapas (datas e locais)
                    </label>
                    {normalizeStages(formData.numberOfStages || 1, formData.stages || []).map(
                      (stage) => (
                        <div
                          key={stage.index}
                          className="rounded-lg border border-slate-200 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800">
                              Etapa {stage.index}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const first = (formData.stages || []).find((s) => s.index === 1);
                                if (!first) return;
                                setFormData((prev) => ({
                                  ...prev,
                                  stages: (prev.stages || []).map((s) =>
                                    s.index === stage.index
                                      ? {
                                          ...s,
                                          address: first.address,
                                          city: first.city,
                                          state: first.state,
                                        }
                                      : s,
                                  ),
                                }));
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Copiar local da 1ª etapa
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Data/Hora
                            </label>
                            <input
                              type="datetime-local"
                              value={toLocalInputValue(stage.date)}
                              onChange={(e) => {
                                const value = e.target.value ? new Date(e.target.value) : '';
                                setFormData((prev) => ({
                                  ...prev,
                                  stages: (prev.stages || []).map((s) =>
                                    s.index === stage.index ? { ...s, date: value } : s,
                                  ),
                                }));
                              }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Endereço
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço Completo"
                              value={stage.address || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  stages: (prev.stages || []).map((s) =>
                                    s.index === stage.index ? { ...s, address: value } : s,
                                  ),
                                }));
                              }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Cidade"
                              value={stage.city || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  stages: (prev.stages || []).map((s) =>
                                    s.index === stage.index ? { ...s, city: value } : s,
                                  ),
                                }));
                              }}
                              className="px-3 py-2 border border-slate-300 rounded-lg"
                            />
                            <input
                              type="text"
                              placeholder="Estado (UF)"
                              value={stage.state || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  stages: (prev.stages || []).map((s) =>
                                    s.index === stage.index ? { ...s, state: value } : s,
                                  ),
                                }));
                              }}
                              className="px-3 py-2 border border-slate-300 rounded-lg"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <textarea
                    placeholder="Regulamento/Regras do Torneio (opcional)"
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={3}
                  />

                  {/* Feedback de status */}
                  {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                      <CheckCircle size={20} />
                      <span>Torneio salvo com sucesso!</span>
                    </div>
                  )}

                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      <AlertCircle size={20} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <PrimaryButton type="submit" disabled={saveStatus === 'saving'}>
                      {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Torneio'}
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                        setEditingId(null);
                      }}
                    >
                      Cancelar
                    </SecondaryButton>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTournamentsList.map((tournament) => (
                <div
                  key={tournament.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900 flex-1">{tournament.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(
                        tournament.status,
                      )}`}
                    >
                      {getStatusLabel(tournament.status)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-3">{tournament.description}</p>

                  <div className="space-y-2 text-sm text-slate-700 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>
                        {formatDateTime(tournament.startDate)} -{' '}
                        {formatDateTime(tournament.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span>Máx: {tournament.maxParticipants} participantes</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(tournament)}
                      aria-label={`Ver ${tournament.name}`}
                      className="flex-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-semibold"
                    >
                      <Eye size={14} className="inline mr-1" /> Ver
                    </button>
                    {isOwner(tournament) ? (
                      <>
                        <button
                          onClick={() => handleViewInscriptions(tournament)}
                          aria-label={`Ver inscritos de ${tournament.name}`}
                          className="flex-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 font-semibold"
                        >
                          <Users size={14} className="inline mr-1" /> Inscritos
                        </button>
                        <button
                          onClick={() => handleEditTournament(tournament)}
                          aria-label={`Editar ${tournament.name}`}
                          className="px-3 py-1 text-sm bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTournament(tournament.id || '')}
                          aria-label={`Deletar ${tournament.name}`}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEnrollTournament(tournament)}
                        aria-label={`Inscrever-se no torneio ${tournament.name}`}
                        disabled={tournament.status === 'completed'}
                        className={`flex-1 px-3 py-1 text-sm rounded font-semibold ${
                          tournament.status === 'completed'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Users size={14} className="inline mr-1" /> Inscrever-se
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {tournaments.length === 0 && (
              <div className="text-center py-12">
                <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 font-semibold mb-4">Nenhum torneio criado ainda</p>
                <PrimaryButton onClick={() => setShowForm(true)}>
                  Criar Primeiro Torneio
                </PrimaryButton>
              </div>
            )}
          </>
        )}

        {viewMode === 'details' && selectedTournament && (
          <div
            className="bg-white rounded-2xl border border-slate-200 p-8"
            role="region"
            aria-labelledby="tournament-details-title"
          >
            <button
              onClick={() => setViewMode('list')}
              className="mb-4 text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Voltar
            </button>

            <h2 id="tournament-details-title" className="text-3xl font-bold text-slate-900 mb-2">
              {selectedTournament.name}
            </h2>
            <p className="text-slate-600 mb-6">{selectedTournament.description}</p>

            {!isOwner(selectedTournament) && (
              <div className="mb-6">
                {inscriptions.some((i) => i.userId === currentUserId) ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-semibold">
                    Já inscrito neste torneio
                  </div>
                ) : (
                  <PrimaryButton
                    onClick={() => handleEnrollTournament(selectedTournament)}
                    disabled={
                      selectedTournament.status === 'completed' ||
                      getRegisteredCount(inscriptions) >= selectedTournament.maxParticipants
                    }
                    className={`${
                      selectedTournament.status === 'completed' ||
                      getRegisteredCount(inscriptions) >= selectedTournament.maxParticipants
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    Inscrever-se no torneio
                  </PrimaryButton>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 font-semibold">Status</p>
                <p className="text-lg font-bold text-blue-600">
                  {getStatusLabel(selectedTournament.status)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 font-semibold">Data Início</p>
                <p className="text-lg font-bold text-green-600">
                  {formatDateTime(selectedTournament.startDate)}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 font-semibold">Data Fim</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatDateTime(selectedTournament.endDate)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 font-semibold">Máx. Part.</p>
                <p className="text-lg font-bold text-purple-600">
                  {selectedTournament.maxParticipants}
                </p>
              </div>
            </div>

            {/* Informações do Local */}
            {(selectedTournament.address ||
              selectedTournament.city ||
              selectedTournament.organizer) && (
              <div className="bg-slate-50 p-6 rounded-lg mb-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MapPin size={20} />
                  Informações do Evento
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedTournament.organizer && (
                    <div>
                      <p className="text-sm text-slate-600 font-semibold">Organizador</p>
                      <p className="text-slate-900">{selectedTournament.organizer}</p>
                    </div>
                  )}
                  {selectedTournament.numberOfStages && (
                    <div>
                      <p className="text-sm text-slate-600 font-semibold">Número de Etapas</p>
                      <p className="text-slate-900">{selectedTournament.numberOfStages}</p>
                    </div>
                  )}
                  {selectedTournament.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-slate-600 font-semibold">Endereço</p>
                      <p className="text-slate-900">{selectedTournament.address}</p>
                      {selectedTournament.city && selectedTournament.state && (
                        <p className="text-slate-600">
                          {selectedTournament.city}/{selectedTournament.state}
                        </p>
                      )}
                      {buildMapsUrl(
                        selectedTournament.address,
                        selectedTournament.city,
                        selectedTournament.state,
                      ) && (
                        <a
                          className="text-sm text-blue-600 hover:text-blue-700"
                          href={
                            buildMapsUrl(
                              selectedTournament.address,
                              selectedTournament.city,
                              selectedTournament.state,
                            ) || '#'
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver no Google Maps
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTournament.stages && selectedTournament.stages.length > 0 && (
              <div className="bg-slate-50 p-6 rounded-lg mb-6">
                <h3 className="font-bold text-slate-900 mb-4">Etapas</h3>
                <div className="space-y-3">
                  {normalizeStages(
                    selectedTournament.numberOfStages || 1,
                    selectedTournament.stages,
                  ).map((stage) => (
                    <div key={stage.index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            Etapa {stage.index}
                          </p>
                          <p className="text-sm text-slate-600">
                            {stage.date ? formatDateTime(stage.date) : 'Sem data'}
                          </p>
                          {(stage.address || stage.city || stage.state) && (
                            <p className="text-sm text-slate-700">
                              {[stage.address, stage.city, stage.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        {buildMapsUrl(stage.address, stage.city, stage.state) && (
                          <a
                            className="text-sm text-blue-600 hover:text-blue-700"
                            href={buildMapsUrl(stage.address, stage.city, stage.state) || '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Maps
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTournament.rules && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-2">Regulamento</h3>
                <div className="bg-slate-50 p-4 rounded-lg text-slate-700 whitespace-pre-wrap">
                  {selectedTournament.rules}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-900 mb-2">Espécies Permitidas</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTournament.species.map((species) => (
                  <span
                    key={species}
                    className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-sm font-semibold"
                  >
                    {species}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="font-bold text-slate-900 mb-2">
                Inscritos ({getRegisteredCount(inscriptions)})
              </h3>
              {getRegisteredCount(inscriptions) === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma inscrição ainda.</p>
              ) : (
                <div className="space-y-2">
                  {inscriptions
                    .filter((i) => i.status === 'registered')
                    .map((inscription) => (
                      <div
                        key={inscription.id}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {inscription.participantName || inscription.userName}
                          </p>
                          {inscription.breederName && (
                            <p className="text-xs text-slate-600">{inscription.breederName}</p>
                          )}
                          <p className="text-xs text-slate-600">
                            {inscription.birdName} ({inscription.birdSpecies}) •{' '}
                            {inscription.category || 'Sem categoria'}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(
                            inscription.registeredAt?.toDate
                              ? inscription.registeredAt.toDate()
                              : inscription.registeredAt,
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'inscriptions' && selectedTournament && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <button
              onClick={() => setViewMode('list')}
              className="mb-4 text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Voltar
            </button>

            <h2
              id="tournament-inscriptions-title"
              className="text-2xl font-bold text-slate-900 mb-6"
            >
              Inscrições - {selectedTournament.name} ({getRegisteredCount(inscriptions)} inscritos)
            </h2>

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-bold text-slate-700">Categorias finais:</p>
              <p>Pardo/Preto + Repetição/Não repetição.</p>
              <p className="mt-2 font-bold text-slate-700">Desempate:</p>
              <p>
                1) Maior total • 2) Maior nota na última etapa • 3) Maior nota na etapa anterior •
                4) Inscrição mais antiga.
              </p>
            </div>

            {isOwner(selectedTournament) && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-slate-600">Categoria:</span>
                <select
                  value={scoreCategory}
                  onChange={(e) => setScoreCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    const stages = selectedTournament.numberOfStages || 1;
                    const filtered = inscriptions.filter((i) => i.category === scoreCategory);
                    const ranked = [...filtered].sort((a, b) => {
                      const totalDiff = (b.totalScore || 0) - (a.totalScore || 0);
                      if (totalDiff !== 0) return totalDiff;
                      for (let stage = stages; stage >= 1; stage--) {
                        const stageDiff = (b.notes?.[stage] || 0) - (a.notes?.[stage] || 0);
                        if (stageDiff !== 0) return stageDiff;
                      }
                      const aDate = a.registeredAt?.toDate
                        ? a.registeredAt.toDate().getTime()
                        : new Date(a.registeredAt).getTime();
                      const bDate = b.registeredAt?.toDate
                        ? b.registeredAt.toDate().getTime()
                        : new Date(b.registeredAt).getTime();
                      return aDate - bDate;
                    });
                    for (let index = 0; index < ranked.length; index++) {
                      const insc = ranked[index];
                      if (!insc.id) continue;
                      const placement = index + 1;
                      const points = PLACEMENT_POINTS[placement - 1] || 0;
                      await updateDoc(doc(db, 'tournament_inscriptions', insc.id), {
                        placement,
                        championshipPoints: points,
                      });
                      setInscriptions((prev) =>
                        prev.map((item) =>
                          item.id === insc.id
                            ? { ...item, placement, championshipPoints: points }
                            : item,
                        ),
                      );
                    }
                  }}
                  className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg"
                >
                  Calcular ranking
                </button>
                <button
                  onClick={async () => {
                    const emails = inscriptions
                      .filter((i) => i.participantEmail)
                      .map((i) => i.participantEmail)
                      .filter(Boolean)
                      .join(',');
                    if (!emails) return;
                    try {
                      await navigator.clipboard.writeText(emails);
                      alert('Emails copiados.');
                    } catch {
                      alert(emails);
                    }
                  }}
                  className="px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg"
                >
                  Copiar emails
                </button>
                <button
                  onClick={() => {
                    const emails = inscriptions
                      .filter((i) => i.participantEmail)
                      .map((i) => i.participantEmail)
                      .filter(Boolean)
                      .join(',');
                    if (!emails) return;
                    const subject = encodeURIComponent(`Resultados - ${selectedTournament.name}`);
                    const body = encodeURIComponent('Olá! Seguem os resultados do torneio.');
                    window.location.href = `mailto:?bcc=${encodeURIComponent(
                      emails,
                    )}&subject=${subject}&body=${body}`;
                  }}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg"
                >
                  Enviar resultados
                </button>
                <button
                  onClick={async () => {
                    // Aprovar todos pendentes até o limite de vagas disponíveis
                    const pending = inscriptions.filter((i) => i.status === 'pending');
                    if (pending.length === 0) {
                      alert('Não há inscrições pendentes a aprovar.');
                      return;
                    }
                    const available =
                      (selectedTournament?.maxParticipants || 0) - getRegisteredCount(inscriptions);
                    if (available <= 0) {
                      alert('Sem vagas disponíveis para aprovar inscrições.');
                      return;
                    }
                    const toApprove = pending.slice(0, available);
                    if (!confirm(`Aprovar ${toApprove.length} inscrição(ões)?`)) return;
                    try {
                      await Promise.all(
                        toApprove.map((i) =>
                          updateDoc(doc(db, 'tournament_inscriptions', i.id || ''), {
                            status: 'registered',
                          }),
                        ),
                      );
                      setInscriptions((prev) =>
                        prev.map((item) =>
                          item.status === 'pending' && toApprove.some((t) => t.id === item.id)
                            ? { ...item, status: 'registered' }
                            : item,
                        ),
                      );
                      if (toApprove.length < pending.length) {
                        alert(
                          `Aprovadas ${toApprove.length}. ${
                            pending.length - toApprove.length
                          } permanecem pendentes por falta de vagas.`,
                        );
                      } else {
                        alert(`Aprovadas ${toApprove.length} inscrição(ões).`);
                      }
                    } catch (error) {
                      console.error('Erro ao aprovar inscrições:', error);
                      alert('Erro ao aprovar inscrições. Veja o console.');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg"
                >
                  Aprovar todos pendentes
                </button>
              </div>
            )}

            {selectedTournament.stages && selectedTournament.stages.length > 0 && (
              <div className="mb-4 grid gap-2 md:grid-cols-2">
                {normalizeStages(
                  selectedTournament.numberOfStages || 1,
                  selectedTournament.stages,
                ).map((stage) => (
                  <div
                    key={stage.index}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                  >
                    <div className="font-bold text-slate-800">Etapa {stage.index}</div>
                    <div>{stage.date ? formatDateTime(stage.date) : 'Sem data definida'}</div>
                    <div>
                      {[stage.address, stage.city, stage.state].filter(Boolean).join(', ') ||
                        'Sem local definido'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">#</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                      Participante
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Ave</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Categoria</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">
                      Data Inscrição
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Notas</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Total</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Pontos</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Colocação</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Presença</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map((inscription, idx) => (
                    <tr
                      key={inscription.id}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div>{inscription.participantName || inscription.userName}</div>
                        {inscription.breederName && (
                          <div className="text-xs text-slate-500">{inscription.breederName}</div>
                        )}
                        {inscription.participantEmail && (
                          <div className="text-xs text-slate-500">
                            {inscription.participantEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{inscription.birdName}</td>
                      <td className="px-4 py-3">{inscription.category || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDateTime(
                          inscription.registeredAt?.toDate
                            ? inscription.registeredAt.toDate()
                            : inscription.registeredAt,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOwner(selectedTournament) ? (
                          <select
                            value={inscription.status}
                            onChange={async (e) => {
                              const nextStatus = e.target.value as Inscription['status'];
                              if (inscription.id) {
                                await updateDoc(
                                  doc(db, 'tournament_inscriptions', inscription.id),
                                  {
                                    status: nextStatus,
                                  },
                                );
                              }
                              setInscriptions((prev) =>
                                prev.map((item) =>
                                  item.id === inscription.id
                                    ? { ...item, status: nextStatus }
                                    : item,
                                ),
                              );
                            }}
                            className="px-2 py-1 border border-slate-200 rounded text-xs"
                          >
                            <option value="pending">Aguardando validação</option>
                            <option value="registered">Registrado</option>
                            <option value="disqualified">Desclassificado</option>
                            <option value="completed">Concluído</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              inscription.status === 'registered'
                                ? 'bg-green-100 text-green-800'
                                : inscription.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {inscription.status === 'registered'
                              ? '✅ Registrado'
                              : inscription.status === 'pending'
                              ? '⏳ Aguardando'
                              : inscription.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOwner(selectedTournament) ? (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: selectedTournament.numberOfStages || 1 }).map(
                              (_, stageIndex) => {
                                const stage = stageIndex + 1;
                                const value =
                                  (inscription.notes as Record<number, number> | undefined)?.[
                                    stage
                                  ] ?? '';
                                const stageInfo = selectedTournament.stages?.find(
                                  (s) => s.index === stage,
                                );
                                const stageTitle = stageInfo
                                  ? `Etapa ${stage} • ${
                                      stageInfo.date ? formatDateTime(stageInfo.date) : 'Sem data'
                                    } • ${
                                      [stageInfo.address, stageInfo.city, stageInfo.state]
                                        .filter(Boolean)
                                        .join(', ') || 'Sem local'
                                    }`
                                  : `Etapa ${stage}`;
                                return (
                                  <div
                                    key={`${inscription.id}-${stage}`}
                                    className="flex flex-col items-start gap-1"
                                  >
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      E{stage}
                                    </span>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={value}
                                      title={stageTitle}
                                      onChange={async (e) => {
                                        const numericValue =
                                          e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value);
                                        const updatedNotes = {
                                          ...(inscription.notes || {}),
                                        } as Record<number, number>;
                                        if (
                                          numericValue === undefined ||
                                          Number.isNaN(numericValue)
                                        ) {
                                          delete updatedNotes[stage];
                                        } else {
                                          updatedNotes[stage] = numericValue;
                                        }
                                        const updatedDetails = {
                                          ...(inscription.scoreDetails || {}),
                                        } as ScoreDetailsByStage;
                                        delete updatedDetails[stage];
                                        const totalScore = computeTotalScore(
                                          updatedNotes as Record<number, number>,
                                        );
                                        if (inscription.id) {
                                          await updateDoc(
                                            doc(db, 'tournament_inscriptions', inscription.id),
                                            {
                                              notes: updatedNotes,
                                              scoreDetails: updatedDetails,
                                              totalScore,
                                            },
                                          );
                                        }
                                        setInscriptions((prev) =>
                                          prev.map((item) =>
                                            item.id === inscription.id
                                              ? {
                                                  ...item,
                                                  notes: updatedNotes,
                                                  scoreDetails: updatedDetails,
                                                  totalScore,
                                                }
                                              : item,
                                          ),
                                        );
                                      }}
                                      className="w-16 px-2 py-1 border border-slate-200 rounded"
                                    />
                                    <button
                                      onClick={() => openScoreDetailModal(inscription, stage)}
                                      className="text-[11px] text-blue-600 hover:text-blue-700"
                                      type="button"
                                    >
                                      Detalhes
                                    </button>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {typeof inscription.totalScore === 'number'
                          ? inscription.totalScore.toFixed(2)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {typeof inscription.championshipPoints === 'number'
                          ? inscription.championshipPoints
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {inscription.placement ? `${inscription.placement}º` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isOwner(selectedTournament) ? (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: selectedTournament.numberOfStages || 1 }).map(
                              (_, stageIndex) => {
                                const stage = stageIndex + 1;
                                const value = inscription.stageAttendance?.[stage] || 'not-set';
                                const stageInfo = selectedTournament.stages?.find(
                                  (s) => s.index === stage,
                                );
                                const stageTitle = stageInfo
                                  ? `Etapa ${stage} • ${
                                      stageInfo.date ? formatDateTime(stageInfo.date) : 'Sem data'
                                    } • ${
                                      [stageInfo.address, stageInfo.city, stageInfo.state]
                                        .filter(Boolean)
                                        .join(', ') || 'Sem local'
                                    }`
                                  : `Etapa ${stage}`;
                                return (
                                  <div
                                    key={`${inscription.id}-presence-${stage}`}
                                    className="flex flex-col items-start gap-1"
                                  >
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      E{stage}
                                    </span>
                                    <select
                                      value={value}
                                      title={stageTitle}
                                      onChange={async (e) => {
                                        const updated = {
                                          ...(inscription.stageAttendance || {}),
                                        } as Record<number, 'present' | 'absent' | 'not-set'>;
                                        const nextValue = e.target.value as
                                          | 'present'
                                          | 'absent'
                                          | 'not-set';
                                        if (nextValue === 'not-set') {
                                          delete updated[stage];
                                        } else {
                                          updated[stage] = nextValue;
                                        }
                                        if (inscription.id) {
                                          await updateDoc(
                                            doc(db, 'tournament_inscriptions', inscription.id),
                                            {
                                              stageAttendance: updated,
                                            },
                                          );
                                        }
                                        setInscriptions((prev) =>
                                          prev.map((item) =>
                                            item.id === inscription.id
                                              ? { ...item, stageAttendance: updated }
                                              : item,
                                          ),
                                        );
                                      }}
                                      className="px-2 py-1 border border-slate-200 rounded text-xs"
                                    >
                                      <option value="not-set">Etapa {stage}</option>
                                      <option value="present">Presente</option>
                                      <option value="absent">Faltou</option>
                                    </select>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteInscription(inscription.id || '')}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inscriptions.length === 0 && (
              <div className="text-center py-8">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600">Nenhuma inscrição neste torneio</p>
              </div>
            )}
          </div>
        )}

        {showEnrollModal && enrollTournament && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Inscrever-se no Torneio</h3>
              <p className="text-sm text-slate-600 mb-4">
                <strong>{enrollTournament.name}</strong>
              </p>

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nome do participante
              </label>
              <input
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
                placeholder="Seu nome"
              />

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Criatório (opcional)
              </label>
              <input
                value={breederName}
                onChange={(e) => setBreederName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
                placeholder="Nome do criatório"
              />

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
                placeholder="seu@email.com"
              />

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecione um pássaro
              </label>
              <select
                value={selectedBirdId}
                onChange={(e) => setSelectedBirdId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
              >
                <option value="">Selecione...</option>
                {userBirds
                  .filter((bird) => enrollTournament.species.includes(bird.species))
                  .map((bird) => (
                    <option key={bird.id} value={bird.id}>
                      {bird.name} ({bird.species})
                    </option>
                  ))}
              </select>

              <label className="block text-sm font-semibold text-slate-700 mb-2">Categoria</label>
              <select
                value={enrollCategory}
                onChange={(e) => setEnrollCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {enrollStatus === 'error' && (
                <div className="text-sm text-red-600 mb-3">{enrollMessage}</div>
              )}
              {enrollStatus === 'success' && (
                <div className="text-sm text-emerald-600 mb-3">{enrollMessage}</div>
              )}

              <div className="flex justify-end gap-2">
                <SecondaryButton
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollTournament(null);
                    setSelectedBirdId('');
                    setEnrollStatus('idle');
                    setEnrollCategory(CATEGORY_OPTIONS[0]);
                    setScoreCategory(CATEGORY_OPTIONS[0]);
                    setParticipantName('');
                    setBreederName('');
                    setParticipantEmail('');
                  }}
                >
                  Cancelar
                </SecondaryButton>
                <PrimaryButton
                  onClick={confirmEnrollment}
                  disabled={!selectedBirdId || enrollStatus === 'enrolling'}
                >
                  {enrollStatus === 'enrolling' ? 'Inscrevendo...' : 'Confirmar'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {scoreDetailModalOpen && scoreDetailInscription && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Detalhes de Pontuação</h3>
              <p className="text-sm text-slate-600 mb-4">
                Etapa {scoreDetailStage} • {scoreDetailInscription.birdName} •{' '}
                {scoreDetailInscription.participantName || scoreDetailInscription.userName}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nota base (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={scoreDetailDraft.baseScore ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        baseScore: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nota estranha (0,25 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.strangeNotes ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        strangeNotes: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Pios/chamados agrupados (0,25 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.groupedCalls ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        groupedCalls: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Retorno de canto (0,50 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.returnCount ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        returnCount: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Rasgada + retorno (0,50 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.rasgadaReturnCount ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        rasgadaReturnCount:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Remontagem (1,00 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.remontagemCount ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        remontagemCount: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Início sem entrada (0,50 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.startWithoutEntryCount ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        startWithoutEntryCount:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Omissão/emissão a mais (0,10 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.omissionCount ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        omissionCount: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Cantada inválida (0,25 cada)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={scoreDetailDraft.invalidChantCount ?? ''}
                    onChange={(e) =>
                      setScoreDetailDraft((prev) => ({
                        ...prev,
                        invalidChantCount:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                Nota final calculada:{' '}
                <strong>{computeStageScore(scoreDetailDraft).toFixed(2)}</strong>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <SecondaryButton
                  onClick={() => {
                    setScoreDetailModalOpen(false);
                    setScoreDetailInscription(null);
                    setScoreDetailDraft({});
                  }}
                >
                  Cancelar
                </SecondaryButton>
                <PrimaryButton onClick={saveScoreDetail}>Aplicar</PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
};

export default TournamentManager;
