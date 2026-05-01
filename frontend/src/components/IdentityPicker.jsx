import IdentityAvatar from './IdentityAvatar';

export default function IdentityPicker({ identities, chats, onSelectIdentity, onBack }) {
  const usedIdentityIds = new Set(
    chats
      .filter(chat => chat?.chatTarget?.type === 'identity')
      .map(chat => chat.chatTarget.id)
  );

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-700/60 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Identity Lab</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">选择一个智能体开始对话</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/75 sm:text-base">
              智能体由服务端读取人格设定文件生成。每个智能体最多绑定一个会话，已存在的会话不会重复创建。
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-600/60 bg-slate-800/40 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-sky-500/30 hover:bg-sky-500/10"
          >
            返回聊天
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {identities.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-slate-700/60 bg-slate-900/20 px-6 text-center text-slate-300/70">
            暂无可用智能体，请在服务端配置 identities 目录后重试。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {identities.map((identity, index) => {
              const isUsed = usedIdentityIds.has(identity.id);
              return (
                <article
                  key={identity.id}
                  className="group relative overflow-hidden rounded-[28px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.94),rgba(15,23,42,0.94))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:border-sky-500/30 hover:shadow-[0_24px_50px_rgba(37,99,235,0.1)]"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" />
                  <div className="flex items-start gap-4">
                    <IdentityAvatar name={identity.name} avatarUrl={identity.avatarUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                          Agent {String(index + 1).padStart(2, '0')}
                        </span>
                        {isUsed && (
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                            已存在会话
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 truncate text-xl font-semibold text-white">{identity.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300/75">
                        {identity.description || '暂无描述'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/30 px-4 py-3 text-xs text-slate-300/75">
                    <span>绑定形式：单智能体单会话</span>
                    <button
                      type="button"
                      onClick={() => onSelectIdentity(identity)}
                      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${isUsed ? 'border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/14' : 'border-sky-500/20 bg-sky-500/12 text-sky-100 hover:bg-sky-500/18'}`}
                    >
                      {isUsed ? '进入对话' : '创建对话'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}