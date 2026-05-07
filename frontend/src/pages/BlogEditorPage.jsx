import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarkdownEditor from '../components/MarkdownEditor';
import { createPost, updatePost, fetchPostUnpublished, isLoggedIn } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

export default function BlogEditorPage() {
  const { t } = useAppShell();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState(null);

  const isEditing = !!slug;

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/chat', { replace: true });
      return;
    }

    if (isEditing) {
      setLoading(true);
      fetchPostUnpublished(slug)
        .then((p) => {
          if (p) {
            setPost(p);
            document.title = t('blog.editPageTitle', { title: p.title });
          } else {
            setError(t('blog.postNotFound'));
          }
        })
        .catch(() => setError(t('blog.postNotFound')))
        .finally(() => setLoading(false));
    } else {
      document.title = t('blog.writePageTitle');
    }
  }, [slug, isEditing, navigate, t]);

  async function handleSave(data) {
    let result;
    if (isEditing) {
      result = await updatePost(slug, data);
    } else {
      result = await createPost(data);
    }

    if (data.published) {
      navigate(`/blog/post/${result.slug}`, { replace: true });
    } else {
      navigate(`/blog/edit/${result.slug}`, { replace: true });
    }
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
        <MarkdownEditor
          initialTitle={post?.title || ''}
          initialContent={post?.content || ''}
          initialTags={post?.tags || []}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
