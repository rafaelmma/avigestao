// Função auxiliar para determinar tipo de período de assinatura (heurística por meses restantes)
const getSubscriptionPeriodType = (endDateString: string): string => {
  try {
    const endDate = new Date(endDateString);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (isNaN(diffMs)) return 'Desconhecido';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30);

    if (months <= 1) return 'Mensal';
    if (months <= 3) return 'Trimestral';
    if (months <= 6) return 'Semestral';
    return 'Anual';
  } catch {
    return 'Desconhecido';
  }
};

const getProviderLabel = (provider?: string) => {
  if (!provider) return 'Desconhecido';
  const p = provider.toLowerCase();
  if (p.includes('mercado')) return 'Mercado Pago';
  if (p.includes('stripe')) return 'Stripe';
  if (p.includes('manual')) return 'Pagamento Manual';
  return provider;
};

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Shield,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Zap,
  User,
  Clock,
} from 'lucide-react';
import { db, functions } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
  setDoc,
  deleteField,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { BreederSettings } from '../types';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email?: string;
  phone?: string;
  breederName: string;
  plan: string;
  createdAt?: string;
  active: boolean;
  isAdmin: boolean;
  adminOnly?: boolean;
  totalBirds?: number;
  lastLogin?: string;
  subscriptionStatus?: string;
  displayName?: string;
  trialEndDate?: string;
  subscriptionEndDate?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  subscriptionDaysRemaining?: number;
  subscriptionPeriodType?: string; // 'monthly', 'quarterly', 'semiannual', 'annual'
  subscriptionProvider?: string;
  subscriptionMonths?: number;
  // Campos de endereço e contato
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  celular?: string;
  site?: string;
  responsavel?: string;
  categoria?: string;
}

interface AdminUsersProps {
  currentUserId?: string;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'plan'>('date');

  const isTrialActive = (trialEndDate?: string) => {
    if (!trialEndDate) return false;
    const dt = new Date(trialEndDate);
    if (isNaN(dt.getTime())) return false;
    return dt.getTime() >= new Date().getTime();
  };

  const normalizeDate = (value: any): string | undefined => {
    if (!value) return undefined;
    try {
      const dt = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
      if (isNaN(dt.getTime())) return undefined;
      return dt.toISOString();
    } catch {
      return undefined;
    }
  };

  // Carregar usuários
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const usersData: UserData[] = [];

