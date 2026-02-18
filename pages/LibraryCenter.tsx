import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Star, Clock } from 'lucide-react';
import NutritionCalculator from '../components/tools/NutritionCalculator';
import ConsanguinityCalculator from '../components/tools/ConsanguinityCalculator';
import SeasonalCalendar from '../components/tools/SeasonalCalendar';
import ArticleReader from '../components/ArticleReader';
import RegionSelector from '../components/RegionSelector';
import { getLibraryUserSettings, initializeLibraryForUser } from '../lib/libraryService';
import { BrazilianRegion } from '../lib/brazilianRegions';
import { auth } from '../lib/firebase';

type Tab = 'articles' | 'tools';

interface ArticleData {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  author: string;
  featured: boolean;
  excerpt: string;
  content: string;
}

const LibraryCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('articles');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<BrazilianRegion>('Sudeste');
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserLibraryData();
  }, []);

  const loadUserLibraryData = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let settings = await getLibraryUserSettings(user.uid);
      if (!settings) {
        // Inicializar se não existir
        await initializeLibraryForUser(user.uid);
        settings = await getLibraryUserSettings(user.uid);
      }

      if (settings) {
        setUserRegion(settings.region);
        setSavedArticles(settings.savedArticles);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da biblioteca:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = async (region: BrazilianRegion, state?: string) => {
    // Atualizar estado local imediatamente
    setUserRegion(region);
    
    // Recarregar dados do Firebase para garantir sincronização
    const user = auth.currentUser;
    if (user) {
      try {
        const settings = await getLibraryUserSettings(user.uid);
        if (settings) {
          setUserRegion(settings.region);
          setSavedArticles(settings.savedArticles);
        }
      } catch (error) {
        console.error('Erro ao recarregar dados:', error);
      }
    }
  };

  const articles: ArticleData[] = [
    {
      id: 'nutrition-guide',
      title: 'Nutrição Balanceada para Aves de Criadouro',
      category: 'Alimentação',
      difficulty: 'Intermediário',
      estimatedTime: '8 min',
      author: 'AviGestão',
      featured: true,
      excerpt: 'Guia completo sobre nutrição balanceada, suplementação essencial e receitas práticas adaptáveis para diferentes espécies.',
      content: 'Nutrição Balanceada para Aves de Criadouro\n\nA alimentação adequada é a base para manter suas aves saudáveis, ativas e com plumagem brilhante. Este guia é adaptável para diferentes espécies.\n\nComponentes Nutricionais Essenciais\n\nProteínas (20-25%)\n- Essenciais para crescimento e manutenção muscular\n- Fontes: ovos, larvas de inseto, sementes de cânhamo\n- Aumentar durante a muda e reprodução\n\nGorduras (10-15%)\n- Energia concentrada para atividade física\n- Omega-3 e Omega-6 importantes\n- Fontes: sementes de girassol, amendoim\n\nVitaminas e Minerais\n- Cálcio e Fósforo: para ossos e ovos\n- Vitamina A: visão e imunidade\n- Vitamina D: absorção de cálcio\n- Ferro: transporte de oxigênio\n\nReceita Base (Adaptável por Espécie)\n\nMistura de sementes (base 50%)\n- Sementes primárias: 30-40% (variar conforme espécie)\n- Sementes secundárias: 10-20%\n- Sementes especiais: 5-10%\n\nCereais (base 30%)\n- Aveia: 15%\n- Milho/Sorgo: 10%\n- Outros grãos: 5%\n\nProteínas (10-15%)\n- Ovos cozidos: 3-4x por semana\n- Larvas de inseto (seco): 2x por semana\n\nFrutas e Legumes (10-15%)\n- Frutas da estação\n- Vegetais apropriados\n- Variar conforme disponibilidade regional'
    },
    {
      id: 'molt-management',
      title: 'Manejo da Muda - Protocolo Prático',
      category: 'Manejo',
      difficulty: 'Avançado',
      estimatedTime: '12 min',
      author: 'AviGestão',
      featured: true,
      excerpt: 'Tudo sobre muda de penas: período ideal, condições ambientais, alimentação especial e sincronização.',
      content: 'Manejo da Muda - Protocolo Prático\n\nA muda é o período mais crítico do ano. Executá-la corretamente define o sucesso da exibição e preservação da saúde.\n\nO Ciclo Natural da Muda\n\nA muda ocorre no final do inverno/início da primavera, coincidindo com mudanças naturais de luz e temperatura.\n\nFases da Muda\n\nFase 1: Pré-muda\n- Temperatura estável\n- Aumento gradual de luz\n- Iniciar incremento de suplementação\n- Melhorar qualidade nutricional\n\nFase 2: Muda Ativa\n- Queda contínua de penas antigas\n- Crescimento acelerado de penas novas\n- Ave com aparência de plumagem incompleta\n- Demanda máxima de energia\n\nFase 3: Pós-muda\n- Penas totalmente desenvolvidas\n- Repouso vegetativo iniciando\n- Reduzir suplementação gradualmente\n- Preparar para repouso sazonal\n\nCondições Ambientais Ideais\n\nTemperatura: 20-26°C\n- Constante (evitar flutuações abruptas)\n- Evitar correntes de ar frio\n\nUmidade: 50-65%\n- Importante para saúde das penas\n- Banhos frequentes recomendados\n\nFotoperíodo: Aumentar para 13-14 horas\n- Simular primavera natural\n- Usar temporizador'
    },
    {
      id: 'reproduction-guide',
      title: 'Reprodução Responsável - Guia Prático',
      category: 'Reprodução',
      difficulty: 'Avançado',
      estimatedTime: '15 min',
      author: 'AviGestão',
      featured: false,
      excerpt: 'Seleção de casais, estímulos de reprodução, construção de ninhos e cuidados com filhotes.',
      content: 'Reprodução Responsável - Guia Prático\n\nA reprodução controlada e responsável é essencial para a criação sustentável.\n\nSeleção de Casais (Melhoramento Genético)\n\nCritérios de Seleção\n✓ Saúde: Sem deformidades, plumagem perfeita, ativo\n✓ Genética: Características desejadas mantidas\n✓ Compatibilidade: Casais que se aceitam naturalmente\n✓ Pedigree: Evitar problemas de consanguinidade\n\nEstímulos para Reprodução\n\nNutricional (3 meses antes)\n- Aumentar proteína gradualmente\n- Abundância de cálcio\n- Vitaminas essenciais (A, D3, E)\n\nAmbiental (1 mês antes)\n- Aumentar fotoperíodo: 14-15 horas\n- Temperatura estável: 22-26°C\n- Ninho disponível\n\nComportamental\n- Reduzir manejo desnecessário\n- Banhos frequentes\n- Oferecer material para ninho\n\nFase de Incubação\n- Ambiente consistente\n- Sem perturbações\n- Monitoramento discreto\n- Registro de datas\n\nPós-Reprodução\n- Remover ninho\n- Reduzir fotoperíodo\n- Iniciar repouso vegetativo\n- Preparar para próximo ciclo'
    },
    {
      id: 'behavior-understanding',
      title: 'Entendendo o Comportamento da sua Ave',
      category: 'Comportamento',
      difficulty: 'Iniciante',
      estimatedTime: '6 min',
      author: 'AviGestão',
      featured: false,
      excerpt: 'Sinais comportamentais, bem-estar, estresse e indicadores de saúde através da observação.',
      content: 'Entendendo o Comportamento da sua Ave\n\nCompreender o comportamento é essencial para criar aves saudáveis.\n\nComportamentos Normais\n\nAtividade diária\n- Períodos de canto/vocalizações\n- Alimentação regular\n- Banhos e limpeza\n- Movimento natural entre poleiros\n\nEmpoleiramento\n- Alternância entre poleiros\n- Movimento natural esperado\n- À noite: poleiro seguro e alto\n\nAlimentação\n- Come regularmente\n- Investigação de alimentos novos\n- Ingestão com voracidade = saúde\n\nSinais de Estresse/Problemas\n\n⚠️ Penas eriçadas → Frio, medo ou doença\n⚠️ Silêncio prolongado → Problema sério\n⚠️ Inapetência → Problema de saúde\n⚠️ Movimentos repetitivos → Frustração\n⚠️ Agressividade anormal → Desequilíbrio\n\nIndicadores de Boa Saúde\n\n✓ Atividade apropriada\n✓ Apetite normal\n✓ Plumagem lisa e brilhante\n✓ Movimento ativo\n✓ Olho alerto e brilhante\n✓ Respiração normal'
    },
    {
      id: 'disease-prevention',
      title: 'Prevenção de Doenças e Higiene',
      category: 'Saúde',
      difficulty: 'Intermediário',
      estimatedTime: '10 min',
      author: 'AviGestão',
      featured: false,
      excerpt: 'Protocolos de higiene, quarentena, sanidade ambiental e detecção precoce de problemas.',
      content: 'Prevenção de Doenças e Higiene\n\nA prevenção é fundamental para manter suas aves saudáveis.\n\nHigiene Básica Diária\n\nGaiola/Viveiro\n- Limpeza diária de fezes e alimentos surrados\n- Limpeza completa 2x por semana\n- Desinfecção mensal com diluição apropriada\n\nÁgua\n- SEMPRE água fresca e limpa\n- Trocar MÍNIMO 2x ao dia\n- Limpeza de recipientes diária\n\nAlimentação\n- Remover restos após 2 horas\n- Alimentos sempre frescos\n- Atenção com mofo (muito tóxico!)\n\nHigiene Pessoal\n- Lavar mãos antes de manusear\n- Usar diferentes panos por viveiro\n- Desinfectar ferramentas\n\nQuarentena de Nova Ave\n\nProcedimento obrigatório (30 dias)\n- Separar em ambiente diferente\n- Observar comportamento e fezes\n- Monitorar saúde geral\n- Não colocar junto até confirmado saudável\n\nMonitoramento de Saúde\n\nDiário:\n- Comportamento geral\n- Apetite\n- Aparência de fezes\n- Aspecto da plumagem\n\nSemanal:\n- Pesagem (registrar tendência)\n- Inspeção visual\n- Limpeza profunda\n\nAnual:\n- Check-up preventivo\n- Verificação geral'
    },
    {
      id: 'housing-setup',
      title: 'Estrutura de Alojamento Adequado',
      category: 'Estrutura',
      difficulty: 'Intermediário',
      estimatedTime: '12 min',
      author: 'AviGestão',
      featured: false,
      excerpt: 'Dimensões, materiais, ventilação e organização de gaiolas e viveiros para máximo bem-estar.',
      content: 'Estrutura de Alojamento Adequado\n\nUm alojamento bem estruturado é essencial para o bem-estar e produtividade das aves.\n\nDimensões Mínimas Recomendadas\n\nGaiolas Individuais\n- Comprimento: 60-80cm\n- Profundidade: 40-50cm\n- Altura: 50-60cm\n- Espaço para voo curto\n\nViveiros Coletivos\n- Mínimo 2m² por ave\n- Altura mínima 2m\n- Maior liberdade de movimento\n- Possibilita voo de exercício\n\nMateriais Recomendados\n\nEstrutura\n- Madeira tratada ou aço galvanizado\n- Evitar materiais tóxicos\n- Durável e fácil de limpar\n\nTelas\n- Malha: 10-12mm no máximo\n- Material: Aço galvanizado ou nylon\n- Resistência a escavaçao\n\nPoleiros\n- Diâmetro: 12-16mm (depende da espécie)\n- Natural ou tratado\n- Múltiplas alturas\n- Ângulos variados\n\nVentilação e Clima\n\nVentilação\n- Circulação constante de ar\n- Sem correntes diretas\n- Vão mínimo 30% da superfície\n- Renovação a cada 15 minutos\n\nTemperatura\n- Ideal: 20-26°C\n- Variação máxima: ±3°C diários\n- Proteção contra extremos\n\nUmidade\n- Ideal: 50-65%\n- Evitar ressecamento\n- Evitar umidade excessiva\n\nIluminação Natural vs Artificial\n\nNatural\n- Fotoperíodo adequado\n- Luz não-direta\n- Proteção contra reflexos\n\nArtificial\n- Lâmpadas 6500K (luz branca)\n- Temporizador para controlar horas\n- Posicionamento uniform'
    },
    {
      id: 'breeding-calendar',
      title: 'Calendário de Reprodução Anual',
      category: 'Calendário',
      difficulty: 'Avançado',
      estimatedTime: '14 min',
      author: 'AviGestão',
      featured: false,
      excerpt: 'Planejamento mensal de reprodução, sincronização de casais e cronograma anual otimizado.',
      content: 'Calendário de Reprodução Anual\n\nPlanejamento adequado garante reprodução bem-sucedida e aves saudáveis.\n\nPlanejamento Pré-Reprodução\n\nDe Mês 10 a 11 (Outubro a Novembro)\n- Avaliar saúde geral das aves\n- Preparação genética dos casais\n- Análise de pedigree\n- Seleção de reprodutores\n\nDe Mês 11 a 12 (Novembro a Dezembro)\n- Incrementar nutrição\n- Aumentar proteína\n- Iniciar estímulos ambientais\n- Separar casais para acasalamento\n\nMês 1-2 (Janeiro a Fevereiro) - PICO REPRODUTIVO\n- Máximo de ninhos montados\n- Monitoramento constante\n- Primeira postura esperada\n- Retirada de filhotes\n\nMês 3-4 (Março a Abril) - SEGUNDA NINHADA\n- Casais descansando um período\n- Seleção de casais para segunda postura\n- Desmame da primeira ninhada\n\nMês 5-6 (Maio a Junho)\n- Redução de posturas\n- Ninhadas tardias apenas\n- Preparação para muda\n- Redução de estímulos\n\nMês 7-8 (Julho a Agosto) - MUDA COMPLETA\n- Foco TOTAL em saúde\n- Nutrição máxima\n- Sem reprodução\n- Monitoramento constante\n\nMês 9-10 (Setembro a Outubro) - REPOUSO\n- Recuperação pós-muda\n- Seleção de ranchos\n- Preparação para próximo ciclo\n- Documentação de resultados\n\nChecklist Reprodutivo\n\nAntes da Reprodução\n✓ Casais saudáveis e pesados\n✓ Genética analisada\n✓ Nutrição otimizada\n✓ Ninhos limpos\n✓ Documentação preparada\n\nDurante a Reprodução\n✓ Monitoramento diário\n✓ Incubação verificada\n✓ Filhotes pesados\n✓ Registros atualizados\n✓ Higiene mantida'
    },
    {
      id: 'color-genetics',
      title: 'Genética de Cores em Aves de Criadouro',
      category: 'Melhoramento',
      difficulty: 'Avançado',
      estimatedTime: '16 min',
      author: 'AviGestão',
      featured: false,
      excerpt: 'Herança genética, mutações, cores bases e estratégias de seleção para cores desejáveis.',
      content: 'Genética de Cores em Aves de Criadouro\n\nEntender genética de cores permite seleção eficaz e previsão de resultados.\n\nBasic Genetics - Entendimento Fundamental\n\nAlelos e Genes\n- Cada ave herda 2 alelos por gene (um de cada pai)\n- Dominante: expresso mesmo com apenas 1 cópia\n- Recessivo: precisa de 2 cópias para expressar\n- Ligado ao sexo: localizado no cromossomo W\n\nCores Bases (exemplos com Curios/Canários)\n\nAmarelo\n- Gene: dominante simples\n- Filhotes: amarelos e não-amarelos\n- Potencial: base para muitas variações\n\nBranco\n- Gene: pode ser dominante ou dominante letal\n- Cuidado: letal em homozigose\n- Seleção: evitar excesso de brancos puros\n\nTipos de Herança\n\nHerança Simples\n- Um gene responsável\n- Padrão 3:1 esperado\n- Fácil de prever\n\nHerança Poligênica\n- Múltiplos genes envolvidos\n- Gradação de cores\n- Mais complexo prever\n\nSeleção para Cores\n\nEstratégia 1: Consolidação\n- Cruzamentos entre aves similares\n- Fixa características\n- Reduz variação\n\nEstratégia 2: Introdução\n- Cruzamentos planificados\n- Introduz novo material genético\n- Alarga variações\n\nEstratégia 3: Balanceamento\n- Mantém saúde geral\n- Evita consanguinidade\n- Prioriza vigor híbrido\n\nCuidados Importantes\n\n⚠️ Nunca: sacrificar saúde por cor\n⚠️ Sempre: priorizar vigor geral\n⚠️ Testar: genes letais antes de cruzar\n⚠️ Documentar: todos os cruzamentos'
    }
  ];

  const tools = [
    {
      id: 'nutrition-calc',
      title: 'Calculadora de Nutrição',
      description: 'Calcule a alimentação correta baseado no peso da ave',
      icon: '🍗',
      shortDesc: 'Proteína, cálcio e vitaminas necessárias'
    },
    {
      id: 'consanguinity-calc',
      title: 'Calculadora de Consanguinidade',
      description: 'Calcule o risco genético de cruzamentos',
      icon: '🧬',
      shortDesc: 'Evite problemas genéticos no plantel'
    },
    {
      id: 'seasonal-cal',
      title: 'Calendário Sazonal',
      description: 'Acompanhe o que fazer em cada mês do ano',
      icon: '📅',
      shortDesc: 'Muda, reprodução, repouso e manejo'
    }
  ];

  if (selectedArticle) {
    const article = articles.find(a => a.id === selectedArticle);
    if (article) {
      return (
        <ArticleReader
          article={article}
          onBack={() => setSelectedArticle(null)}
          initialSaved={savedArticles.includes(selectedArticle)}
        />
      );
    }
  }

  if (activeTool === 'nutrition-calc') {
    return <NutritionCalculator onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === 'consanguinity-calc') {
    return <ConsanguinityCalculator onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === 'seasonal-cal') {
    return <SeasonalCalendar onBack={() => setActiveTool(null)} userRegion={userRegion} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-semibold">Carregando sua biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[40px] p-8 border border-blue-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Central de Biblioteca</h1>
            <p className="text-slate-600">Artigos educacionais, guias práticos e ferramentas para criadores de aves</p>
          </div>
          <BookOpen size={48} className="text-blue-600" />
        </div>
      </div>

      {/* Seletor de Região */}
      <RegionSelector onRegionSaved={handleRegionChange} />

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-6 py-3 font-bold border-b-4 transition-colors ${
            activeTab === 'articles'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          📖 Artigos e Guias
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-6 py-3 font-bold border-b-4 transition-colors ${
            activeTab === 'tools'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          🔧 Ferramentas
        </button>
      </div>

      {activeTab === 'articles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.filter(a => a.featured).map(article => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article.id)}
                className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[40px] p-8 text-white text-left hover:shadow-xl transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-2">
                    <Star size={20} className="fill-yellow-300 text-yellow-300" />
                    <span className="text-xs font-bold uppercase bg-white/20 px-3 py-1 rounded-lg">
                      Destaque
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-black mb-3">{article.title}</h3>
                <p className="text-blue-100 mb-6 text-sm leading-relaxed">{article.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-blue-100 border-t border-blue-400/30 pt-4">
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    {article.estimatedTime}
                  </div>
                  <div>⭐ {article.difficulty}</div>
                </div>
              </button>
            ))}
          </div>

          {articles.filter(a => !a.featured).length > 0 && (
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-4">Todos os Artigos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.filter(a => !a.featured).map(article => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article.id)}
                    className="p-6 rounded-[30px] bg-white border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                        {article.category}
                      </span>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <h4 className="font-black text-slate-900 mb-2">{article.title}</h4>
                    <p className="text-sm text-slate-600 mb-4">{article.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {article.estimatedTime}
                      </span>
                      <span>{article.difficulty}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="bg-white rounded-[30px] p-8 border border-slate-100 hover:border-indigo-300 hover:shadow-lg transition-all text-left group"
            >
              <div className="text-5xl mb-4">{tool.icon}</div>
              <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {tool.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4">{tool.description}</p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <span>{tool.shortDesc}</span>
                <ChevronRight size={16} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryCenter;
