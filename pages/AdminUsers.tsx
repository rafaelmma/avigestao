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
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { BreederSettings } from '../types';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email?: string;
  breederName: string;
  plan: string;
  createdAt?: string;
  active: boolean;
  isAdmin: boolean;
  totalBirds?: number;
  lastLogin?: string;
  subscriptionStatus?: string;
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
          
          // Pegar settings do usuário
          const settingsRef = collection(db, `users/${userId}/settings`);
          const settingsSnapshot = await getDocs(settingsRef);
          
          let userSettings: Partial<BreederSettings> = {
            breederName: 'Sem Nome',
            plan: 'Básico',
          };

          if (settingsSnapshot.docs.length > 0) {
            const settingsDoc = settingsSnapshot.docs[0];
            userSettings = settingsDoc.data() as Partial<BreederSettings>;
          }

          // Contar aves
          const birdsRef = collection(db, `users/${userId}/birds`);
          const birdsSnapshot = await getDocs(birdsRef);

          usersData.push({
            id: userId,
            breederName: userSettings.breederName || 'Sem Nome',
            plan: userSettings.plan || 'Básico',
            createdAt: userDoc.data()?.createdAt,
            active: !userDoc.data()?.disabled,
            isAdmin: userDoc.data()?.isAdmin || false,
            totalBirds: birdsSnapshot.size,
            lastLogin: userDoc.data()?.lastLogin,
            subscriptionStatus: userDoc.data()?.subscriptionStatus || 'inactive',
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
    try {
      setActionLoading(true);
      const userRef = doc(db, 'users', userId);
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      
      // Atualizar em ambos os locais
      await Promise.all([
        updateDoc(userRef, {
          plan: newPlan,
          updatedAt: Timestamp.now(),
        }),
        updateDoc(settingsRef, {
          plan: newPlan,
          updatedAt: Timestamp.now(),
        }),
      ]);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, plan: newPlan } : u
        )
      );

      toast.success(`Plano alterado para ${newPlan}`);
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, plan: newPlan });
      }
    } catch (error) {
      console.error('Erro ao mudar plano:', error);
      toast.error('Erro ao mudar plano do usuário');
    } finally {
      setActionLoading(false);
    }
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
        <button
          onClick={exportUsers}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-semibold"
        >
          <Download size={20} />
          Exportar
        </button>
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

              {/* Informações Gerais */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Plano:</span>
                  <span className="font-bold text-slate-900">{selectedUser.plan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Aves:</span>
                  <span className="font-bold text-slate-900">{selectedUser.totalBirds || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Status:</span>
                  <span className={`font-bold ${selectedUser.active ? 'text-green-700' : 'text-red-700'}`}>
                    {selectedUser.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {selectedUser.createdAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold">Membro desde:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {selectedUser.lastLogin && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold">Último acesso:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(selectedUser.lastLogin).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Admin:</span>
                  <span className={`font-bold ${selectedUser.isAdmin ? 'text-blue-700' : 'text-slate-500'}`}>
                    {selectedUser.isAdmin ? 'Sim' : 'Não'}
                  </span>
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
