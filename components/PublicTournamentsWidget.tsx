import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Calendar, Users, ArrowRight, CheckCircle, AlertCircle, User } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import type { Bird } from '../types';

interface PublicTournament {
  id: string;
  name: string;
  description: string;
  startDate: any;
  endDate: any;
  species: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  maxParticipants: number;
  address?: string;
  city?: string;
  state?: string;
  organizer?: string;
  numberOfStages?: number;
}

interface PublicTournamentsWidgetProps {
  onNavigateToTournaments?: () => void;
  birds?: Bird[];
}

const PublicTournamentsWidget: React.FC<PublicTournamentsWidgetProps> = ({ 
  onNavigateToTournaments,
  birds = []
}) => {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<PublicTournament | null>(null);
  const [selectedBird, setSelectedBird] = useState<string>('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'enrolling' | 'success' | 'error'>('idle');
  const [enrollMessage, setEnrollMessage] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const q = query(
        collection(db, 'tournaments'),
        where('status', 'in', ['upcoming', 'ongoing']),
        orderBy('startDate', 'asc'),
        limit(3)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PublicTournament[];
      setTournaments(data);
    } catch (error) {
      console.error('Erro ao carregar torneios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = (tournament: PublicTournament) => {
    const user = auth.currentUser;
    if (!user) {
      setEnrollMessage('Você precisa fazer login para se inscrever!');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
      return;
    }

    // Filtrar pássaros compatíveis com as espécies do torneio
    const compatibleBirds = birds.filter(bird => 
      tournament.species.includes(bird.species)
    );

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

    const bird = birds.find(b => b.id === selectedBird);
    if (!bird) return;

    setEnrollStatus('enrolling');

    try {
      await addDoc(collection(db, 'tournament_inscriptions'), {
        tournamentId: selectedTournament.id,
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuário',
        birdName: bird.name,
        birdId: bird.id,
        birdSpecies: bird.species,
        registeredAt: new Date(),
        status: 'registered'
      });

      setEnrollStatus('success');
      setEnrollMessage('Inscrição realizada com sucesso!');
      setTimeout(() => {
        setShowEnrollModal(false);
        setEnrollStatus('idle');
        setSelectedTournament(null);
        setSelectedBird('');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao inscrever:', error);
      setEnrollMessage(error.message || 'Erro ao realizar inscrição');
      setEnrollStatus('error');
      setTimeout(() => setEnrollStatus('idle'), 3000);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'Data não definida';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">Próximo</span>;
      case 'ongoing':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Em Andamento</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-slate-100 rounded"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={24} className="text-amber-600" />
          <h3 className="font-bold text-lg text-slate-900">Próximos Torneios</h3>
        </div>
        <p className="text-slate-500 text-sm">Nenhum torneio agendado no momento.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={24} className="text-amber-600" />
            <h3 className="font-bold text-lg text-slate-900">Próximos Torneios</h3>
          </div>
          {onNavigateToTournaments && (
            <button
              onClick={onNavigateToTournaments}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
            >
              Ver todos <ArrowRight size={16} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {tournaments.map(tournament => (
            <div
              key={tournament.id}
              className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => onNavigateToTournaments && onNavigateToTournaments()}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-slate-900">{tournament.name}</h4>
                  <p className="text-sm text-slate-600 line-clamp-1">{tournament.description}</p>
                </div>
                {getStatusBadge(tournament.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{formatDate(tournament.startDate)}</span>
                </div>
                {tournament.city && tournament.state && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span>{tournament.city}/{tournament.state}</span>
                  </div>
                )}
                {tournament.organizer && (
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    <span className="truncate">{tournament.organizer}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>Até {tournament.maxParticipants}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {tournament.species.slice(0, 3).map(species => (
                    <span
                      key={species}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full"
                    >
                      {species}
                    </span>
                  ))}
                  {tournament.species.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                      +{tournament.species.length - 3}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnroll(tournament);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-semibold transition-all"
                >
                  Inscrever-se
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Inscrição */}
      {showEnrollModal && selectedTournament && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Inscrever-se no Torneio</h3>
              <button
                onClick={() => setShowEnrollModal(false)}
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
                  .filter(bird => selectedTournament.species.includes(bird.species))
                  .map(bird => (
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
              <button
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEnrollment}
                disabled={!selectedBird || enrollStatus === 'enrolling'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrollStatus === 'enrolling' ? 'Inscrevendo...' : 'Confirmar Inscrição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicTournamentsWidget;
