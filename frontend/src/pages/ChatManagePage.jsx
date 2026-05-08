import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackHomeButton from '../components/BackHomeButton';
import LanguageThemeControls from '../components/LanguageThemeControls';
import UserAccountMenu from '../components/UserAccountMenu';
import {
  createChatManagementAgent,
  createChatManagementModel,
  deleteChatManagementAgent,
  deleteChatManagementModel,
  fetchChatManagementAgents,
  fetchChatManagementModels,
  fetchPermissionMe,
  updateChatManagementAgent,
  updateChatManagementModel,
} from '../services/adminApi';
import usePageSeo from '../hooks/usePageSeo';
import { isLoggedIn } from '../services/blogApi';

const EMPTY_MODEL_DRAFT = {
  id: '',
  provider: '',
  modelId: '',
  name: '',
  free: true,
  reasoning: false,
  inputText: 'text',
  contextWindow: '',
  maxTokens: '',
  compatJson: '{}',
  providerConfigJson: '{\n  "baseUrl": "",\n  "api": "openai-completions",\n  "apiKey": "",\n  "authHeader": true\n}',
  isDefault: false,
};

const EMPTY_AGENT_DRAFT = {
  id: '',
  name: '',
  role: '',
  description: '',
  avatarUrl: '',
  personaDefinition: '',
  systemPrompt: '',
  free: true,
};

function modelToDraft(model) {
  if (!model) {
    return EMPTY_MODEL_DRAFT;
  }

  return {
    id: model.id || '',
    provider: model.provider || '',
    modelId: model.modelId || '',
    name: model.name || '',
    free: model.free !== false,
    reasoning: Boolean(model.reasoning),
    inputText: Array.isArray(model.input) && model.input.length > 0 ? model.input.join(', ') : 'text',
    contextWindow: model.contextWindow ?? '',
    maxTokens: model.maxTokens ?? '',
    compatJson: JSON.stringify(model.compat || {}, null, 2),
    providerConfigJson: JSON.stringify(model.providerConfig || {}, null, 2),
    isDefault: Boolean(model.isDefault),
  };
}

function agentToDraft(agent) {
  if (!agent) {
    return EMPTY_AGENT_DRAFT;
  }

  return {
    id: agent.id || '',
    name: agent.name || '',
    role: agent.role || '',
    description: agent.description || '',
    avatarUrl: agent.avatarUrl || '',
    personaDefinition: agent.personaDefinition || '',
    systemPrompt: agent.systemPrompt || '',
    free: agent.free !== false,
  };
}

function HelpTooltip({ label, children }) {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        aria-label={`${label}说明`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[11px] font-semibold text-[color:var(--text-faint)] transition hover:border-[color:var(--accent-border)] hover:text-[color:var(--text-primary)]"
      >
        ?
      </button>
      <div className="pointer-events-none absolute right-0 top-7 z-10 w-80 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3 text-left text-xs leading-5 text-[color:var(--text-secondary)] opacity-0 shadow-[var(--surface-shadow)] transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        {children}
      </div>
    </div>
  );
}

function JsonTextareaField({ id, label, help, value, onChange, rows, placeholder }) {
  return (
    <div className="lg:col-span-2">
      <div className="mb-2 flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-[color:var(--text-primary)]">
          {label}
        </label>
        <HelpTooltip label={label}>{help}</HelpTooltip>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 font-mono text-xs outline-none transition focus:border-[color:var(--accent-border)]"
      />
    </div>
  );
}

