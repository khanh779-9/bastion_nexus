import React, { useEffect, useState, useContext } from 'react';
import { api } from '@/api/client';
import { FileText, Plus, Trash2, Edit2, Link as LinkIcon } from 'lucide-react';
import { ThemeContext } from '@/components/ThemeContext';
import { useTranslate } from '@/locales';
import { getThemeColor } from '../themeColors';
import { showToast } from '@/components/toastService';

interface NoteItem {
  id: string;
  title: string | null;
  content: string;
  color: string | null;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/notes');
      setNotes(data);
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('notes.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content) {
      showToast(t('notes.contentRequired'), 'error');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/notes/${editingId}`, { title, content, color });
      } else {
        await api.post('/notes', { title, content, color });
      }
      setTitle('');
      setContent('');
      setColor('#3b82f6');
      setEditingId(null);
      setShowModal(false);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('notes.failedToSave'), 'error');
    }
  }

  async function deleteNote(id: string) {
    if (!confirm(t('notes.deleteConfirm'))) return;
    try {
      await api.delete(`/notes/${id}`);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error || t('notes.failedToDelete'), 'error');
    }
  }

  function editNote(note: NoteItem) {
    setTitle(note.title || '');
    setContent(note.content);
    setColor(note.color || '#3b82f6');
    setEditingId(note.id);
    setShowModal(true);
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setColor('#3b82f6');
    setEditingId(null);
    setShowModal(false);
  }

  function viewNote(note: NoteItem) {
    setViewingNote(note);
    setShowViewModal(true);
  }

  const mainClass = 'min-h-screen ' + getThemeColor(theme, 'background');
  const modalBg = getThemeColor(theme, 'backgroundSecondary');
  const borderClass = getThemeColor(theme, 'border');
  const btnClass = 'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ' + getThemeColor(theme, 'button');

  return (
    <main className={mainClass}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-lg ${getThemeColor(theme, 'featureNotesIcon')}`}>
              <FileText size={32} className="text-current" />
            </div>
            <div>
              <h1 className={"text-4xl font-bold " + getThemeColor(theme, 'text')}>{t('notes.secureNotes')}</h1>
              <p className={getThemeColor(theme, 'textSecondary') + " mt-1"}>{t('notes.notesDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className={btnClass}
          >
            <Plus size={20} />
            {t('notes.newNote')}
          </button>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) resetForm(); }}
          >
            <div className={`${modalBg} rounded-2xl shadow-2xl max-w-md w-full p-6 border ${borderClass}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={"w-1 h-7 rounded-full " + getThemeColor(theme, 'accent')}></div>
                <h2 className={"text-xl font-bold " + getThemeColor(theme, 'cardTitle')}>
                  {editingId ? t('notes.editNote') : t('notes.createNewNote')}
                </h2>
              </div>
              <form onSubmit={saveNote} className="space-y-4">
                <div>
                  <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('notes.titleOptional')}</label>
                  <input
                    className={"w-full px-3 py-2 rounded-md border text-sm " + getThemeColor(theme, 'input')}
                    placeholder={t('notes.titlePlaceholder')}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('notes.color')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-16 rounded cursor-pointer border"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                    />
                    <div className="flex gap-2">
                      {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-' + (theme === 'dark' ? 'gray-800' : 'white') : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className={"block text-xs font-medium mb-1 " + getThemeColor(theme, 'textSecondary')}>{t('notes.content')} *</label>
                  <textarea
                    rows={7}
                    className={"w-full px-3 py-2 rounded-md border text-sm resize-none " + getThemeColor(theme, 'input')}
                    placeholder={t('notes.contentPlaceholder')}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className={"flex-1 py-2 rounded-md font-semibold text-xs shadow hover:shadow-lg transition-all " + getThemeColor(theme, 'button')}
                  >
                    {editingId ? t('notes.update') : t('notes.create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={"flex-1 py-2 rounded-md font-semibold text-xs transition-colors " + getThemeColor(theme, 'buttonSecondary')}
                  >
                    {t('notes.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="flex justify-center items-end gap-1 mb-6">
                <div className={`w-1.5 h-6 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0s'}}></div>
                <div className={`w-1.5 h-8 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.2s'}}></div>
                <div className={`w-1.5 h-10 rounded-sm animate-bounce ${getThemeColor(theme, 'accent')}`} style={{animationDelay: '0.4s'}}></div>
              </div>
              <p className={`${getThemeColor(theme, 'textSecondary')} font-medium`}>{t('notes.loading')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className={`mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border ${borderClass} ${getThemeColor(theme, 'backgroundSecondary')}`}>
              <input
                className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                placeholder={`${t('notes.searchByTitle')}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <input
                type="date"
                className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <input
                type="date"
                className={"w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all text-sm " + getThemeColor(theme, 'input')}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>

            {/* Notes Grid */}
            {notes.filter(n => {
              const titleMatch = (n.title || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                                n.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
              const dateMatch = (!dateFrom || new Date(n.updated_at) >= new Date(dateFrom)) && 
                               (!dateTo || new Date(n.updated_at) <= new Date(dateTo));
              return titleMatch && dateMatch;
            }).length === 0 ? (
              <div className={"text-center py-20 rounded-2xl border-2 border-dashed " + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'border')}>
                <FileText size={48} className={"mx-auto mb-4 " + getThemeColor(theme, 'textSecondary')} />
                <p className={getThemeColor(theme, 'textSecondary') + " text-lg mb-6"}>{t('notes.noNotes')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.filter(n => {
                  const titleMatch = (n.title || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                                    n.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
                  const dateMatch = (!dateFrom || new Date(n.updated_at) >= new Date(dateFrom)) && 
                                   (!dateTo || new Date(n.updated_at) <= new Date(dateTo));
                  return titleMatch && dateMatch;
                }).map(n => (
                  <article
                    key={n.id}
                    onClick={() => viewNote(n)}
                    className={"rounded-xl shadow hover:shadow-lg transition-all overflow-hidden cursor-pointer group " + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'border')}
                  >
                    <div className="h-1.5" style={{ backgroundColor: n.color || '#3b82f6' }}></div>
                    <div className="p-4">
                      <h3 className={"text-sm font-bold truncate mb-2 " + getThemeColor(theme, 'cardTitle')}>{n.title || t('notes.untitled')}</h3>
                      <p className={"text-xs line-clamp-3 mb-3 " + getThemeColor(theme, 'cardDesc')}>{n.content}</p>
                      <div className={"flex items-center justify-between pt-3 border-t text-xs " + getThemeColor(theme, 'border')}>
                        <span className={getThemeColor(theme, 'textSecondary')}>{new Date(n.updated_at).toLocaleDateString()}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => editNote(n)}
                            className={"p-1 rounded transition-all " + getThemeColor(theme, 'backgroundSecondary')}
                            title={t('notes.edit')}
                          >
                            <Edit2 size={14} style={{ color: n.color || '#3b82f6' }} />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(n.content);
                              showToast(t('notes.copied'), 'success');
                            }}
                            className={"p-1 rounded transition-all " + getThemeColor(theme, 'backgroundSecondary')}
                            title={t('notes.copy')}
                          >
                            <LinkIcon size={14} style={{ color: n.color || '#3b82f6' }} />
                          </button>
                          <button
                            onClick={() => deleteNote(n.id)}
                            className="p-1 rounded transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('notes.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* View Modal - Read Only */}
        {showViewModal && viewingNote && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowViewModal(false); }}
          >
            <div className={`${modalBg} rounded-2xl shadow-2xl max-w-2xl w-full p-6 border ${borderClass} max-h-[85vh] overflow-y-auto`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-7 rounded-full" style={{ backgroundColor: viewingNote.color || '#3b82f6' }}></div>
                <h2 className={"text-xl font-bold " + getThemeColor(theme, 'cardTitle')}>{viewingNote.title || t('notes.untitled')}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={"block text-xs font-medium mb-2 " + getThemeColor(theme, 'textSecondary')}>{t('notes.content')}</label>
                  <div className={"p-4 rounded-lg whitespace-pre-wrap text-sm " + getThemeColor(theme, 'backgroundSecondary') + ' ' + getThemeColor(theme, 'text')}>
                    {viewingNote.content}
                  </div>
                </div>
                <div className={"text-xs pt-4 border-t " + getThemeColor(theme, 'border') + ' ' + getThemeColor(theme, 'textSecondary')}>
                  {t('notes.updated')}: {new Date(viewingNote.updated_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    editNote(viewingNote);
                  }}
                  className={"flex-1 py-2 rounded-lg font-semibold text-sm " + getThemeColor(theme, 'button')}
                >
                  {t('notes.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className={"flex-1 py-2 rounded-lg font-semibold text-sm transition-colors " + getThemeColor(theme, 'buttonSecondary')}
                >
                  {t('notes.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
