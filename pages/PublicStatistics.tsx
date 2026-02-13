import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Bird,
  GitBranch,
  Trophy,
  Newspaper,
  Medal,
  BookOpen,
  UsersRound,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { APP_LOGO } from '../constants';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import WizardShell from '../components/WizardShell';
import CommunityFeed from '../components/CommunityFeed';

interface Stats {
  totalBirds: number;
  totalUsers: number;
  totalPedigrees: number;
  totalTournaments: number;
  birdsBySpecies: { name: string; count: number }[];
  birdsByStatus: { name: string; value: number }[];
  recentActivity: { date: string; birds: number; users: number }[];
  communityProfiles: {
    userId: string;
    name: string;
    location?: string;
    birdCount: number;
    allowContact: boolean;
    showResults: boolean;
  }[];
  communityEvents: { title: string; date: string; tag: string }[];
  topBreeders: { name: string; birdCount: number; location?: string }[];
  recentBirds: { name: string; species: string; owner: string; addedAt: string }[];
}

interface InboxMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  text: string;
  createdAt?: string;
  read?: boolean;
}

const PublicStatistics: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalBirds: 0,
    totalUsers: 0,
    totalPedigrees: 0,
    totalTournaments: 0,
    birdsBySpecies: [],
    birdsByStatus: [],
    recentActivity: [],
    communityProfiles: [],
    communityEvents: [],
    topBreeders: [],
    recentBirds: [],
  });
  const [loading, setLoading] = useState(true);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [tipToHide, setTipToHide] = useState<string | null>(null);
  
  // Estado para controlar o perfil público do usuário
  const [userSettings, setUserSettings] = useState<any>(null);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);
  const [savingUserSettings, setSavingUserSettings] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<null | {
    userId: string;
    name: string;
  }>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadStatistics();
    loadUserSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setInboxMessages([]);
      setLoadingInbox(false);
      return;
    }
    setLoadingInbox(true);
    const messagesRef = collection(db, 'community_messages');
    const q = query(
      messagesRef,
      where('toUserId', '==', currentUserId),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: InboxMessage[] = [];
        snap.forEach((d) => {
          const data: any = d.data();
          docs.push({
            id: d.id,
            fromUserId: data.fromUserId,
            fromName: data.fromName || 'Criador',
            text: data.text,
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : undefined,
            read: data.read || false,
          });
        });
        setInboxMessages(docs);
        setLoadingInbox(false);
      },
      (err) => {
        console.error('Erro ao carregar mensagens', err);
        setLoadingInbox(false);
      },
    );
    return () => unsub();
  }, [currentUserId]);

  const sendMessage = async () => {
    if (!messageTarget) return;
    const user = auth.currentUser;
    if (!user) {
      alert('Faça login para enviar mensagens.');
      return;
    }
    if (!messageText.trim()) return;
    setSendingMessage(true);
    try {
      await addDoc(collection(db, 'community_messages'), {
        fromUserId: user.uid,
        fromName: user.displayName || user.email || 'Criador',
        toUserId: messageTarget.userId,
        toName: messageTarget.name,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
        read: false,
      });
      setMessageText('');
      setMessageModalOpen(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Falha ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const goToInbox = () => {
    try {
      window.history.pushState({}, '', '/community-inbox');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.href = '/community-inbox';
    }
  };

  // If user clicked a subitem in the Sidebar we store the desired view in localStorage
  // and here we scroll to the matching section when stats finished loading.
  useEffect(() => {
    if (loading) return;
    try {
      const view = typeof localStorage !== 'undefined' ? localStorage.getItem('avigestao_statistics_view') : null;
      if (!view) return;
      const mapping: Record<string, string> = {
        'statistics-feed': 'community-feed-section',
        'statistics-top': 'community-top-section',
        'statistics-recent': 'community-recent-section',
      };
      const id = mapping[view];
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      /* ignore */
    }
  }, [loading]);

  const loadUserSettings = async () => {
    try {
      setLoadingUserSettings(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoadingUserSettings(false);
        return;
      }
      const settingsDoc = await getDoc(
        doc(db, 'users', currentUser.uid, 'settings', 'preferences')
      );
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setUserSettings(data);
        // Carregar dicas descartadas permanentemente
        if (data.dismissedTips && Array.isArray(data.dismissedTips)) {
          setDismissedTips(new Set(data.dismissedTips));
        }
      } else {
        setUserSettings({
          communityOptIn: false,
          communityShowProfile: false,
          communityShowResults: false,
          communityAllowContact: false,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do usuário:', error);
    } finally {
      setLoadingUserSettings(false);
    }
  };

  const updateUserCommunitySettings = async (key: string, value: boolean) => {
    try {
      setSavingUserSettings(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const newSettings = {
        ...userSettings,
        [key]: value,
      };
      
      // Se desabilitar comunidade, desabilitar tudo
      if (key === 'communityOptIn' && !value) {
        newSettings.communityShowProfile = false;
        newSettings.communityShowResults = false;
        newSettings.communityAllowContact = false;
      }

      await setDoc(
        doc(db, 'users', currentUser.uid, 'settings', 'preferences'),
        newSettings,
        { merge: true }
      );

      setUserSettings(newSettings);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    } finally {
      setSavingUserSettings(false);
    }
  };

  const handleDismissTip = (tipId: string) => {
    setTipToHide(tipId);
    setShowTipDialog(true);
  };

  const handleTipDialogConfirm = async (permanent: boolean) => {
    if (!tipToHide) return;

    // Sempre ocultar temporariamente
    setDismissedTips(prev => new Set([...prev, tipToHide]));

    if (permanent && auth.currentUser) {
      try {
        const settingsRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'preferences');
        const currentSettings = await getDoc(settingsRef);
        const existingDismissed = currentSettings.exists() && Array.isArray(currentSettings.data().dismissedTips)
          ? currentSettings.data().dismissedTips
          : [];
        
        const updatedDismissed = [...new Set([...existingDismissed, tipToHide])];
        await setDoc(settingsRef, { dismissedTips: updatedDismissed }, { merge: true });
      } catch (err) {
        console.error('Erro ao salvar preferência:', err);
      }
    }

    setShowTipDialog(false);
    setTipToHide(null);
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Total de aves
      const birdsSnapshot = await getDocs(collection(db, 'birds'));
      const totalBirds = birdsSnapshot.size;
      console.log(' Total de aves (collection global):', totalBirds, 'documentos encontrados');

      // Também contar aves em users/{userId}/birds
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let totalBirdsFromUsers = 0;
      let allBirdsData: any[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userBirdsRef = collection(db, 'users', userDoc.id, 'birds');
        const userBirdsSnapshot = await getDocs(userBirdsRef);
        totalBirdsFromUsers += userBirdsSnapshot.size;
        userBirdsSnapshot.forEach((birdDoc) => {
          allBirdsData.push({
            id: birdDoc.id,
            userId: userDoc.id,
            ...birdDoc.data(),
          });
        });
      }
      
      console.log(' Total de aves (users/*/birds):', totalBirdsFromUsers);
      const totalBirds_final = totalBirdsFromUsers || totalBirds;

      // Total de usuários
      const totalUsers = usersSnapshot.size;
      console.log(' Total de usuários:', totalUsers, 'documentos encontrados');

      // Total de pedigrees (aves com pai e mãe)
      let totalPedigrees = 0;
      allBirdsData.forEach((bird) => {
        if (bird.fatherId && bird.motherId) {
          totalPedigrees++;
        }
      });
      console.log(' Total de pedigrees:', totalPedigrees);

      // Total de torneios
      const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
      const totalTournaments = tournamentsSnapshot.size;
      console.log(' Total de torneios:', totalTournaments, 'documentos encontrados');

      const speciesMap: Record<string, number> = {};
      allBirdsData.forEach((bird) => {
        const species = bird.species || 'Não especificado';
        speciesMap[species] = (speciesMap[species] || 0) + 1;
      });
      const birdsBySpecies = Object.entries(speciesMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Aves por status
      const statusMap: Record<string, number> = {};
      allBirdsData.forEach((bird) => {
        const status = bird.status || 'Ativo';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const birdsByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      const birdsByOwner: Record<string, number> = {};
      allBirdsData.forEach((bird) => {
        const ownerId = bird.userId as string | undefined;
        if (ownerId) {
          birdsByOwner[ownerId] = (birdsByOwner[ownerId] || 0) + 1;
        }
      });

      // Top 5 criadores (by volume)
      const topBreeders = Object.entries(birdsByOwner)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(async (entry) => {
          try {
            const settingsDoc = await getDoc(doc(db, 'users', entry.userId, 'settings', 'preferences'));
            const settings = settingsDoc.exists() ? settingsDoc.data() : {};
            const breederName = settings.breederName || `Criador ${entry.userId.substring(0, 6)}`;
            return {
              name: breederName,
              birdCount: entry.count,
              location: settings.addressCity ? `${settings.addressCity}/${settings.addressState}` : 'Brasil',
            };
          } catch {
            return {
              name: `Criador ${entry.userId.substring(0, 6)}`,
              birdCount: entry.count,
              location: 'Brasil',
            };
          }
        });

      // Resolver promises dos top breeders
      const topBreeders_resolved = await Promise.all(topBreeders);

      // Últimas 5 aves adicionadas
      const recentBirds = allBirdsData
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5)
        .map((bird) => ({
          name: bird.name || 'Ave sem nome',
          species: bird.species || 'Não especificado',
          owner: `Criador ${bird.userId.substring(0, 6)}`,
          addedAt: new Date(bird.createdAt?.toDate?.() || bird.createdAt).toLocaleDateString(
            'pt-BR',
          ),
        }));

      const communityProfiles = await Promise.all(
        usersSnapshot.docs.slice(0, 30).map(async (userDoc) => {
          const userId = userDoc.id;
          const settingsDoc = await getDoc(
            doc(db, 'users', userId, 'settings', 'preferences'),
          );
          const settings = settingsDoc.exists() ? settingsDoc.data() : {};
          const communityOptIn = !!settings.communityOptIn;
          if (!communityOptIn) return null;

          const showProfile = !!settings.communityShowProfile;
          const allowContact = !!settings.communityAllowContact;
          const showResults = !!settings.communityShowResults;
          const name = showProfile
            ? (settings.breederName as string) || 'Criador'
            : 'Criador Anônimo';
          const location =
            showProfile && settings.addressCity
              ? `${settings.addressCity}${settings.addressState ? `/${settings.addressState}` : ''}`
              : undefined;

          return {
            userId,
            name,
            location,
            birdCount: birdsByOwner[userId] || 0,
            allowContact,
            showResults,
          };
        }),
      );

      const filteredProfiles = communityProfiles.filter(Boolean) as Stats['communityProfiles'];

      const communityEvents = tournamentsSnapshot.docs.slice(0, 3).map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          title: data?.name || 'Torneio AviGestão',
          date: data?.startDate
            ? new Date(data.startDate).toLocaleDateString()
            : 'Em breve',
          tag: data?.status || 'Evento',
        };
      });

      setStats({
        totalBirds: totalBirds_final,
        totalUsers,
        totalPedigrees,
        totalTournaments,
        birdsBySpecies,
        birdsByStatus,
        recentActivity: [
          { date: 'Hoje', birds: 12, users: 8 },
          { date: 'Ontem', birds: 15, users: 10 },
          { date: '3 dias', birds: 10, users: 5 },
          { date: '7 dias', birds: 45, users: 20 },
        ],
        communityProfiles: filteredProfiles,
        communityEvents,
        topBreeders: topBreeders_resolved,
        recentBirds,
      });
    } catch (error) {
      console.error(' Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  const communityFeed = [
    {
      title: 'Novo torneio cadastrado: Regional SP',
      description: 'Inscrições abertas até 18/02  Curió e Bicudo',
      badge: 'Evento',
    },
    {
      title: 'Dica da semana: manejo no período de muda',
      description: 'Checklist rápido com suplementação e iluminação ideal.',
      badge: 'Guia',
    },
    {
      title: 'Criadores em destaque',
      description: 'Perfis com maior crescimento no mês (opt-in).',
      badge: 'Ranking',
    },
  ];

  const rankingCards = [
    { title: 'Top Criadores', subtitle: 'Por volume de plantel', icon: <Medal size={18} /> },
    { title: 'Top Espécies', subtitle: 'Mais registradas', icon: <Bird size={18} /> },
    { title: 'Top Torneios', subtitle: 'Mais participações', icon: <Trophy size={18} /> },
  ];

  const libraryItems = [
    { title: 'Genética de cores em Bicudos', meta: 'Guia completo', url: 'https://www.wikiaves.com.br/wiki/Bicudo' },
    { title: 'Nutrição e suplementação', meta: 'Por veterinário especialista', url: 'https://www.passaromania.com.br/' },
    { title: 'Calendário sazonal de manejo', meta: 'Muda, reprodução, repouso', url: 'https://www.criadoresdobicudo.com.br/' },
    { title: 'Anilhamento IBAMA - Guia prático', meta: 'Procedimentos e padrões', url: 'https://www.icmbio.gov.br/' },
    { title: 'Prevenção de doenças', meta: 'Higiene e profilaxia', url: 'https://www.avesselvagens.com.br/' },
    { title: 'Técnicas de treino e adestramento', meta: 'Do básico ao avançado', url: 'https://www.passaromania.com.br/treino/' },
    { title: 'Reprodução: período reprodutivo', meta: 'Estímulos, condições ideais', url: 'https://www.criadoresdobicudo.com.br/reproducao/' },
    { title: 'Alimentação para criadores', meta: 'Receitas práticas e nutrição balanceada', url: 'https://www.passaromania.com.br/alimentacao/' },
    { title: 'Infraestrutura e espaços', meta: 'Viveiros, polteiros, comedouros', url: 'https://www.criadoresdobicudo.com.br/infraestrutura/' },
    { title: 'Seleção e melhoramento genético', meta: 'Princípios básicos de seleção', url: 'https://www.wikiaves.com.br/wiki/Sele%C3%A7%C3%A3o_gen%C3%A9tica' },
    { title: 'Documentação e registros', meta: 'IBAMA, genealogia, passaporte', url: 'https://www.icmbio.gov.br/cites/' },
    { title: 'Curió: tudo que você precisa saber', meta: 'Espécie, características, manejo', url: 'https://www.wikiaves.com.br/wiki/Curio' },
    { title: 'Saúde respiratória em aves', meta: 'Infecções, sinais de alerta', url: 'https://www.passaromania.com.br/saude/' },
    { title: 'Muda das penas: protocolo completo', meta: 'Iluminação, temperatura, alimentos', url: 'https://www.criadoresdobicudo.com.br/muda/' },
    { title: 'Comportamento e socialização', meta: 'Entender o seu pássaro', url: 'https://www.wikiaves.com.br/wiki/Comportamento' },
    { title: 'Parasitas internos e externos', meta: 'Identificação e tratamento', url: 'https://www.passaromania.com.br/parasitas/' },
    { title: 'Repouso vegetativo (inverno)', meta: 'Importância e condições ideais', url: 'https://www.criadoresdobicudo.com.br/repouso/' },
    { title: 'Qualidade da água para aves', meta: 'Higiene e requisitos essenciais', url: 'https://www.passaromania.com.br/agua/' },
    { title: 'Ferramenta: Gerador de pedigrees', meta: 'Calcule genealogias facilmente', url: 'https://www.criadoresdobicudo.com.br/pedigree/' },
    { title: 'Legislação CITES para criadores', meta: 'Espécies protegidas e normas', url: 'https://www.icmbio.gov.br/cites/' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-600 font-semibold">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <WizardShell title="Comunidade" description="Estatísticas públicas do AviGestão.">
      <div className="space-y-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 p-12 text-white shadow-xl shadow-indigo-100">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg">
                  <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-5xl font-black tracking-tight">Comunidade AviGestão</h1>
              </div>
              <p className="text-xl text-indigo-100 max-w-2xl font-medium tracking-tight">
                Junte-se a criadores apaixonados, compartilhe experiências e veja o crescimento da plataforma em tempo real
              </p>
            </div>
          </div>

          {/* Seu Perfil Público - Painel de Controle */}
          {!loadingUserSettings && userSettings && (
            <div className={`rounded-2xl p-6 border-2 transition-all ${
              userSettings.communityOptIn 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300' 
                : 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-3 w-3 rounded-full ${userSettings.communityOptIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <h3 className="font-bold text-lg text-slate-900">Seu Perfil Público</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    {userSettings.communityOptIn 
                      ? ' Seu perfil está visível na comunidade' 
                      : ' Seu perfil está oculto. Ative para aparecer na comunidade.'}
                  </p>
                  
                  {userSettings.communityOptIn && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-emerald-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={!!userSettings.communityShowProfile}
                          onChange={(e) => updateUserCommunitySettings('communityShowProfile', e.target.checked)}
                          disabled={savingUserSettings}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-800">Exibir perfil</p>
                          <p className="text-[10px] text-slate-500">Nome do criatório</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-emerald-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={!!userSettings.communityShowResults}
                          onChange={(e) => updateUserCommunitySettings('communityShowResults', e.target.checked)}
                          disabled={savingUserSettings}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-800">Exibir resultados</p>
                          <p className="text-[10px] text-slate-500">Ranking e conquistas</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-emerald-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={!!userSettings.communityAllowContact}
                          onChange={(e) => updateUserCommunitySettings('communityAllowContact', e.target.checked)}
                          disabled={savingUserSettings}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-800">Permitir contato</p>
                          <p className="text-[10px] text-slate-500">Via portal</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={() => updateUserCommunitySettings('communityOptIn', !userSettings.communityOptIn)}
                    disabled={savingUserSettings}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
                      userSettings.communityOptIn
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                    } ${savingUserSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {userSettings.communityOptIn ? <Eye size={20} /> : <EyeOff size={20} />}
                    {savingUserSettings ? 'Salvando...' : userSettings.communityOptIn ? 'Perfil Ativo' : 'Ativar Meu Perfil'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dica: Preencher dados incompletos */}
          {!dismissedTips.has('fill-data') && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <div className="text-lg"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900">Dica: Complete seus dados</p>
                <p className="text-xs text-indigo-700 mt-1">
                  Preencha seu perfil (nome do criatório, localização, etc.) para aparecer corretamente na comunidade.
                </p>
              </div>
              <button
                onClick={() => handleDismissTip('fill-data')}
                className="text-indigo-400 hover:text-indigo-600"
                title="Fechar dica"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Estatísticas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Total de Aves</p>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {stats.totalBirds.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">No plantel comunitário</p>
                </div>
                <div className="bg-indigo-50 group-hover:bg-indigo-100 rounded-xl p-3 transition">
                  <Bird className="text-indigo-600" size={32} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-100 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Criadores Ativos</p>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {stats.totalUsers.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Na plataforma</p>
                </div>
                <div className="bg-emerald-50 group-hover:bg-emerald-100 rounded-xl p-3 transition">
                  <Users className="text-emerald-600" size={32} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-violet-100 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Pedigrees</p>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {stats.totalPedigrees.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Genealogias completas</p>
                </div>
                <div className="bg-violet-50 group-hover:bg-violet-100 rounded-xl p-3 transition">
                  <GitBranch className="text-violet-600" size={32} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-amber-100 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Torneios</p>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {stats.totalTournaments.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Ativos</p>
                </div>
                <div className="bg-amber-50 group-hover:bg-amber-100 rounded-xl p-3 transition">
                  <Trophy className="text-amber-600" size={32} />
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="community-top-section" className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Bird className="text-indigo-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Distribuição por Espécie</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.birdsBySpecies}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '16px',
                      color: '#fff',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div id="community-recent-section" className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CalendarCheck className="text-emerald-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Status das Aves</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.birdsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {stats.birdsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '16px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Trophy className="text-amber-600" size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Top 5 Espécies</h2>
            </div>
            <div className="space-y-6">
              {stats.birdsBySpecies.slice(0, 5).map((specie, idx) => (
                <div key={specie.name} className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black shadow-inner">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <p className="font-bold text-slate-800">{specie.name}</p>
                      <p className="font-black text-indigo-600 text-sm">
                        {specie.count} aves ({((specie.count / stats.totalBirds) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(specie.count / stats.totalBirds) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Medal className="text-amber-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Top Criadores</h2>
              </div>
              <div className="space-y-4">
                {stats.topBreeders.map((breeder, idx) => (
                  <div
                    key={breeder.name}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-50 hover:border-amber-100 hover:shadow-lg hover:shadow-amber-50 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center font-black text-amber-600 shadow-inner group-hover:scale-110 transition-transform">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800">{breeder.name}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{breeder.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl text-slate-900 tracking-tight">{breeder.birdCount}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">aves</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Sparkles className="text-indigo-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Aves Recentes</h2>
              </div>
              <div className="space-y-4">
                {stats.recentBirds.map((bird, idx) => (
                  <div
                    key={`${bird.name}-${idx}`}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/30 border border-slate-50 hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-500">
                      <Bird size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800">{bird.name}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{bird.species}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        {bird.owner}  {bird.addedAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <BookOpen className="text-indigo-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Biblioteca</h2>
              </div>
              <div className="space-y-3">
                {libraryItems.slice(0, libraryExpanded ? undefined : 4).map((item) => (
                  <a
                    key={item.title}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group"
                  >
                    <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.meta}</p>
                  </a>
                ))}
                {!libraryExpanded && (
                  <button
                    onClick={() => setLibraryExpanded(true)}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    +14 itens (clique para expandir)
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <UsersRound className="text-emerald-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Networking</h2>
              </div>
              <div className="space-y-4">
                {stats.communityProfiles.map((profile) => (
                  <div
                    key={profile.userId}
                    className="p-5 rounded-3xl bg-slate-50/50 border border-slate-100"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black text-slate-800">{profile.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {profile.location || 'Localização privada'}
                        </p>
                      </div>
                      {profile.allowContact && profile.userId !== currentUserId && (
                        <button
                          onClick={() => {
                            setMessageTarget({ userId: profile.userId, name: profile.name });
                            setMessageModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          Contato
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {profile.birdCount} aves
                      </p>
                    </div>
                    {profile.userId === currentUserId && (
                      <p className="text-[10px] text-indigo-400 font-black mt-2 uppercase">Este é você!</p>
                    )}
                  </div>
                ))}

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagens Recebidas</h5>
                    <button onClick={goToInbox} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Abrir inbox</button>
                  </div>
                  {inboxMessages.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-bold uppercase italic">Nenhuma mensagem ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {inboxMessages.slice(0, 2).map((msg) => (
                        <div key={msg.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black text-slate-800">{msg.fromName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-violet-50 rounded-lg">
                  <CalendarCheck className="text-violet-600" size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Eventos</h2>
              </div>
              <div className="space-y-4">
                {stats.communityEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400 font-bold mb-1">Nenhum evento cadastrado.</p>
                    <p className="text-[10px] text-slate-300 font-black uppercase">Crie um torneio para aparecer aqui!</p>
                  </div>
                ) : (
                  stats.communityEvents.map((evt, idx) => (
                    <div key={idx} className="p-5 rounded-3xl bg-slate-50/50 border border-slate-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={40} className="text-violet-600" />
                      </div>
                      <span className="inline-block px-2 py-1 bg-violet-100 text-violet-600 text-[10px] font-black uppercase tracking-widest rounded-md mb-2">
                        {evt.tag}
                      </span>
                      <h4 className="font-black text-slate-800 mb-1">{evt.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{evt.date}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Privacidade Primeiro</h3>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed mb-6">
                Todos os dados da comunidade são opt-in. Você controla totalmente o que é público.
              </p>
              <ul className="space-y-3">
                {['Mostrar nome do criatório', 'Compartilhar localização', 'Exibir resultados em torneios', 'Receber contatos de outros criadores'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[40px] p-10 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 shadow-xl">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tight">Aproveite a Comunidade!</h3>
                <p className="text-indigo-100 font-medium leading-relaxed mb-8 text-lg">
                  Conecte-se com outros criadores, compartilhe experiências e acompanhe as novidades do AviGestão.
                </p>
                <div className="flex gap-4">
                  <button className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">
                    Ver Feed Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Envio de Mensagem */}
      {messageModalOpen && messageTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <UsersRound size={24} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Enviar Mensagem</h3>
                  <p className="font-black text-slate-800 text-lg">{messageTarget.name}</p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <textarea
                placeholder="Escreva sua mensagem aqui..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full h-40 p-6 bg-slate-50 border border-slate-100 rounded-[32px] outline-none text-slate-700 font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
              />
              <div className="mt-8 flex justify-end">
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {sendingMessage ? 'Enviando...' : 'Enviar Agora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WizardShell>
  );
};

export default PublicStatistics;
