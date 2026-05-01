import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PlaceholderPage({ title, description }) {
  useEffect(() => {
    document.title = `${title} | Xiaoniu Tech`;
  }, [title]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#343541] px-6 py-12 text-[#ececf1]">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#202123]/90 p-8 shadow-2xl shadow-black/20 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#19c37d]">Coming Soon</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-[#9b9bad] sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-xl bg-[#19c37d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13a86b]" to="/">
            返回首页
          </Link>
          <Link className="rounded-xl border border-[#4b4d5d] bg-[#343541]/80 px-5 py-3 text-sm font-semibold text-[#ececf1] transition hover:border-[#19c37d]" to="/chat">
            进入 Chat
          </Link>
        </div>
      </div>
    </main>
  );
}