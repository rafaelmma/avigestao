import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookmarkPlus, Clock, User, Loader } from 'lucide-react';
import { saveArticle, removeArticle } from '../lib/libraryService';
import { auth } from '../lib/firebase';

interface Article {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  author: string;
  content: string;
  excerpt: string;
}

interface ArticleReaderProps {
  article: Article;
  onBack: () => void;
  initialSaved?: boolean;
}

const ArticleReader: React.FC<ArticleReaderProps> = ({ article, onBack, initialSaved = false }) => {
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const handleSaveToggle = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Faça login para salvar artigos');
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        await removeArticle(user.uid, article.id);
      } else {
        await saveArticle(user.uid, article.id);
      }
      setSaved(!saved);
    } catch (error) {
      console.error('Erro ao atualizar salvamento:', error);
      alert('Erro ao atualizar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Voltar */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft size={20} />
          Voltar para Biblioteca
        </button>
      </div>

      {/* Article Content */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-[40px] p-12 border border-blue-100">
        {/* Meta Info - Design melhorado */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b-2 border-blue-200">
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-wide shadow-lg">
              {article.category}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Clock size={16} className="text-blue-600" />
            {article.estimatedTime}
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <span className="text-xl">⭐</span> {article.difficulty}
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <User size={16} className="text-blue-600" />
            {article.author}
          </div>
        </div>

        {/* Title - Grande e destaque */}
        <h1 className="text-5xl font-black text-slate-900 mb-8 leading-tight">{article.title}</h1>

        {/* Content - Melhor formatação */}
        <div className="prose prose-lg max-w-none text-slate-800">
          {article.content.split('\n').map((paragraph, index) => {
            // Heading (##)
            if (paragraph.startsWith('##')) {
              return (
                <h2 key={index} className="text-3xl font-black text-slate-900 mt-10 mb-6 pt-4 border-t-2 border-blue-200">
                  {paragraph.replace(/##\s*/, '')}
                </h2>
              );
            }
            // Subheading (**)
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              return (
                <h3 key={index} className="text-xl font-black text-blue-700 mt-8 mb-4">
                  {paragraph.replace(/\*\*/g, '')}
                </h3>
              );
            }
            // List items com emojis
            if (paragraph.match(/^[✓→⚠️🚨-]/)) {
              return (
                <div key={index} className="ml-6 text-slate-700 mb-3 flex gap-3 font-semibold">
                  <span className="min-w-fit text-lg">{paragraph.charAt(0)}</span>
                  <span>{paragraph.substring(2)}</span>
                </div>
              );
            }
            // Regular paragraphs
            if (paragraph.trim()) {
              return (
                <p key={index} className="text-slate-700 leading-relaxed mb-5 text-base">
                  {paragraph
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .split('<strong>')
                    .map((part, i) =>
                      i % 2 === 0 ? (
                        part
                      ) : (
                        <strong key={i} className="text-blue-900 font-black">
                          {part.replace('</strong>', '')}
                        </strong>
                      )
                    )}
                </p>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-center">
        <button
          onClick={handleSaveToggle}
          disabled={saving}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 disabled:opacity-50 ${
            saved
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
          }`}
        >
          {saving ? (
            <>
              <Loader size={20} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <BookmarkPlus size={20} />
              {saved ? 'Artigo Salvo' : 'Salvar Artigo'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ArticleReader;
