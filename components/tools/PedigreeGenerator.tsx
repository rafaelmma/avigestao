import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Loader } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { savePedigree, getPedigreeData, PedigreeNodeData } from '../../lib/libraryService';

interface Bird {
  id: string;
  name: string;
  sex?: string;
  birthDate?: string;
  colorMutation?: string;
}

interface PedigreeNode {
  id: string;
  name: string;
  gender: 'M' | 'F';
  year: number;
  color?: string;
  parent1?: string;
  parent2?: string;
}

interface PedigreeGeneratorProps {
  onBack: () => void;
}

const PedigreeGenerator: React.FC<PedigreeGeneratorProps> = ({ onBack }) => {
  const [birds, setBirds] = useState<Bird[]>([]);
  const [selectedBirdId, setSelectedBirdId] = useState<string>('');
  const [pedigreeTree, setPedigreeTree] = useState<PedigreeNode[]>([]);
  const [activeNode, setActiveNode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M' as 'M' | 'F',
    year: new Date().getFullYear(),
    color: ''
  });

  // Carregar pássaros do usuário
  useEffect(() => {
    loadUserBirds();
  }, []);

  // Quando selecionar um pássaro, carregar seu pedigree
  useEffect(() => {
    if (selectedBirdId) {
      loadBirdPedigree(selectedBirdId);
    }
  }, [selectedBirdId]);

  const loadUserBirds = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const birdsRef = collection(db, 'users', user.uid, 'birds');
      const q = query(birdsRef, where('status', '!=', 'Vendido'));
      const snap = await getDocs(q);
      
      const userBirds = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        sex: doc.data().sex,
        birthDate: doc.data().birthDate,
        colorMutation: doc.data().colorMutation
      }));

      setBirds(userBirds);
      if (userBirds.length > 0) {
        setSelectedBirdId(userBirds[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar pássaros:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBirdPedigree = async (birdId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const pedigreeData = await getPedigreeData(user.uid, birdId);
      
      if (pedigreeData && pedigreeData.ancestors && pedigreeData.ancestors.length > 0) {
        const bird = birds.find(b => b.id === birdId);
        const birthYear = bird?.birthDate ? parseInt(bird.birthDate.split('-')[0]) : new Date().getFullYear();
        
        const rootNode: PedigreeNode = {
          id: birdId,
          name: bird?.name || 'Seu Pássaro',
          gender: (bird?.sex === 'F' ? 'F' : 'M') as 'M' | 'F',
          year: birthYear,
          color: bird?.colorMutation
        };
        
        setPedigreeTree([rootNode, ...pedigreeData.ancestors]);
        setActiveNode(birdId);
      } else {
        const bird = birds.find(b => b.id === birdId);
        if (bird) {
          const birthYear = bird.birthDate ? parseInt(bird.birthDate.split('-')[0]) : new Date().getFullYear();
          const rootNode: PedigreeNode = {
            id: birdId,
            name: bird.name,
            gender: (bird.sex === 'F' ? 'F' : 'M') as 'M' | 'F',
            year: birthYear,
            color: bird.colorMutation
          };
          setPedigreeTree([rootNode]);
          setActiveNode(birdId);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar pedigree:', error);
    }
  };

  const handleSelectBird = (birdId: string) => {
    setSelectedBirdId(birdId);
    setFormData({ name: '', gender: 'M', year: new Date().getFullYear(), color: '' });
  };

  const addAncestor = (parentType: 'parent1' | 'parent2') => {
    if (!formData.name.trim() || !activeNode) return;

    const newAncestor: PedigreeNode = {
      id: `${activeNode}-${parentType}-${Date.now()}`,
      name: formData.name,
      gender: formData.gender,
      year: formData.year,
      ...(formData.color && { color: formData.color }) // Só inclui color se não vazio
    };

    // Adicionar à árvore
    setPedigreeTree(prev => [...prev, newAncestor]);

    // Atualize o nó ativo para ter este novo ancestral como pai
    setPedigreeTree(prev =>
      prev.map(node =>
        node.id === activeNode
          ? { ...node, [parentType]: newAncestor.id }
          : node
      )
    );

    // Limpar formulário
    setFormData({ name: '', gender: 'M', year: new Date().getFullYear(), color: '' });
  };

  const removeNode = (nodeId: string) => {
    // Remover nó da árvore
    setPedigreeTree(prev => prev.filter(n => n.id !== nodeId));

    // Remover referencias a este nó
    setPedigreeTree(prev =>
      prev.map(node => ({
        ...node,
        parent1: node.parent1 === nodeId ? undefined : node.parent1,
        parent2: node.parent2 === nodeId ? undefined : node.parent2
      }))
    );
  };

  const currentNode = pedigreeTree.find(n => n.id === activeNode);

  const savePedigreeData = async () => {
    const user = auth.currentUser;
    if (!user || !selectedBirdId) return;

    setSaving(true);
    try {
      // Filtrar ancestrais e remover o pássaro principal
      const ancestors = pedigreeTree
        .filter(n => n.id !== selectedBirdId)
        .map(n => ({
          id: n.id,
          name: n.name,
          gender: n.gender,
          year: n.year,
          ...(n.color && { color: n.color }), // Só inclui color se existir
          ...(n.parent1 && { parent1: n.parent1 }), // Só inclui parent1 se existir
          ...(n.parent2 && { parent2: n.parent2 }) // Só inclui parent2 se existir
        }));
      
      await savePedigree(user.uid, selectedBirdId, ancestors);
      alert('✅ Pedigree salvo com sucesso no Firebase!');
    } catch (error) {
      console.error('Erro ao salvar pedigree:', error);
      alert('❌ Erro ao salvar. Verifique o console.');
    } finally {
      setSaving(false);
    }
  };

  const getAncestors = (nodeId: string, level: number = 0): PedigreeNode[] => {
    if (level > 3) return [];
    const node = pedigreeTree.find(n => n.id === nodeId);
    if (!node) return [];

    let ancestors: PedigreeNode[] = [];
    if (node.parent1) {
      const parent = pedigreeTree.find(n => n.id === node.parent1);
      if (parent) {
        ancestors.push(parent);
        ancestors = ancestors.concat(getAncestors(parent.id, level + 1));
      }
    }
    if (node.parent2) {
      const parent = pedigreeTree.find(n => n.id === node.parent2);
      if (parent) {
        ancestors.push(parent);
        ancestors = ancestors.concat(getAncestors(parent.id, level + 1));
      }
    }
    return ancestors;
  };

  const ancestors = getAncestors(activeNode);
  const consanguinityRisk = new Set(ancestors).size < ancestors.length;
  const colors = ['Amarelo', 'Cinzento', 'Camurça', 'Preto', 'Verde', 'Azul'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold mb-4"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[40px] p-8 border border-purple-100">
        <h1 className="text-4xl font-black text-slate-900 mb-2">🧬 Gerador de Pedigree</h1>
        <p className="text-slate-600">Construa a genealogia do seu pássaro e monitore consanguinidade</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <Loader size={32} className="animate-spin mx-auto text-blue-600" />
            <p className="text-slate-600 font-semibold">Carregando seus pássaros...</p>
          </div>
        </div>
      ) : birds.length === 0 ? (
        <div className="bg-orange-50 rounded-[30px] p-8 border-2 border-orange-200 text-center">
          <p className="text-lg font-bold text-orange-900 mb-2">📭 Nenhum pássaro encontrado</p>
          <p className="text-orange-700">Você precisa criar pássaros no "Meu Plantel" antes de gerar um pedigree</p>
        </div>
      ) : (
        <>
          {/* Seletor de Pássaro */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-[30px] p-6 border-2 border-indigo-200">
            <label className="block font-black text-indigo-900 mb-3">👤 Selecione o Pássaro:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {birds.map(bird => (
                <button
                  key={bird.id}
                  onClick={() => handleSelectBird(bird.id)}
                  className={`p-4 rounded-xl font-bold transition-all text-left ${
                    selectedBirdId === bird.id
                      ? 'bg-indigo-600 text-white shadow-lg border-2 border-indigo-700'
                      : 'bg-white text-slate-900 border-2 border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  <div className="font-black text-base">{bird.name}</div>
                  <div className={`text-sm mt-1 ${selectedBirdId === bird.id ? 'text-indigo-100' : 'text-slate-600'}`}>
                    {bird.sex || '?'} • {bird.birthDate?.split('-')[0] || 'Ano desconhecido'}
                  </div>
                  {bird.colorMutation && (
                    <div className={`text-xs mt-1 ${selectedBirdId === bird.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                      🎨 {bird.colorMutation}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tutorial Expandido */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-[30px] p-8 border-3 border-cyan-300">
            <h3 className="font-black text-2xl text-cyan-900 mb-4">🎯 Como Funciona o Pedigree</h3>

            {/* Explicação Visual */}
            <div className="bg-white rounded-2xl p-6 border border-cyan-200 mb-6">
              <h4 className="font-black text-slate-900 mb-4">📚 O que é Pedigree?</h4>
              <p className="text-sm text-slate-700 mb-4">
                É a <strong>árvore familiar do seu pássaro</strong>. Você começa com seu pássaro no centro, depois adiciona o pai e a mãe, e depois pode adicionar os avós deles:
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <span className="text-xl">👑</span>
                  <div>
                    <p className="font-bold text-slate-900">SEU PÁSSARO (Ex: "Sony")</p>
                    <p className="text-xs text-slate-600">É o ponto central da árvore</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <span className="text-xl">♂ ♀</span>
                  <div>
                    <p className="font-bold text-slate-900">PAIS (1º geração)</p>
                    <p className="text-xs text-slate-600">Nome, gênero e ano dos pais biológicos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-pink-50 p-3 rounded-xl border border-pink-200">
                  <span className="text-xl">👴👵</span>
                  <div>
                    <p className="font-bold text-slate-900">AVÓS (2º geração)</p>
                    <p className="text-xs text-slate-600">Depois você pode adicionar os pais dos pais</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Passo a Passo */}
            <div className="space-y-3">
              <h4 className="font-black text-slate-900 mb-3">📋 Passo a Passo Rápido:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border-2 border-blue-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm">1</span>
                    <h5 className="font-black text-slate-900 text-sm">Escolha Pássaro</h5>
                  </div>
                  <p className="text-xs text-slate-700">☝️ Clique em um acima para selecioná-lo</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border-2 border-purple-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm">2</span>
                    <h5 className="font-black text-slate-900 text-sm">Preencha Dados</h5>
                  </div>
                  <p className="text-xs text-slate-700">✏️ Nome, gênero, ano do pai/mãe</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border-2 border-pink-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-black text-sm">3</span>
                    <h5 className="font-black text-slate-900 text-sm">Adicione PAI/MÃE</h5>
                  </div>
                  <p className="text-xs text-slate-700">➕ Clique no botão para adicionar à árvore</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border-2 border-green-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-sm">4</span>
                    <h5 className="font-black text-slate-900 text-sm">Clique em Pai/Mãe</h5>
                  </div>
                  <p className="text-xs text-slate-700">🖱️ Para adicionar os avós deles</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border-2 border-amber-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-black text-sm">5</span>
                    <h5 className="font-black text-slate-900 text-sm">Repita Quantas Vezes</h5>
                  </div>
                  <p className="text-xs text-slate-700">🌳 Construa gerações inteiras</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border-2 border-red-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-sm">6</span>
                    <h5 className="font-black text-slate-900 text-sm">Salve Tudo!</h5>
                  </div>
                  <p className="text-xs text-slate-700">💾 Clique em Salvar Pedigree</p>
                </div>
              </div>
            </div>

            {/* Dica */}
            <div className="bg-yellow-50 rounded-2xl p-4 border-2 border-yellow-400 flex gap-3 mt-4">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-black text-yellow-900">Não precisa preencher tudo agora!</p>
                <p className="text-sm text-yellow-800">Comece adicionando apenas pai e mãe. Depois, você volta e adiciona os avós paternos, avós maternos, etc. Tudo fica salvo no Firebase!</p>
              </div>
            </div>
          </div>

          {/* ⭐ SEÇÃO EXPLICATIVA: DE ONDE VÊM OS DADOS ⭐ */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-[30px] p-8 border-4 border-red-400">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔍</span>
              <h3 className="font-black text-2xl text-red-900">Entenda: De Onde Vêm os Dados?</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-red-300 mb-6">
              <p className="text-lg font-black text-red-900 mb-4">⭐ CONCEITO IMPORTANTE:</p>
              <p className="text-base text-slate-800 mb-4 leading-relaxed">
                O Pedigree é <strong>100% MANUAL</strong>. O sistema <strong>NÃO busca dados</strong> de lugar nenhum. <strong>VOCÊ digita tudo</strong> manualmente!
              </p>

              <div className="space-y-4 mt-6">
                <div className="bg-red-50 rounded-2xl p-5 border-2 border-red-200">
                  <h4 className="font-black text-red-900 mb-2">❌ Como NÃO funciona:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span>❌</span>
                      <span><strong>Sistema busca</strong> informações de outro lugar</span>
                    </li>
                    <li className="flex gap-2">
                      <span>❌</span>
                      <span><strong>Banco de dados</strong> com pais dos pássaros</span>
                    </li>
                    <li className="flex gap-2">
                      <span>❌</span>
                      <span><strong>Automático</strong> - você não precisa digitar</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 rounded-2xl p-5 border-2 border-green-200">
                  <h4 className="font-black text-green-900 mb-2">✅ Como REALMENTE funciona:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span><strong>VOCÊ digita</strong> o nome do pai ou mãe no formulário</span>
                    </li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span><strong>VOCÊ escolhe</strong> se é pai (♂) ou mãe (♀)</span>
                    </li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span><strong>VOCÊ preenche</strong> o ano de nascimento</span>
                    </li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span><strong>Sistema salva</strong> tudo no Firebase (seu banco de dados pessoal)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-300">
                <p className="font-black text-blue-900 mb-2">📝 Exemplo REAL:</p>
                <div className="bg-white rounded-xl p-4 border border-blue-200 space-y-2 mt-2">
                  <p className="text-sm"><strong>Seu Pássaro:</strong> Sony (2025)</p>
                  <p className="text-sm text-slate-600">↓ Você digita:</p>
                  <p className="text-sm"><strong>Pai:</strong> Rio Quente (♂ 2024)</p>
                  <p className="text-sm"><strong>Mãe:</strong> Canária Maria (♀ 2022)</p>
                  <p className="text-xs text-slate-500 mt-3">💡 Sistema salva isso no Firebase para você</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-2xl p-5 border border-purple-300">
                <p className="font-black text-purple-900 mb-2">🎯 Por que MANUAL?</p>
                <ul className="space-y-1 text-sm text-slate-800 mt-2">
                  <li>🏠 <strong>Você é quem sabe</strong> quem são os pais</li>
                  <li>📖 <strong>Você tem o registro</strong> ou documentação</li>
                  <li>🐦 <strong>Pássaros variam</strong> - sem banco central</li>
                  <li>⏰ <strong>Rápido e fácil</strong> - você digita e pronto!</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-2xl p-4 border-2 border-yellow-400 mt-6 flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-black text-yellow-900">Resumo Final:</p>
                <p className="text-sm text-yellow-800 mt-1">
                  <strong>Não há "busca"</strong> em lugar nenhum. VOCÊ digita os dados do pai e mãe que conhece. Sistema salva no Firebase. Pronto! 🎉
                </p>
              </div>
            </div>
          </div>

          {/* Main Grid: Form + Tree */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6">
              {/* Bird/Ancestor Selected Card */}
              {selectedBirdId && birds.length > 0 && (
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 border-2 border-purple-300">
                  <p className="text-xs font-bold text-purple-700 uppercase mb-3">👑 Base da Árvore</p>
                  <h3 className="text-xl font-black text-purple-900">{birds.find(b => b.id === selectedBirdId)?.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {birds.find(b => b.id === selectedBirdId)?.sex && (
                      <span className="text-xs font-bold text-purple-800 bg-white px-2 py-1 rounded">
                        {birds.find(b => b.id === selectedBirdId)?.sex === 'M' ? '♂ Macho' : '♀ Fêmea'}
                      </span>
                    )}
                    <span className="text-xs font-bold text-purple-800 bg-white px-2 py-1 rounded">
                      📅 {birds.find(b => b.id === selectedBirdId)?.birthDate?.split('-')[0] || '?'}
                    </span>
                  </div>
                </div>
              )}

              {/* Currently Selected Ancestor Card - Shows when you click an ancestor */}
              {activeNode && activeNode !== selectedBirdId && (
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-6 border-3 border-blue-500 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">👈 SELECIONADO</span>
                  </div>
                  <p className="text-xs font-bold text-blue-700 uppercase mb-2 tracking-wider">Próximo PAI/MÃE será para:</p>
                  {pedigreeTree.find(n => n.id === activeNode) && (
                    <>
                      <h3 className="text-2xl font-black text-blue-900">{pedigreeTree.find(n => n.id === activeNode)?.name}</h3>
                      <p className="text-blue-800 mt-2 font-bold">
                        {pedigreeTree.find(n => n.id === activeNode)?.gender === 'M' ? '♂ Macho' : '♀ Fêmea'} • {pedigreeTree.find(n => n.id === activeNode)?.year}
                      </p>
                      <div className="mt-4 pt-4 border-t-2 border-blue-300 space-y-1">
                        <p className="text-xs text-blue-700">
                          ➕ Preencha o formulário abaixo para adicionar o <strong>pai ou mãe</strong> deste pássaro
                        </p>
                        <p className="text-xs text-blue-600 font-semibold">
                          💡 Você está criando a próxima geração acima: avós do pássaro principal!
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 border border-purple-200 mb-4">
                <h2 className="text-lg font-black text-purple-900 mb-1">✏️ Adicione um Ancestral</h2>
                <p className="text-xs text-purple-800">
                  {activeNode === selectedBirdId ? 'Digite aqui o pai ou mãe do seu pássaro' : 'Digite aqui o pai ou mãe do pássaro acima'}
                </p>
              </div>

              {/* Aviso sobre dados manuais */}
              <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-300">
                <p className="text-sm font-black text-blue-900 mb-2">👉 Você está DIGITANDO as informações:</p>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>✍️ Digite o <strong>nome</strong> do pai ou mãe que VOCÊ SABE</li>
                  <li>⚧️ Escolha se é <strong>pai (♂) ou mãe (♀)</strong></li>
                  <li>📅 <strong>Ano</strong> que você conhece ou achu</li>
                  <li>💾 Sistema salva no Firebase para você!</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-black text-slate-900 mb-2">📝 Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Rio Quente ou Maria"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-900 mb-2">⚧️ É Pai ou Mãe?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormData({ ...formData, gender: 'M' })}
                      className={`py-3 rounded-xl font-black transition-all ${
                        formData.gender === 'M'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      ♂ PAI
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, gender: 'F' })}
                      className={`py-3 rounded-xl font-black transition-all ${
                        formData.gender === 'F'
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      ♀ MÃE
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-slate-900 mb-2">📅 Ano</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-900 mb-2">🎨 Cor (opcional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`py-2 px-2 rounded-lg font-bold text-xs transition-all ${
                          formData.color === color
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <div className={`p-3 rounded-xl border-2 ${activeNode === selectedBirdId ? 'bg-purple-50 border-purple-300' : 'bg-blue-50 border-blue-300'}`}>
                    <p className="text-xs font-bold mb-1">
                      {activeNode === selectedBirdId ? '📌 Adicionando ao pássaro principal' : '📌 Adicionando como ancestral'}
                    </p>
                    <p className={`text-xs ${activeNode === selectedBirdId ? 'text-purple-700' : 'text-blue-700'}`}>
                      ➡️ O próximo ancestral será <strong>{activeNode === selectedBirdId ? 'filho do pássaro principal' : 'filho do pássaro selecionado acima'}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => addAncestor('parent1')}
                    disabled={!formData.name.trim()}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={18} />
                    Adicionar ♂ PAI
                  </button>
                  <button
                    onClick={() => addAncestor('parent2')}
                    disabled={!formData.name.trim()}
                    className="w-full py-3 bg-pink-600 text-white rounded-xl font-black hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={18} />
                    Adicionar ♀ MÃE
                  </button>
                </div>
              </div>

              {consanguinityRisk && ancestors.length > 2 && (
                <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-xl">
                  <p className="text-xs font-bold text-orange-900">⚠️ Consanguinidade detectada!</p>
                </div>
              )}
            </div>

            {/* Tree Section */}
            <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 space-y-4">
              <h2 className="text-2xl font-black text-slate-900">🌳 Árvore Genealógica</h2>

              {pedigreeTree.length === 0 ? (
                <div className="p-8 bg-blue-50 rounded-2xl text-center border-2 border-blue-200">
                  <p className="text-4xl mb-2">🌱</p>
                  <p className="font-black text-blue-900 mb-2">Comece a construir sua árvore!</p>
                  <p className="text-sm text-blue-800">Preencha o formulário à esquerda e adicione o pai ou mãe</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {/* Bird Principal */}
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 border-2 border-purple-400">
                    <p className="text-xs font-bold text-purple-700 uppercase mb-2">👑 Pássaro Principal</p>
                    <div
                      onClick={() => setActiveNode(pedigreeTree[0]?.id || '')}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        activeNode === pedigreeTree[0]?.id
                          ? 'bg-white border-2 border-purple-600'
                          : 'bg-white border-2 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <h3 className="font-black text-slate-900">{pedigreeTree[0]?.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {pedigreeTree[0]?.gender === 'M' ? '♂' : '♀'} • {pedigreeTree[0]?.year}
                      </p>
                    </div>
                  </div>

                  {/* Ancestrais */}
                  {ancestors.length > 0 && (
                    <>
                      <div className="border-t-2 border-slate-200 pt-4">
                        <p className="text-sm font-black text-slate-900 mb-3">📜 {ancestors.length} Ancestral{ancestors.length !== 1 ? 'es' : ''}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {ancestors.map(ancestor => (
                            <div
                              key={ancestor.id}
                              onClick={() => setActiveNode(ancestor.id)}
                              className={`p-4 rounded-xl cursor-pointer transition-all border-2 group ${
                                activeNode === ancestor.id
                                  ? 'bg-blue-100 border-blue-600 shadow-lg ring-2 ring-blue-400'
                                  : 'bg-white border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  {activeNode === ancestor.id && (
                                    <p className="text-xs font-black text-blue-700 mb-1 uppercase">👈 Selecionado</p>
                                  )}
                                  <h4 className="font-black text-slate-900">{ancestor.name}</h4>
                                  <p className="text-xs text-slate-600 mt-1">
                                    {ancestor.gender === 'M' ? '♂ Macho' : '♀ Fêmea'} • {ancestor.year}
                                  </p>
                                  {activeNode === ancestor.id && (
                                    <p className="text-xs text-blue-700 font-semibold mt-2">
                                      ➕ Clique para adicionar seus pais
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNode(ancestor.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-600 mt-3 text-center">👆 Clique em um pássaro para adicionar seus pais</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-[40px] p-8 border-3 border-green-300">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💾</span>
              <h3 className="font-black text-green-900 text-xl">Salve Seu Pedigree</h3>
            </div>

            {ancestors.length === 0 ? (
              <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-300">
                <p className="text-sm text-orange-900 font-bold">⚠️ Adicione pelo menos 1 ancestral para salvar</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={savePedigreeData}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-black hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 border-2 border-green-700 text-lg"
                >
                  {saving ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      💾 Salvar Pedigree
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PedigreeGenerator;