export default function ChatManagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasSession = isLoggedIn();
  const [access, setAccess] = useState(null);
  const [models, setModels] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [modelDraft, setModelDraft] = useState(EMPTY_MODEL_DRAFT);
  const [agentDraft, setAgentDraft] = useState(EMPTY_AGENT_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManageModels = access?.permissions?.includes('chat:manage_model');
  const canManageAgents = access?.permissions?.includes('chat:manage_agent');
  const currentTab = searchParams.get('tab') || (canManageModels ? 'models' : 'agents');

  const selectedModel = models.find((item) => item.id === selectedModelId) || null;
  const selectedAgent = agents.find((item) => item.id === selectedAgentId) || null;

  usePageSeo({
    title: '聊天管理 - XiaoNiu Tech',
    description: '管理聊天模型、智能体和默认配置的后台页面。',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!hasSession) {
      navigate('/login?redirect=%2Fchat%2Fmanage', { replace: true });
    }
  }, [navigate, hasSession]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (currentTab === 'models' && !canManageModels && canManageAgents) {
      updateTab('agents');
    }

    if (currentTab === 'agents' && !canManageAgents && canManageModels) {
      updateTab('models');
    }
  }, [loading, currentTab, canManageModels, canManageAgents]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const me = await fetchPermissionMe();
      setAccess(me.access);

      const nextCanManageModels = me.access?.permissions?.includes('chat:manage_model');
      const nextCanManageAgents = me.access?.permissions?.includes('chat:manage_agent');
      if (!nextCanManageModels && !nextCanManageAgents) {
        setError('当前账号没有聊天管理权限');
        setLoading(false);
        return;
      }

      const [modelResponse, agentResponse] = await Promise.all([
        nextCanManageModels ? fetchChatManagementModels() : Promise.resolve({ models: [] }),
        nextCanManageAgents ? fetchChatManagementAgents() : Promise.resolve({ agents: [] }),
      ]);

      setModels(modelResponse.models || []);
      setAgents(agentResponse.agents || []);

      if (!selectedModelId && modelResponse.models?.length) {
        setSelectedModelId(modelResponse.models[0].id);
      }
      if (!selectedAgentId && agentResponse.agents?.length) {
        setSelectedAgentId(agentResponse.agents[0].id);
      }
    } catch (nextError) {
      setError(nextError.message || '加载聊天管理数据失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    loadData();
  }, [hasSession]);

  useEffect(() => {
    setModelDraft(modelToDraft(selectedModel));
  }, [selectedModelId, selectedModel]);

  useEffect(() => {
    setAgentDraft(agentToDraft(selectedAgent));
  }, [selectedAgentId, selectedAgent]);

  function updateTab(tab) {
    const params = new URLSearchParams();
    params.set('tab', tab);
    setSearchParams(params, { replace: true });
  }

  function resetModelDraft() {
    setSelectedModelId('');
    setModelDraft(EMPTY_MODEL_DRAFT);
  }

  function resetAgentDraft() {
    setSelectedAgentId('');
    setAgentDraft(EMPTY_AGENT_DRAFT);
  }

  async function handleSaveModel() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const compat = JSON.parse(modelDraft.compatJson || '{}');
      const providerConfig = JSON.parse(modelDraft.providerConfigJson || '{}');
      const payload = {
        provider: modelDraft.provider,
        modelId: modelDraft.modelId,
        name: modelDraft.name,
        free: modelDraft.free,
        reasoning: modelDraft.reasoning,
        input: modelDraft.inputText.split(',').map((item) => item.trim()).filter(Boolean),
        contextWindow: modelDraft.contextWindow || null,
        maxTokens: modelDraft.maxTokens || null,
        compat,
        providerConfig,
        isDefault: modelDraft.isDefault,
      };

      if (selectedModelId) {
        await updateChatManagementModel(selectedModelId, payload);
        setMessage('模型配置已更新');
      } else {
        await createChatManagementModel(payload);
        setMessage('模型配置已创建');
      }

      await loadData();
    } catch (nextError) {
      setError(nextError.message || '保存模型配置失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModel() {
    if (!selectedModelId) {
      return;
    }
    if (!window.confirm(`确定删除模型“${selectedModel?.name || selectedModelId}”吗？`)) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deleteChatManagementModel(selectedModelId);
      resetModelDraft();
      setMessage('模型配置已删除');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '删除模型配置失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAgent() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        id: agentDraft.id,
        name: agentDraft.name,
        role: agentDraft.role,
        description: agentDraft.description,
        avatarUrl: agentDraft.avatarUrl,
        personaDefinition: agentDraft.personaDefinition,
        systemPrompt: agentDraft.systemPrompt,
        free: agentDraft.free,
      };

      if (selectedAgentId) {
        await updateChatManagementAgent(selectedAgentId, payload);
        setMessage('智能体已更新');
      } else {
        await createChatManagementAgent(payload);
        setMessage('智能体已创建');
      }

      await loadData();
    } catch (nextError) {
      setError(nextError.message || '保存智能体失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAgent() {
    if (!selectedAgentId) {
      return;
    }
    if (!window.confirm(`确定删除智能体“${selectedAgent?.name || selectedAgentId}”吗？`)) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deleteChatManagementAgent(selectedAgentId);
      resetAgentDraft();
      setMessage('智能体已删除');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '删除智能体失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <BackHomeButton iconOnly />
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">Chat Module</div>
              <h1 className="text-xl font-semibold">聊天管理</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageThemeControls compact />
            <UserAccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {canManageModels && (
            <button type="button" onClick={() => updateTab('models')} className={`rounded-xl px-4 py-2 text-sm transition ${currentTab === 'models' ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
              模型配置
            </button>
          )}
          {canManageAgents && (
            <button type="button" onClick={() => updateTab('agents')} className={`rounded-xl px-4 py-2 text-sm transition ${currentTab === 'agents' ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
              智能体配置
            </button>
          )}
        </div>

        {(message || error) && (
          <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[color:var(--danger-text)]' : 'border-[color:var(--success-border)] bg-[var(--success-soft)] text-[color:var(--success-text)]'}`}>
            {error || message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-12 text-center text-[color:var(--text-muted)]">加载聊天管理数据中...</div>
        ) : error && !access ? (
          <div className="rounded-3xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-8 text-[color:var(--danger-text)]">{error}</div>
        ) : currentTab === 'models' ? (
          <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3">
              <button type="button" onClick={resetModelDraft} className="mb-3 w-full rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">新建模型</button>
              {models.map((model) => (
                <button key={model.id} type="button" onClick={() => setSelectedModelId(model.id)} className={`mb-2 w-full rounded-2xl px-4 py-3 text-left transition ${selectedModelId === model.id ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{model.name}</div>
                    {model.free && <span className="rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--success-text)]">free</span>}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-faint)]">{model.id}</div>
                </button>
              ))}
            </aside>

            <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <input value={modelDraft.provider} onChange={(event) => setModelDraft((previous) => ({ ...previous, provider: event.target.value }))} placeholder="provider，例如 deepseek" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                <input value={modelDraft.modelId} onChange={(event) => setModelDraft((previous) => ({ ...previous, modelId: event.target.value }))} placeholder="modelId，例如 deepseek-chat" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                <input value={modelDraft.name} onChange={(event) => setModelDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="显示名称" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none lg:col-span-2" />
                <input value={modelDraft.inputText} onChange={(event) => setModelDraft((previous) => ({ ...previous, inputText: event.target.value }))} placeholder="输入类型，逗号分隔" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={modelDraft.contextWindow} onChange={(event) => setModelDraft((previous) => ({ ...previous, contextWindow: event.target.value }))} placeholder="上下文窗口" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                  <input value={modelDraft.maxTokens} onChange={(event) => setModelDraft((previous) => ({ ...previous, maxTokens: event.target.value }))} placeholder="最大输出 tokens" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)]">
                  <input type="checkbox" checked={modelDraft.free} onChange={(event) => setModelDraft((previous) => ({ ...previous, free: event.target.checked }))} />
                  免费模型
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)]">
                  <input type="checkbox" checked={modelDraft.reasoning} onChange={(event) => setModelDraft((previous) => ({ ...previous, reasoning: event.target.checked }))} />
                  推理模型
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)] lg:col-span-2">
                  <input type="checkbox" checked={modelDraft.isDefault} onChange={(event) => setModelDraft((previous) => ({ ...previous, isDefault: event.target.checked }))} />
                  设为默认模型
                </label>
                <JsonTextareaField
                  id="model-provider-config"
                  label="提供商请求配置（providerConfig）"
                  value={modelDraft.providerConfigJson}
                  onChange={(event) => setModelDraft((previous) => ({ ...previous, providerConfigJson: event.target.value }))}
                  rows={10}
                  placeholder={"{\n  \"baseUrl\": \"https://api.example.com/v1\",\n  \"api\": \"openai-completions\",\n  \"apiKey\": \"${MY_API_KEY}\",\n  \"authHeader\": true\n}"}
                  help={(
                    <>
                      <p>填写调用上游模型服务时使用的 JSON 配置。</p>
                      <p>常用字段：baseUrl 是接口基础地址，api 一般填 openai-completions，apiKey 可以直接写密钥或使用 ${'{ENV_NAME}'} 形式的环境变量，authHeader 控制是否自动带 Authorization 头。</p>
                      <p>没有特殊协议要求时，通常按占位示例填写即可。</p>
                    </>
                  )}
                />
                <JsonTextareaField
                  id="model-compat-config"
                  label="兼容扩展参数（compat）"
                  value={modelDraft.compatJson}
                  onChange={(event) => setModelDraft((previous) => ({ ...previous, compatJson: event.target.value }))}
                  rows={8}
                  placeholder="{}"
                  help={(
                    <>
                      <p>用于保存模型的兼容或扩展参数，系统会按原样存储。</p>
                      <p>如果只是配置输入类型、上下文窗口、最大输出或是否推理模型，请优先填写上面的专用字段，不要重复写到这里。</p>
                      <p>没有额外需求时保持 {} 即可。</p>
                    </>
                  )}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" disabled={saving} onClick={handleSaveModel} className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">保存模型</button>
                {selectedModelId && (
                  <button type="button" disabled={saving} onClick={handleDeleteModel} className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40">删除模型</button>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3">
              <button type="button" onClick={resetAgentDraft} className="mb-3 w-full rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">新建智能体</button>
              {agents.map((agent) => (
                <button key={agent.id} type="button" onClick={() => setSelectedAgentId(agent.id)} className={`mb-2 w-full rounded-2xl px-4 py-3 text-left transition ${selectedAgentId === agent.id ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{agent.name}</div>
                    {agent.free && <span className="rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--success-text)]">free</span>}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-faint)]">{agent.id}</div>
                </button>
              ))}
            </aside>

            <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <input value={agentDraft.id} onChange={(event) => setAgentDraft((previous) => ({ ...previous, id: event.target.value }))} placeholder="智能体 ID" disabled={Boolean(selectedAgentId)} className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none disabled:opacity-50" />
                <input value={agentDraft.name} onChange={(event) => setAgentDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="智能体名称" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                <input value={agentDraft.role} onChange={(event) => setAgentDraft((previous) => ({ ...previous, role: event.target.value }))} placeholder="角色" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                <input value={agentDraft.avatarUrl} onChange={(event) => setAgentDraft((previous) => ({ ...previous, avatarUrl: event.target.value }))} placeholder="头像 URL" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                <textarea value={agentDraft.description} onChange={(event) => setAgentDraft((previous) => ({ ...previous, description: event.target.value }))} rows={3} placeholder="简介" className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 outline-none lg:col-span-2" />
                <textarea value={agentDraft.systemPrompt} onChange={(event) => setAgentDraft((previous) => ({ ...previous, systemPrompt: event.target.value }))} rows={6} placeholder="系统提示词，可写工具定义" className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 outline-none lg:col-span-2" />
                <textarea value={agentDraft.personaDefinition} onChange={(event) => setAgentDraft((previous) => ({ ...previous, personaDefinition: event.target.value }))} rows={14} placeholder="人格定义" className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 outline-none lg:col-span-2" />
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)] lg:col-span-2">
                  <input type="checkbox" checked={agentDraft.free} onChange={(event) => setAgentDraft((previous) => ({ ...previous, free: event.target.checked }))} />
                  免费智能体
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" disabled={saving} onClick={handleSaveAgent} className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">保存智能体</button>
                {selectedAgentId && (
                  <button type="button" disabled={saving} onClick={handleDeleteAgent} className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40">删除智能体</button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}