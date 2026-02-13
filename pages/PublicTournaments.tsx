import React, { useState, useEffect } from 'react';
import {
  Trophy,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  User,
  Clock,
  Eye,
  Search,
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { APP_LOGO } from '../constants';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import PageHeader from '../components/ui/PageHeader';
import type { Bird } from '../types';

type FireDate = Date | { toDate?: () => Date } | number | string;

interface PublicTournament {
  id: string;
  name: string;
  description: string;
  startDate: FireDate;
  endDate: FireDate;
  species: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  maxParticipants: number;
  address?: string;
  city?: string;
  state?: string;
  organizer?: string;
  numberOfStages?: number;
  rules?: string;
}

interface Inscription {
  id?: string;
  tournamentId: string;
  userId: string;
  userName: string;
  birdName: string;
  birdId: string;
  birdSpecies: string;
  registeredAt: FireDate;
  status: 'pending' | 'registered' | 'disqualified' | 'completed';
  placement?: number;
  score?: number;
}

interface PublicTournamentsProps {
  onNavigateToLogin: () => void;
  onNavigateToHome?: () => void;
  birds?: Bird[];
}

const PublicTournaments: React.FC<PublicTournamentsProps> = ({
  onNavigateToLogin,
  onNavigateToHome,
  birds = [],
}) => {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [inscriptions, setInscriptions] = useState<Record<string, Inscription[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<PublicTournament | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedBird, setSelectedBird] = useState<string>('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'enrolling' | 'success' | 'error'>(
    'idle',
  );
  const [enrollMessage, setEnrollMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [publicSearch, setPublicSearch] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PublicTournament[];
      setTournaments(data);

      // Carregar inscrições para cada torneio
      const inscriptionsMap: Record<string, Inscription[]> = {};
      for (const tournament of data) {
        const inscQuery = query(
          collection(db, 'tournament_inscriptions'),
          where('tournamentId', '==', tournament.id),
        );
        const inscSnapshot = await getDocs(inscQuery);
        inscriptionsMap[tournament.id] = inscSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Inscription[];
      }
      setInscriptions(inscriptionsMap);
    } catch (error) {
      const messageProp =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: unknown }).message
          : undefined;
      console.error(
        'Erro ao carregar torneios:',
        typeof messageProp === 'string' ? messageProp : error,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = (tournament: PublicTournament) => {
    if (tournament.status === 'completed') {
      setEnrollMessage('Este torneio já foi concluído.');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert('Você precisa fazer login para se inscrever!');
      onNavigateToLogin();
      return;
    }

    // Filtrar pássaros compatíveis
    const compatibleBirds = birds.filter((bird) => tournament.species.includes(bird.species));

    if (compatibleBirds.length === 0) {
      setEnrollMessage(`Você não tem pássaros das espécies: ${tournament.species.join(', ')}`);
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
      return;
    }

    setSelectedTournament(tournament);
    setSelectedBird('');
    setShowEnrollModal(true);
  };

  const confirmEnrollment = async () => {
    if (!selectedBird || !selectedTournament) return;

    const user = auth.currentUser;
    if (!user) return;

    const bird = birds.find((b) => b.id === selectedBird);
    if (!bird) return;

    setEnrollStatus('enrolling');

    try {
      const countQuery = query(
        collection(db, 'tournament_inscriptions'),
        where('tournamentId', '==', selectedTournament.id),
      );
      const countSnapshot = await getDocs(countQuery);
      const registeredCount = countSnapshot.docs.filter((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return d.status === 'registered';
      }).length;
      if (registeredCount >= selectedTournament.maxParticipants) {
        setEnrollMessage('Limite de participantes atingido.');
        setEnrollStatus('error');
        setTimeout(() => setEnrollStatus('idle'), 3000);
        return;
      }

      await addDoc(collection(db, 'tournament_inscriptions'), {
        tournamentId: selectedTournament.id,
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuário',
        birdName: bird.name,
        birdId: bird.id,
        birdSpecies: bird.species,
        registeredAt: new Date(),
        status: 'pending',
      });

      setEnrollStatus('success');
      setEnrollMessage('Inscrição realizada com sucesso!');
      setTimeout(() => {
        setShowEnrollModal(false);
        setEnrollStatus('idle');
        setSelectedTournament(null);
        setSelectedBird('');
        loadTournaments(); // Recarregar para atualizar contadores
      }, 2000);
    } catch (error: unknown) {
      const messageProp =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: unknown }).message
          : undefined;
      const msg = typeof messageProp === 'string' ? messageProp : String(error);
      console.error('Erro ao inscrever:', msg);
      setEnrollMessage(msg || 'Erro ao realizar inscrição');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
    }
  };

  const formatDate = (date: FireDate): string => {
    if (!date) return 'Data não definida';
    const toDate = (val: FireDate): Date => {
      if (!val) return new Date(NaN);
      if (
        typeof val === 'object' &&
        val !== null &&
        'toDate' in val &&
        typeof (val as { toDate?: unknown }).toDate === 'function'
      ) {
        return (val as { toDate: () => Date }).toDate();
      }
      return new Date(String(val));
    };
    const d = toDate(date);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  };

  const formatShortDate = (date: FireDate): string => {
    if (!date) return '--';
    const toDate = (val: FireDate): Date => {
      if (!val) return new Date(NaN);
      if (
        typeof val === 'object' &&
        val !== null &&
        'toDate' in val &&
        typeof (val as { toDate?: unknown }).toDate === 'function'
      ) {
        return (val as { toDate: () => Date }).toDate();
      }
      return new Date(String(val));
    };
    const d = toDate(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Sao_Paulo',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
            Próximo
          </span>
        );
      case 'ongoing':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
            Em Andamento
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-semibold">
            Finalizado
          </span>
        );
      default:
        return null;
    }
  };

  const filteredTournaments = tournaments.filter(
    (t) =>
      (filter === 'all' || t.status === filter) &&
      (publicSearch === '' ||
        (t.name || '').toLowerCase().includes(publicSearch.toLowerCase()) ||
        (t.city || '').toLowerCase().includes(publicSearch.toLowerCase()) ||
        (t.organizer || '').toLowerCase().includes(publicSearch.toLowerCase())),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded w-1/3"></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-48 bg-slate-200 rounded"></div>
              <div className="h-48 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-lg shadow-indigo-100 p-2 border border-indigo-50 flex items-center justify-center">
                <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 tracking-tight">Avi<span className="text-indigo-600">Gestão</span></span>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <PageHeader
              title={
                <>
                  <Trophy size={32} className="text-amber-500" /> Torneios Públicos
                </>
              }
              subtitle="Veja todos os torneios e competições abertas"
              actions={
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      placeholder="Buscar torneio ou cidade..."
                      value={publicSearch}
                      onChange={(e) => setPublicSearch(e.target.value)}
                      className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all w-72"
                    />
                  </div>
                  {onNavigateToHome && (
                    <SecondaryButton onClick={onNavigateToHome}>Voltar</SecondaryButton>
                  )}
                  <PrimaryButton onClick={onNavigateToLogin} className="flex items-center gap-2">
                    Login <ArrowRight size={18} />
                  </PrimaryButton>
                </div>
              }
            />

            {/* Filtros */}
            <div className="flex gap-2">
              {filter === 'all' ? (
                <PrimaryButton onClick={() => setFilter('all')}>
                  Todos ({tournaments.length})
                </PrimaryButton>
              ) : (
                <SecondaryButton onClick={() => setFilter('all')}>
                  Todos ({tournaments.length})
                </SecondaryButton>
              )}

              {filter === 'upcoming' ? (
                <PrimaryButton onClick={() => setFilter('upcoming')}>
                  Próximos ({tournaments.filter((t) => t.status === 'upcoming').length})
                </PrimaryButton>
              ) : (
                <SecondaryButton onClick={() => setFilter('upcoming')}>
                  Próximos ({tournaments.filter((t) => t.status === 'upcoming').length})
                </SecondaryButton>
              )}

              {filter === 'ongoing' ? (
                <PrimaryButton onClick={() => setFilter('ongoing')}>
                  Em Andamento ({tournaments.filter((t) => t.status === 'ongoing').length})
                </PrimaryButton>
              ) : (
                <SecondaryButton onClick={() => setFilter('ongoing')}>
                  Em Andamento ({tournaments.filter((t) => t.status === 'ongoing').length})
                </SecondaryButton>
              )}

              {filter === 'completed' ? (
                <PrimaryButton onClick={() => setFilter('completed')}>
                  Finalizados ({tournaments.filter((t) => t.status === 'completed').length})
                </PrimaryButton>
              ) : (
                <SecondaryButton onClick={() => setFilter('completed')}>
                  Finalizados ({tournaments.filter((t) => t.status === 'completed').length})
                </SecondaryButton>
              )}
            </div>
          </div>

          {/* Lista de Torneios */}
          {filteredTournaments.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum torneio encontrado nesta categoria.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredTournaments.map((tournament) => {
                const tournamentInscriptions = inscriptions[tournament.id] || [];
                const participantCount = tournamentInscriptions.filter(
                  (i) => i.status === 'registered',
                ).length;

                return (
                  <div
                    key={tournament.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-1">
                            {tournament.name}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {tournament.description}
                          </p>
                        </div>
                        {getStatusBadge(tournament.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar size={16} className="text-blue-500" />
                          <span>{formatShortDate(tournament.startDate)}</span>
                        </div>
                        {tournament.city && tournament.state && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin size={16} className="text-red-500" />
                            <span>
                              {tournament.city}/{tournament.state}
                            </span>
                          </div>
                        )}
                        {tournament.organizer && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User size={16} className="text-purple-500" />
                            <span className="truncate">{tournament.organizer}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-green-500" />
                            <span>
                              {participantCount}/{tournament.maxParticipants}
                            </span>
                            {/** show pending count if any */}
                            {tournamentInscriptions.filter((i) => i.status === 'pending').length >
                              0 && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                Aguardando:{' '}
                                {
                                  tournamentInscriptions.filter((i) => i.status === 'pending')
                                    .length
                                }
                              </span>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                            <div
                              className="h-2 bg-green-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (participantCount / Math.max(1, tournament.maxParticipants)) *
                                      100,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {tournament.numberOfStages && tournament.numberOfStages > 1 && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
                          <Clock size={16} />
                          <span className="font-semibold">{tournament.numberOfStages} Etapas</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-4">
                        {tournament.species.map((species) => (
                          <span
                            key={species}
                            className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-medium"
                          >
                            {species}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <SecondaryButton
                          onClick={() => setSelectedTournament(tournament)}
                          className="flex-1 flex items-center justify-center gap-2 text-sm"
                        >
                          <Eye size={16} />
                          Ver Detalhes
                        </SecondaryButton>
                        <PrimaryButton
                          onClick={() => handleEnroll(tournament)}
                          disabled={
                            tournament.status === 'completed' ||
                            participantCount >= tournament.maxParticipants
                          }
                          className="flex-1 flex items-center justify-center gap-2 text-sm"
                        >
                          <Trophy size={16} />
                          Inscrever-se
                        </PrimaryButton>
                      </div>
                    </div>

                    {/* Inscritos */}
                    {participantCount > 0 && (
                      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
                        <p className="text-xs text-slate-600 font-semibold mb-2">
                          Inscritos ({participantCount}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tournamentInscriptions
                            .filter((i) => i.status === 'registered')
                            .slice(0, 5)
                            .map((insc) => (
                              <div
                                key={insc.id}
                                className="text-xs bg-white px-2 py-1 rounded border border-slate-200"
                              >
                                {insc.userName} - {insc.birdName}
                              </div>
                            ))}
                          {participantCount > 5 && (
                            <div className="text-xs text-slate-500 px-2 py-1">
                              +{participantCount - 5} mais
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedTournament && !showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedTournament.name}</h2>
                <p className="text-sm text-slate-500">
                  {selectedTournament.status === 'completed'
                    ? 'Finalizado'
                    : selectedTournament.status === 'ongoing'
                    ? 'Em andamento'
                    : 'Próximo'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 mb-6">{selectedTournament.description}</p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 font-semibold mb-1">Data Início</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatDate(selectedTournament.startDate)}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 font-semibold mb-1">Data Fim</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatDate(selectedTournament.endDate)}
                </p>
              </div>
            </div>

            {(selectedTournament.organizer || selectedTournament.address) && (
              <div className="bg-slate-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Informações do Evento
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedTournament.organizer && (
                    <p>
                      <strong>Organizador:</strong> {selectedTournament.organizer}
                    </p>
                  )}
                  {selectedTournament.numberOfStages && (
                    <p>
                      <strong>Número de Etapas:</strong> {selectedTournament.numberOfStages}
                    </p>
                  )}
                  {selectedTournament.address && (
                    <p>
                      <strong>Endereço:</strong> {selectedTournament.address}
                    </p>
                  )}
                  {selectedTournament.city && selectedTournament.state && (
                    <p>
                      <strong>Local:</strong> {selectedTournament.city}/{selectedTournament.state}
                    </p>
                  )}
                  <p>
                    <strong>Vagas:</strong>{' '}
                    {
                      (inscriptions[selectedTournament.id] || []).filter(
                        (i) => i.status === 'registered',
                      ).length
                    }
                    /{selectedTournament.maxParticipants}
                  </p>
                </div>
              </div>
            )}

            {selectedTournament.rules && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-2">Regulamento</h3>
                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedTournament.rules}
                </div>
              </div>
            )}

            <div className="mb-6">
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

            <PrimaryButton
              onClick={() => handleEnroll(selectedTournament)}
              disabled={
                selectedTournament.status === 'completed' ||
                (inscriptions[selectedTournament.id] || []).filter((i) => i.status === 'registered')
                  .length >= selectedTournament.maxParticipants
              }
              className="w-full flex items-center justify-center gap-2"
            >
              <Trophy size={20} />
              Inscrever-se Agora
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Modal de Inscrição */}
      {showEnrollModal && selectedTournament && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Inscrever-se no Torneio</h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedTournament(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                <strong>{selectedTournament.name}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Espécies permitidas: {selectedTournament.species.join(', ')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecione seu pássaro:
              </label>
              <select
                value={selectedBird}
                onChange={(e) => setSelectedBird(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Escolha um pássaro...</option>
                {birds
                  .filter((bird) => selectedTournament.species.includes(bird.species))
                  .map((bird) => (
                    <option key={bird.id} value={bird.id}>
                      {bird.name} - {bird.species}
                    </option>
                  ))}
              </select>
            </div>

            {enrollStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <CheckCircle size={20} />
                <span className="text-sm">{enrollMessage}</span>
              </div>
            )}

            {enrollStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <AlertCircle size={20} />
                <span className="text-sm">{enrollMessage}</span>
              </div>
            )}

            <div className="flex gap-3">
              <SecondaryButton
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedTournament(null);
                }}
                className="flex-1"
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                onClick={confirmEnrollment}
                disabled={!selectedBird || enrollStatus === 'enrolling'}
                className="flex-1"
              >
                {enrollStatus === 'enrolling' ? 'Inscrevendo...' : 'Confirmar Inscrição'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicTournaments;