        for (const userDoc of snapshot.docs) {
          const userId = userDoc.id;
          
          // Pegar settings do usuário - especificamente do documento "preferences"
          let userSettings: Partial<BreederSettings> = {
            breederName: 'Sem Nome',
          };

          try {
            const preferencesDoc = await getDocs(
              collection(db, `users/${userId}/settings`)
            );
            // Procurar especificamente pelo documento "preferences"
            const prefsDoc = preferencesDoc.docs.find(doc => doc.id === 'preferences');
            if (prefsDoc) {
              userSettings = prefsDoc.data() as Partial<BreederSettings>;
            } else if (preferencesDoc.docs.length > 0) {
              // Fallback para o primeiro documento se "preferences" não existir
              userSettings = preferencesDoc.docs[0].data() as Partial<BreederSettings>;
            }
          } catch (e) {
            console.trace('Erro ao buscar settings do usuário:', e);
          }

          // Contar aves
          const birdsRef = collection(db, `users/${userId}/birds`);
          const birdsSnapshot = await getDocs(birdsRef);

          const createdAtIso = normalizeDate(userDoc.data()?.createdAt);
          const lastLoginIso = normalizeDate(userDoc.data()?.lastLogin);
          const planFromSettings = userSettings.plan || undefined;
          const planFromUser = userDoc.data()?.plan || undefined;
          const resolvedPlan = planFromSettings || planFromUser || 'Básico';
          const trialFromSettings = normalizeDate(userSettings.trialEndDate);
          const trialFromUser = normalizeDate(userDoc.data()?.trialEndDate);
          const resolvedTrialEndDate = trialFromSettings || trialFromUser || undefined;

          usersData.push({
            id: userId,
            email: userDoc.data()?.email || undefined,
            phone: userDoc.data()?.phone || undefined,
            displayName: userDoc.data()?.displayName || undefined,
            trialEndDate: resolvedTrialEndDate,
            adminOnly: userDoc.data()?.adminOnly || false,
            breederName: userSettings.breederName || 'Sem Nome',
            plan: resolvedPlan,
            createdAt: createdAtIso || undefined,
            active: !userDoc.data()?.disabled,
            isAdmin: userDoc.data()?.isAdmin || false,
            totalBirds: birdsSnapshot.size,
            lastLogin: lastLoginIso || undefined,
            subscriptionStatus: userDoc.data()?.subscriptionStatus || 'inactive',
            // Dados do settings (endereço e contato) - usando nomes corretos
                // Calcular dias restantes e tipo de período
                subscriptionEndDate: normalizeDate(userSettings.subscriptionEndDate) || undefined,
                subscriptionCancelAtPeriodEnd: userSettings.subscriptionCancelAtPeriodEnd || false,
                subscriptionDaysRemaining: userSettings.subscriptionEndDate 
                  ? Math.ceil((new Date(userSettings.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : undefined,
                subscriptionPeriodType: userSettings.subscriptionEndDate 
                  ? getSubscriptionPeriodType(userSettings.subscriptionEndDate)
                  : undefined,
                subscriptionProvider: userSettings.subscriptionProvider || userDoc.data()?.subscriptionProvider || undefined,
                subscriptionMonths: userSettings.subscriptionMonths || userDoc.data()?.subscriptionMonths || undefined,
            endereco: userSettings.addressStreet || undefined,
            numero: userSettings.addressNumber || undefined,
            complemento: userSettings.addressComplement || undefined,
            bairro: userSettings.addressNeighborhood || undefined,
            cidade: userSettings.addressCity || undefined,
            uf: userSettings.addressState || undefined,
            cep: userSettings.addressCep || undefined,
            celular: userSettings.breederMobile || undefined,
            site: userSettings.breederWebsite || undefined,
            responsavel: userSettings.responsibleName || undefined,
            categoria: userSettings.breederCategory || undefined,
          });
        }

        setUsers(usersData);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filtrar e ordenar usuários
  const filteredUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const matchSearch =
        user.breederName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && user.active) ||
        (filterStatus === 'inactive' && !user.active);

      return matchSearch && matchStatus;
    });

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.breederName.localeCompare(b.breederName);
      } else if (sortBy === 'plan') {
        const planOrder = { 'Profissional': 3, 'Básico': 1 };
        return (
          (planOrder[b.plan as keyof typeof planOrder] || 0) -
          (planOrder[a.plan as keyof typeof planOrder] || 0)
        );
      } else {
        // date - mais recentes primeiro
        return (
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      }
    });

    return filtered;
  }, [users, searchTerm, filterStatus, sortBy]);

  // Funções de ação
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        disabled: !currentStatus,
        updatedAt: Timestamp.now(),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, active: !u.active } : u
        )
      );

      toast.success(
        currentStatus ? 'Usuário desabilitado' : 'Usuário habilitado'
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: true,
        updatedAt: Timestamp.now(),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isAdmin: true } : u
        )
      );

      toast.success('Usuário promovido a administrador');
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, isAdmin: true });
      }
    } catch (error) {
      console.error('Erro ao promover:', error);
      toast.error('Erro ao promover usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const setAdminOnlyFlag = async (userId: string, value: boolean) => {
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        adminOnly: value,
        updatedAt: Timestamp.now(),
      });

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, adminOnly: value } : u)));

      toast.success(value ? 'Conta marcada como administrativa' : 'Conta marcada como normal');
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, adminOnly: value });
      }
    } catch (error) {
      console.error('Erro ao atualizar adminOnly:', error);
      toast.error('Erro ao atualizar flag adminOnly');
    } finally {
      setActionLoading(false);
    }
  };

  const removeAdmin = async (userId: string) => {
    if (userId === currentUserId) {
      toast.error('Você não pode remover suas próprias permissões de admin');
      return;
    }

    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: false,
        updatedAt: Timestamp.now(),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isAdmin: false } : u
        )
      );

      toast.success('Permissões de admin removidas');
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, isAdmin: false });
      }
    } catch (error) {
      console.error('Erro ao remover admin:', error);
      toast.error('Erro ao remover permissões');
    } finally {
      setActionLoading(false);
    }
  };

  const changePlan = async (userId: string, newPlan: 'Básico' | 'Profissional') => {
    setActionLoading(true);
    try {
      // Atualizar o documento principal do usuário
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        plan: newPlan,
        isProActive: newPlan === 'Profissional',
        updatedAt: Timestamp.now(),
      }, { merge: true });

      // Atualizar o documento de settings/preferences
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      const updateData: any = {
        plan: newPlan,
        isProActive: newPlan === 'Profissional',
        updatedAt: Timestamp.now(),
        subscriptionCancelAtPeriodEnd: false,
      };
      
      // Remover trialEndDate se estiver fazendo upgrade (migrar para Profissional)
      if (newPlan === 'Profissional') {
        updateData.trialEndDate = deleteField();
      }

      await setDoc(settingsRef, updateData, { merge: true });

      // Atualizar UI local
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { 
                ...u, 
                plan: newPlan, 
                trialEndDate: newPlan === 'Profissional' ? undefined : u.trialEndDate,
                subscriptionCancelAtPeriodEnd: false 
              }
            : u,
        ),
      );

      toast.success(`Plano alterado para ${newPlan} com sucesso!`);
      
      if (selectedUser?.id === userId) {
        setSelectedUser({
          ...selectedUser,
          plan: newPlan,
          trialEndDate: newPlan === 'Profissional' ? undefined : selectedUser.trialEndDate,
          subscriptionCancelAtPeriodEnd: false,
        });
      }
    } catch (error) {
      console.error('Erro ao mudar plano:', error);
      toast.error('Erro ao mudar plano do usuário. Verifique os logs.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportUsersDetailed = () => {
    const csv = [
      [
        'ID',
        'Nome do Criatório',
        'E-mail',
        'Plano',
        'Trial Até',
        'Status Assinatura',
        'Vencimento Assinatura',
        'Provedor',
        'Meses',
        'Dias Restantes',
        'Renovacao Cancelada',
        'Aves',
        'Status',
        'Admin',
        'AdminOnly',
        'Data Criação',
        'Último Acesso',
      ].join(','),
      ...filteredUsers.map((u) =>
        [
          u.id,
          `"${u.breederName}"`,
          u.email || '',
          u.plan,
          u.trialEndDate ? new Date(u.trialEndDate).toLocaleDateString('pt-BR') : '',
          u.subscriptionStatus || '',
          u.subscriptionEndDate ? new Date(u.subscriptionEndDate).toLocaleDateString('pt-BR') : '',
          u.subscriptionProvider || '',
          u.subscriptionMonths ?? '',
          u.subscriptionDaysRemaining ?? '',
          u.subscriptionCancelAtPeriodEnd ? 'Sim' : 'Não',
          u.totalBirds || 0,
          u.active ? 'Ativo' : 'Inativo',
          u.isAdmin ? 'Sim' : 'Não',
          u.adminOnly ? 'Sim' : 'Não',
          u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '',
          u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `relatorio_completo_usuarios_${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Relatório completo exportado com sucesso');
  };

  const exportUsers = () => {
    const csv = [
      ['ID', 'Nome do Criatório', 'Plano', 'Aves', 'Status', 'Admin', 'Data Criação'].join(','),
      ...filteredUsers.map((u) =>
        [
          u.id,
          `"${u.breederName}"`,
          u.plan,
          u.totalBirds || 0,
          u.active ? 'Ativo' : 'Inativo',
          u.isAdmin ? 'Sim' : 'Não',
          u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_avigestao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Usuários exportados com sucesso');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Gerenciamento de Usuários</h1>
          <p className="text-slate-600 mt-1">
            Total: <span className="font-bold">{filteredUsers.length}</span> usuários
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportUsersDetailed}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold"
          >
            <Download size={20} />
            Relatório completo
          </button>
          <button
            onClick={exportUsers}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-semibold"
          >
            <Download size={20} />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
          >
            <option value="date">Por Data (Recentes)</option>
            <option value="name">Por Nome</option>
            <option value="plan">Por Plano</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Criador
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Plano
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Aves
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Admin
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{user.breederName}</span>
                        <span className="text-xs text-slate-500 font-mono">{user.id}</span>
                        {user.email && (
                          <span className="text-xs text-slate-500">{user.email}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          user.plan === 'Profissional'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        {user.plan}
                      </span>
                      {isTrialActive(user.trialEndDate) && (
                        <span className="ml-2 inline-block px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          Trial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{user.totalBirds || 0}</td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                          <CheckCircle2 size={18} />
                          Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                          <XCircle size={18} />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isAdmin && (
                        <span className="flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-1 rounded-lg text-xs font-bold w-fit">
                          <Shield size={14} />
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetails(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Visualizar detalhes"
                        >
                          <Eye size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.active)}
                          disabled={actionLoading}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={user.active ? 'Desabilitar acesso' : 'Habilitar acesso'}
                        >
                          {user.active ? (
                            <Lock size={18} className="text-amber-600" />
                          ) : (
                            <Unlock size={18} className="text-green-600" />
                          )}
                        </button>
                        {user.isAdmin ? (
                          <button
                            onClick={() => removeAdmin(user.id)}
                            disabled={actionLoading || user.id === currentUserId}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Remover permissões de admin"
                          >
                            <Shield size={18} className="text-red-600" />
                          </button>
                        ) : (
                          <button
                            onClick={() => promoteToAdmin(user.id)}
                            disabled={actionLoading}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Promover a admin"
                          >
                            <Shield size={18} className="text-slate-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {selectedUser.breederName}
                  </h2>
                  <p className="text-slate-500 font-mono text-sm mt-2">{selectedUser.id}</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Dados Completos do Usuário - Organizado por Seções */}
              <div className="space-y-6">
                
                {/* Informações Pessoais */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <User size={18} />
                    Informações Pessoais
                  </h3>
                  <div className="space-y-2 ml-6">
                    {selectedUser.displayName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Nome Completo:</span>
                        <span className="font-semibold text-slate-900">{selectedUser.displayName}</span>
                      </div>
                    )}
                    {selectedUser.responsavel && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Responsável:</span>
                        <span className="font-semibold text-slate-900">{selectedUser.responsavel}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Criador/Apelido:</span>
                      <span className="font-semibold text-slate-900">{selectedUser.breederName}</span>
                    </div>
                    {selectedUser.categoria && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Categoria:</span>
                        <span className="font-semibold text-slate-900">{selectedUser.categoria}</span>
                      </div>
                    )}
                    {selectedUser.email && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">E-mail:</span>
                        <span className="font-mono text-slate-900 break-all">{selectedUser.email}</span>
                      </div>
                    )}
                    {selectedUser.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Telefone:</span>
                        <span className="font-semibold text-slate-900">{selectedUser.phone}</span>
                      </div>
                    )}
                    {selectedUser.celular && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Celular:</span>
                        <span className="font-semibold text-slate-900">{selectedUser.celular}</span>
                      </div>
                    )}
                    {selectedUser.site && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Site:</span>
                        <span className="font-mono text-blue-600 text-sm break-all">{selectedUser.site}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">ID da Conta:</span>
                      <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{selectedUser.id}</span>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                {(selectedUser.endereco || selectedUser.cep || selectedUser.cidade) && (
                  <div className="space-y-3 border-b border-slate-200 pb-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      📍 Endereço
                    </h3>
                    <div className="space-y-2 ml-6">
                      {selectedUser.cep && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">CEP:</span>
                          <span className="font-semibold text-slate-900">{selectedUser.cep}</span>
                        </div>
                      )}
                      {selectedUser.endereco && (
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 text-sm">Rua:</span>
                          <span className="font-semibold text-slate-900 text-right max-w-[60%]">{selectedUser.endereco}</span>
                        </div>
                      )}
                      {selectedUser.numero && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">Número:</span>
                          <span className="font-semibold text-slate-900">{selectedUser.numero}</span>
                        </div>
                      )}
                      {selectedUser.complemento && (
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 text-sm">Complemento:</span>
                          <span className="font-semibold text-slate-900 text-right max-w-[60%]">{selectedUser.complemento}</span>
                        </div>
                      )}
                      {selectedUser.bairro && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">Bairro:</span>
                          <span className="font-semibold text-slate-900">{selectedUser.bairro}</span>
                        </div>
                      )}
                      {(selectedUser.cidade || selectedUser.uf) && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">Cidade/UF:</span>
                          <span className="font-semibold text-slate-900">
                            {selectedUser.cidade}{selectedUser.uf ? ` - ${selectedUser.uf}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status da Conta */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Lock size={18} />
                    Status da Conta
                  </h3>
                  <div className="space-y-2 ml-6">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Acesso:</span>
                      <span className={`font-bold px-3 py-1 rounded-full text-xs ${selectedUser.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedUser.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Administrador:</span>
                      <span className={`font-bold px-3 py-1 rounded-full text-xs ${selectedUser.isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {selectedUser.isAdmin ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    {selectedUser.adminOnly && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Modo Admin:</span>
                        <span className="font-bold px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                          Apenas Administrativo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plano e Assinatura */}
                <div className="space-y-3 border-b border-slate-200 pb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Zap size={18} />
                    Plano e Assinatura
                  </h3>
                  <div className="space-y-2 ml-6">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Plano Atual:</span>
                      <span className={`font-bold px-3 py-1 rounded-full text-xs ${selectedUser.plan === 'Profissional' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {selectedUser.plan}
                      </span>
                    </div>
                    {selectedUser.subscriptionStatus && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Status Assinatura:</span>
                        <span className="font-semibold text-slate-900">{selectedUser.subscriptionStatus}</span>
                      </div>
                    )}
                    {isTrialActive(selectedUser.trialEndDate) && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Período Teste Até:</span>
                        <span className="font-semibold text-slate-900">
                          {selectedUser.trialEndDate
                            ? new Date(selectedUser.trialEndDate).toLocaleDateString('pt-BR')
                            : ''}
                        </span>
                      </div>
                    )}

                    {/* Assinatura: provider, tipo, vencimento e dias restantes */}
                    {selectedUser.subscriptionEndDate && (
                      <>
                        {selectedUser.subscriptionProvider && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">Pagamento via:</span>
                            <span className="font-semibold text-slate-900">{getProviderLabel(selectedUser.subscriptionProvider)}</span>
                          </div>
                        )}
                        {selectedUser.subscriptionMonths && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">Período contratado:</span>
                            <span className="font-semibold text-slate-900">{selectedUser.subscriptionMonths} mês(es) — {selectedUser.subscriptionPeriodType}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">Tipo de Período:</span>
                          <span className="font-bold px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                            {selectedUser.subscriptionPeriodType || 'Desconhecido'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">Vencimento:</span>
                          <span className="font-semibold text-slate-900">
                            {new Date(selectedUser.subscriptionEndDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">Tempo Restante:</span>
                          <span className={`font-bold px-3 py-1 rounded-full text-xs ${
                            selectedUser.subscriptionDaysRemaining && selectedUser.subscriptionDaysRemaining > 0 
                              ? selectedUser.subscriptionDaysRemaining > 30 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedUser.subscriptionDaysRemaining ? `${selectedUser.subscriptionDaysRemaining} dias` : 'Expirada'}
                          </span>
                        </div>
                        {selectedUser.subscriptionCancelAtPeriodEnd && (
                          <div className="flex justify-between items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                            <span className="text-slate-600 text-sm">Status Renovação:</span>
                            <span className="font-bold text-amber-700 text-sm">❌ Cancelada</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Dados de Criação e Uso */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={18} />
                    Histórico
                  </h3>
                  <div className="space-y-2 ml-6">
                    {selectedUser.createdAt && !isNaN(new Date(selectedUser.createdAt).getTime()) && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Cadastrado em:</span>
                        <span className="font-semibold text-slate-900">
                          {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {selectedUser.lastLogin && !isNaN(new Date(selectedUser.lastLogin).getTime()) && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Último Acesso:</span>
                        <span className="font-semibold text-slate-900">
                          {new Date(selectedUser.lastLogin).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Total de Aves:</span>
                      <span className="font-bold text-slate-900 text-lg">{selectedUser.totalBirds || 0}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Ações */}
              <div className="space-y-3 border-t border-slate-200 pt-6">
                <h3 className="font-bold text-slate-900">Ações</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => toggleUserStatus(selectedUser.id, selectedUser.active)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-100 text-amber-900 rounded-xl hover:bg-amber-200 transition-all font-bold disabled:opacity-50"
                  >
                    {selectedUser.active ? (
                      <>
                        <Lock size={20} />
                        Desabilitar Acesso
                      </>
                    ) : (
                      <>
                        <Unlock size={20} />
                        Habilitar Acesso
                      </>
                    )}
                  </button>

                  {selectedUser.isAdmin ? (
                    <button
                      onClick={() => removeAdmin(selectedUser.id)}
                      disabled={actionLoading || selectedUser.id === currentUserId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-900 rounded-xl hover:bg-red-200 transition-all font-bold disabled:opacity-50"
                    >
                      <Shield size={20} />
                      Remover Permissões de Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => promoteToAdmin(selectedUser.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-900 rounded-xl hover:bg-blue-200 transition-all font-bold disabled:opacity-50"
                    >
                      <Shield size={20} />
                      Promover a Admin
                    </button>
                  )}

                  {/* Admin-only toggle (accounts that only administer site) */}
                  <button
                    onClick={() => setAdminOnlyFlag(selectedUser.id, !selectedUser.adminOnly)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 transition-all font-bold disabled:opacity-50"
                  >
                    {selectedUser.adminOnly ? (
                      <>
                        <Shield size={20} />
                        Remover modo administrativo
                      </>
                    ) : (
                      <>
                        <Shield size={20} />
                        Marcar como conta administrativa
                      </>
                    )}
                  </button>

                  {selectedUser.plan === 'Básico' ? (
                    <button
                      onClick={() => changePlan(selectedUser.id, 'Profissional')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-bold disabled:opacity-50"
                    >
                      <Zap size={20} />
                      Upgrade para Profissional
                    </button>
                  ) : (
                    <button
                      onClick={() => changePlan(selectedUser.id, 'Básico')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-900 rounded-xl hover:bg-slate-300 transition-all font-bold disabled:opacity-50"
                    >
                      <Zap size={20} />
                      Downgrade para Básico
                    </button>
                  )}
                </div>
              </div>

              {/* Warning */}
              {selectedUser.id === currentUserId && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <AlertTriangle size={20} className="text-blue-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900 font-semibold">
                    Este é o seu usuário. Algumas ações estão desabilitadas por segurança.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
