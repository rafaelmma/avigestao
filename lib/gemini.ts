import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_GEMINI_API_KEY não configurada. Assistente IA desabilitado.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function askAI(question: string, context?: string): Promise<string> {
  if (!genAI) {
    throw new Error('API do Google AI não configurada. Adicione VITE_GEMINI_API_KEY no .env.local');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const systemPrompt = `Você é um assistente especializado em criação de aves, principalmente pássaros brasileiros como Curió, Bicudo, Coleiro, Azulão, etc.

Você ajuda criadores com:
- Dúvidas sobre manejo e cuidados
- Orientações sobre SISPASS e IBAMA
- Acasalamentos e genética
- Alimentação e nutrição
- Saúde e medicamentos
- Legislação e documentação

Responda de forma clara, direta e em português do Brasil. Se não souber algo, seja honesto.

${context ? `Contexto adicional: ${context}` : ''}`;

    const prompt = `${systemPrompt}

Pergunta do usuário: ${question}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Erro na API Gemini:', error);
    throw new Error(`Erro ao consultar IA: ${error.message}`);
  }
}

export async function analyzePlantel(birds: any[]): Promise<string> {
  if (!genAI) {
    throw new Error('API do Google AI não configurada');
  }

  const summary = birds.map(b => 
    `${b.species} - ${b.sex || 'Desconhecido'} - ${b.status}`
  ).join('\n');

  const prompt = `Analise este plantel de aves:

${summary}

Total: ${birds.length} aves

Forneça:
1. Análise da diversidade
2. Sugestões de acasalamentos (se houver machos e fêmeas)
3. Alertas ou recomendações importantes

Seja direto e prático.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export function isAIAvailable(): boolean {
  return !!genAI;
}
