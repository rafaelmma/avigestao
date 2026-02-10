import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Politica de Privacidade
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Politica de Privacidade</h1>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Introducao</h2>
              <p>
                Esta Politica de Privacidade explica como coletamos, utilizamos e protegemos os
                dados inseridos pelos usuarios nesta plataforma. Sou um criador amador e desenvolvi
                este sistema para facilitar a gestao de passaros registrados no SISPASS. A
                privacidade e a seguranca das suas informacoes sao prioridades, e este documento
                descreve de forma clara como tratamos todos os dados fornecidos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Informacoes que coletamos</h2>
              <p>Coletamos apenas o necessario para o funcionamento correto da plataforma, como:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Dados cadastrais (nome, e-mail, telefone)</li>
                <li>
                  Informacoes sobre seus passaros (anilhas, registros, historico, reproducao,
                  linhagem etc.)
                </li>
                <li>Dados basicos de acesso (horario de login, tipo de dispositivo)</li>
                <li>Qualquer informacao inserida voluntariamente pelo usuario</li>
              </ul>
              <p>
                Nao coletamos dados sensiveis sem necessidade e nao compartilhamos nenhum dado com
                terceiros.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Como utilizamos suas informacoes</h2>
              <p>Os dados sao usados apenas para:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Gerenciar passaros, anilhas, registros e historico</li>
                <li>Facilitar consultas, cadastros e relatorios dentro da plataforma</li>
                <li>Melhorar a experiencia do usuario</li>
                <li>Garantir o funcionamento e seguranca do sistema</li>
              </ul>
              <p>Nenhuma informacao e utilizada para fins comerciais ou publicidade externa.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Armazenamento e seguranca</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Os dados sao armazenados em ambiente seguro.</li>
                <li>Apenas o proprietario da conta tem acesso as suas informacoes.</li>
                <li>Senhas sao protegidas e nao sao visiveis nem para o responsavel pela plataforma.</li>
                <li>
                  Medidas tecnicas sao aplicadas para prevenir acessos indevidos, perda ou uso
                  incorreto.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">5. Compartilhamento de dados</h2>
              <p>
                A plataforma nao compartilha dados com terceiros. As informacoes servem
                exclusivamente para uso interno do usuario dentro do sistema.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">6. Direitos do usuario</h2>
              <p>Voce pode, a qualquer momento:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Editar seus dados</li>
                <li>Excluir registros</li>
                <li>Solicitar remocao completa da conta</li>
                <li>Encerrar o uso da plataforma</li>
              </ul>
              <p>
                Basta acessar as opcoes da conta ou entrar em contato pelo e-mail oficial.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">7. Cookies e dados de navegacao</h2>
              <p>Utilizamos cookies ou tecnologias similares apenas para:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Manter voce conectado</li>
                <li>Garantir o funcionamento correto do site</li>
                <li>Melhorar a experiencia de navegacao</li>
              </ul>
              <p>Nenhum cookie e usado para fins de rastreamento ou publicidade.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">8. Alteracoes nesta politica</h2>
              <p>
                Podemos atualizar esta Politica de Privacidade para refletir melhorias na
                plataforma. A data de atualizacao sera informada, e o usuario podera revisar as
                mudancas antes de continuar utilizando o servico.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">9. Contato</h2>
              <p>Para duvidas, sugestoes ou solicitacoes relacionadas a privacidade, entre em contato:</p>
              <p>E-mail: contato@avigestao.com.br</p>
              <p>Responsavel: Rafael Monteiro Montalvao Franca, criador e desenvolvedor da plataforma.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
