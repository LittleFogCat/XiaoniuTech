import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarkdownEditor from '../components/MarkdownEditor';
import usePageSeo from '../hooks/usePageSeo';
import { autosavePost, createPost, updatePost, fetchPostUnpublished } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';

const NEW_POST_AUTOSAVE_KEY = 'blog_editor_new_autosave';

function readNewPostAutosave() {
  try {
    const raw = localStorage.getItem(NEW_POST_AUTOSAVE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      title: String(parsed.title || ''),
      content: String(parsed.content || ''),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return null;
  }
}

function clearNewPostAutosave() {
  localStorage.removeItem(NEW_POST_AUTOSAVE_KEY);
}

export default function BlogEditorPage() {
  const { t } = useAppShell();
  const { hasSession } = useAuthState();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState(null);
  const [draftState, setDraftState] = useState(() => readNewPostAutosave());
  const [submitError, setSubmitError] = useState('');

  const isEditing = !!slug;

  usePageSeo({
    title: isEditing && post?.title ? t('blog.editPageTitle', { title: post.title }) : t('blog.writePageTitle'),
    description: '博客草稿编辑、自动保存与发布后台页。',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!hasSession) {
      navigate('/chat', { replace: true });
      return;
    }

    if (isEditing) {
      setLoading(true);
      fetchPostUnpublished(slug)
        .then((p) => {
          if (p) {
            const autosave = p.autosave && typeof p.autosave === 'object'
              ? {
                  title: String(p.autosave.title || p.title || ''),
                  content: String(p.autosave.content || p.content || ''),
                  tags: Array.isArray(p.autosave.tags) ? p.autosave.tags : (p.tags || []),
                }
              : null;
            setPost({
              ...p,
              title: autosave?.title || p.title,
              content: autosave?.content || p.content,
              tags: autosave?.tags || p.tags || [],
            });
          } else {
            setError(t('blog.postNotFound'));
          }
        })
        .catch(() => setError(t('blog.postNotFound')))
        .finally(() => setLoading(false));
    } else {
      setDraftState(readNewPostAutosave());
    }
  }, [hasSession, slug, isEditing, navigate, t]);

  async function handleSave(data) {
    setSubmitError('');
    try {
      let result;
      if (isEditing) {
        result = await updatePost(slug, data);
      } else {
        result = await createPost(data);
        clearNewPostAutosave();
      }

      if (data.published) {
        navigate(`/blog/post/${result.slug}`, { replace: true });
      } else {
        navigate(`/blog/edit/${result.slug}`, { replace: true });
      }
    } catch (nextError) {
      setSubmitError(nextError.message || t('blog.saveFailed'));
      throw nextError;
    }
  }

  async function handleAutosave(data) {
    if (isEditing) {
      await autosavePost(slug, data);
      return;
    }

    const nextDraft = {
      title: String(data.title || ''),
      content: String(data.content || ''),
      tags: Array.isArray(data.tags) ? data.tags : [],
      updatedAt: Date.now(),
    };
    localStorage.setItem(NEW_POST_AUTOSAVE_KEY, JSON.stringify(nextDraft));
    setDraftState(nextDraft);
  }

  function handleCancel() {
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-[color:var(--text-faint)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)] text-[color:var(--text-primary)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{t('blog.postNotFound')}</h1>
          <p className="mt-2 text-[color:var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <main className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        {submitError && (
          <div className="mb-4 rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
            {submitError}
          </div>
        )}
        <MarkdownEditor
          initialTitle={post?.title || draftState?.title || ''}
          initialContent={post?.content || draftState?.content || ''}
          initialTags={post?.tags || draftState?.tags || []}
          onSave={handleSave}
          onAutosave={handleAutosave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
