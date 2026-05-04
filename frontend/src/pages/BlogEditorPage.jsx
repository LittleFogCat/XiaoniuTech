import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarkdownEditor from '../components/MarkdownEditor';
import { createPost, updatePost, fetchPostUnpublished, isLoggedIn } from '../services/blogApi';

export default function BlogEditorPage() {
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
            document.title = `编辑: ${p.title} - XN Blog`;
          } else {
            setError('文章不存在');
          }
        })
        .catch(() => setError('文章不存在'))
        .finally(() => setLoading(false));
    } else {
      document.title = '写博客 - XN Blog';
    }
  }, [slug, isEditing, navigate]);

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
      <div className="flex h-screen items-center justify-center" style={{ background: '#050816' }}>
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#050816' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">文章不存在</h1>
          <p className="mt-2 text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: '#050816' }}>
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
