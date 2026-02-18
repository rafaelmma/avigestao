import React from 'react';
import { APP_LOGO } from '../constants';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-20 -mt-20 flex items-center justify-center p-20 opacity-40">
            <img src={APP_LOGO} alt="" className="w-full h-full object-contain grayscale opacity-10" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Política de Privacidade
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Política de Privacidade</h1>
            </div>
            <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-2xl p-1 shadow-sm flex-shrink-0">
              <img src={APP_LOGO} alt="AviGestão" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 relative z-10">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Introdução</h2>
              <p>
                Esta Política de Privacidade explica como coletamos, utilizamos e protegemos os
                dados inseridos pelos usuários nesta plataforma. Sou um criador amador e desenvolvi
                este sistema para facilitar a gestão de pássaros registrados no SISPASS. A
                privacidade e a segurança das suas informações são prioridades, e este documento
                descreve de forma clara como tratamos todos os dados fornecidos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Informações que coletamos</h2>
              <p>Coletamos apenas o necessário para o funcionamento correto da plataforma, como:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Dados cadastrais (nome, e-mail, telefone)</li>
                <li>
                  Informações sobre seus pássaros (anilhas, registros, histórico, reprodução,
                  linhagem etc.)
                </li>
                <li>Dados básicos de acesso (horário de login, tipo de dispositivo)</li>
                <li>Qualquer informação inserida voluntariamente pelo usuário</li>
              </ul>
              <p>
                Não coletamos dados sensíveis sem necessidade e não compartilhamos nenhum dado com
                terceiros.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Como utilizamos suas informações</h2>
              <p>Os dados são usados apenas para:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Gerenciar pássaros, anilhas, registros e histórico</li>
                <li>Facilitar consultas, cadastros e relatórios dentro da plataforma</li>
                <li>Melhorar a experiência do usuário</li>
                <li>Garantir o funcionamento e segurança do sistema</li>
              </ul>
              <p>Nenhuma informação é utilizada para fins comerciais ou publicidade externa.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Armazenamento e segurança</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Os dados são armazenados em ambiente seguro.</li>
                <li>Apenas o proprietário da conta tem acesso às suas informações.</li>
                <li>Senhas são protegidas e não são visíveis nem para o responsável pela plataforma.</li>
                <li>
                  Medidas técnicas são aplicadas para prevenir acessos indevidos, perda ou uso
                  incorreto.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">5. Compartilhamento de dados</h2>
              <p>
                A plataforma não compartilha dados com terceiros. As informações servem
                exclusivamente para uso interno do usuário dentro do sistema.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">6. Direitos do usuário</h2>
              <p>Você pode, a qualquer momento:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Editar seus dados</li>
                <li>Excluir registros</li>
                <li>Solicitar remoção completa da conta</li>
                <li>Encerrar o uso da plataforma</li>
              </ul>
              <p>
                Basta acessar as opções da conta ou entrar em contato pelo e-mail oficial.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">7. Cookies e dados de navegação</h2>
              <p>Utilizamos cookies ou tecnologias similares apenas para:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Manter você conectado</li>
                <li>Garantir o funcionamento correto do site</li>
                <li>Melhorar a experiência de navegação</li>
              </ul>
              <p>Nenhum cookie é usado para fins de rastreamento ou publicidade.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">8. Alterações nesta política</h2>
              <p>
                Podemos atualizar esta Política de Privacidade para refletir melhorias na
                plataforma. A data de atualização será informada, e o usuário poderá revisar as
                mudanças antes de continuar utilizando o serviço.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">9. Contato</h2>
              <p>Para dúvidas, sugestões ou solicitações relacionadas à privacidade, entre em contato:</p>
              <p>E-mail: contato@avigestao.com.br</p>
              <p>Responsável: Rafael Monteiro Montalvão França, criador e desenvolvedor da plataforma.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
