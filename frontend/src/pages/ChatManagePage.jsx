import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  copyChatManagementModel,
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
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';
import AvatarUpload from '../components/AvatarUpload';
import ManagementPageLayout from '../components/layout/ManagementPageLayout';

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
  avatarFileId: '',
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
    avatarFileId: agent.avatarFileId || '',
    avatarUrl: agent.avatarUrl || '',
    personaDefinition: agent.personaDefinition || '',
    systemPrompt: agent.systemPrompt || '',
    free: agent.free !== false,
  };
}

function Field({ id, label, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[color:var(--text-secondary)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function HelpTooltip({ label, children }) {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        aria-label={`${label}`}
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
  const { t } = useAppShell();
  const { hasSession } = useAuthState();
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
    title: `${t('chatManage.pageTitle')} - XiaoNiu Tech`,
    description: t('chatManage.pageTitle'),
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
        setError(t('chatManage.noAccess'));
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
      setError(nextError.message || 'Failed');
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
        setMessage(t('chatManage.modelUpdated'));
      } else {
        await createChatManagementModel(payload);
        setMessage(t('chatManage.modelCreated'));
      }

      await loadData();
    } catch (nextError) {
      setError(nextError.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyModel() {
    if (!selectedModelId) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await copyChatManagementModel(selectedModelId);
      setMessage(t('chatManage.modelCopied'));
      await loadData();
      if (result.model?.id) {
        setSelectedModelId(result.model.id);
      }
    } catch (nextError) {
      setError(nextError.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModel() {
    if (!selectedModelId) {
      return;
    }
    if (!window.confirm(t('chatManage.deleteModelConfirm', { name: selectedModel?.name || selectedModelId }))) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deleteChatManagementModel(selectedModelId);
      resetModelDraft();
      setMessage(t('chatManage.modelDeleted'));
      await loadData();
    } catch (nextError) {
      setError(nextError.message || 'Failed');
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
        avatarFileId: agentDraft.avatarFileId || '',
        personaDefinition: agentDraft.personaDefinition,
        systemPrompt: agentDraft.systemPrompt,
        free: agentDraft.free,
      };

      if (selectedAgentId) {
        await updateChatManagementAgent(selectedAgentId, payload);
        setMessage(t('chatManage.agentUpdated'));
      } else {
        await createChatManagementAgent(payload);
        setMessage(t('chatManage.agentCreated'));
      }

      await loadData();
    } catch (nextError) {
      setError(nextError.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAgent() {
    if (!selectedAgentId) {
      return;
    }
    if (!window.confirm(t('chatManage.deleteAgentConfirm', { name: selectedAgent?.name || selectedAgentId }))) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deleteChatManagementAgent(selectedAgentId);
      resetAgentDraft();
      setMessage(t('chatManage.agentDeleted'));
      await loadData();
    } catch (nextError) {
      setError(nextError.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagementPageLayout eyebrow={t('chatManage.chatModule')} title={t('chatManage.pageTitle')}>
        <div className="mb-5 flex flex-wrap gap-2">
          {canManageModels && (
            <button type="button" onClick={() => updateTab('models')} className={`rounded-xl px-4 py-2 text-sm transition ${currentTab === 'models' ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
              {t('chatManage.modelConfig')}
            </button>
          )}
          {canManageAgents && (
            <button type="button" onClick={() => updateTab('agents')} className={`rounded-xl px-4 py-2 text-sm transition ${currentTab === 'agents' ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
              {t('chatManage.agentConfig')}
            </button>
          )}
        </div>

        {(message || error) && (
          <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[color:var(--danger-text)]' : 'border-[color:var(--success-border)] bg-[var(--success-soft)] text-[color:var(--success-text)]'}`}>
            {error || message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-12 text-center text-[color:var(--text-muted)]">{t('common.loading')}</div>
        ) : error && !access ? (
          <div className="rounded-3xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-8 text-[color:var(--danger-text)]">{error}</div>
        ) : currentTab === 'models' ? (
          <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3">
              <button type="button" onClick={resetModelDraft} className="mb-3 w-full rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('chatManage.newModel')}</button>
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
                <Field id="model-provider" label={t('chatManage.modelProvider')}>
                  <input id="model-provider" value={modelDraft.provider} onChange={(event) => setModelDraft((previous) => ({ ...previous, provider: event.target.value }))} placeholder="例如 deepseek" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </Field>
                <Field id="model-modelId" label={t('chatManage.modelId')}>
                  <input id="model-modelId" value={modelDraft.modelId} onChange={(event) => setModelDraft((previous) => ({ ...previous, modelId: event.target.value }))} placeholder="例如 deepseek-chat" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </Field>
                <Field id="model-name" label={t('chatManage.modelDisplayName')} className="lg:col-span-2">
                  <input id="model-name" value={modelDraft.name} onChange={(event) => setModelDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="例如 DeepSeek Chat" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </Field>
                <Field id="model-input" label={t('chatManage.modelInputType')}>
                  <input id="model-input" value={modelDraft.inputText} onChange={(event) => setModelDraft((previous) => ({ ...previous, inputText: event.target.value }))} placeholder="text" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="model-contextWindow" label={t('chatManage.modelContextWindow')}>
                    <input id="model-contextWindow" value={modelDraft.contextWindow} onChange={(event) => setModelDraft((previous) => ({ ...previous, contextWindow: event.target.value }))} placeholder="例如 128000" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                  </Field>
                  <Field id="model-maxTokens" label={t('chatManage.modelMaxTokens')}>
                    <input id="model-maxTokens" value={modelDraft.maxTokens} onChange={(event) => setModelDraft((previous) => ({ ...previous, maxTokens: event.target.value }))} placeholder="例如 8192" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                  </Field>
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)]">
                  <input type="checkbox" checked={modelDraft.free} onChange={(event) => setModelDraft((previous) => ({ ...previous, free: event.target.checked }))} />
                  {t('chatManage.freeModel')}
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)]">
                  <input type="checkbox" checked={modelDraft.reasoning} onChange={(event) => setModelDraft((previous) => ({ ...previous, reasoning: event.target.checked }))} />
                  {t('chatManage.reasoningModel')}
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)] lg:col-span-2">
                  <input type="checkbox" checked={modelDraft.isDefault} onChange={(event) => setModelDraft((previous) => ({ ...previous, isDefault: event.target.checked }))} />
                  {t('chatManage.defaultModel')}
                </label>
                <JsonTextareaField
                  id="model-provider-config"
                  label={t('chatManage.providerConfig')}
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
                  label={t('chatManage.compatConfig')}
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
                <button type="button" disabled={saving} onClick={handleSaveModel} className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('chatManage.saveModel')}</button>
                {selectedModelId && (
                  <button type="button" disabled={saving} onClick={handleCopyModel} className="rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('chatManage.copyModel')}</button>
                )}
                {selectedModelId && (
                  <button type="button" disabled={saving} onClick={handleDeleteModel} className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40">{t('chatManage.deleteModel')}</button>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3">
              <button type="button" onClick={resetAgentDraft} className="mb-3 w-full rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('chatManage.newAgent')}</button>
              {agents.map((agent) => (
                <button key={agent.id} type="button" onClick={() => setSelectedAgentId(agent.id)} className={`mb-2 w-full rounded-2xl px-4 py-3 text-left transition ${selectedAgentId === agent.id ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{agent.name}</div>
                    {agent.free && <span className="rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--success-text)]">free</span>}
                  </div>
                </button>
              ))}
            </aside>

            <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                {!selectedAgentId && (
                  <Field id="agent-id" label={t('chatManage.agentId')}>
                    <input id="agent-id" value={agentDraft.id} onChange={(event) => setAgentDraft((previous) => ({ ...previous, id: event.target.value }))} placeholder="例如 xiaonaimo" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                  </Field>
                )}
                <Field id="agent-name" label={t('chatManage.agentName')}>
                  <input id="agent-name" value={agentDraft.name} onChange={(event) => setAgentDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="例如 小奶茉" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </Field>
                <Field id="agent-role" label={t('chatManage.agentRole')}>
                  <input id="agent-role" value={agentDraft.role} onChange={(event) => setAgentDraft((previous) => ({ ...previous, role: event.target.value }))} placeholder="例如 猫娘助手" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                </Field>
                <Field id="agent-avatar" label={t('chatManage.agentAvatar')} className="lg:col-span-2">
                  <AvatarUpload
                    currentUrl={agentDraft.avatarUrl}
                    username={agentDraft.name || 'A'}
                    onUploaded={(fileId, url) => setAgentDraft((previous) => ({ ...previous, avatarFileId: fileId, avatarUrl: url }))}
                  />
                </Field>
                <Field id="agent-description" label={t('chatManage.agentDescription')} className="lg:col-span-2">
                  <textarea id="agent-description" value={agentDraft.description} onChange={(event) => setAgentDraft((previous) => ({ ...previous, description: event.target.value }))} rows={3} placeholder="简短的描述文本" className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 outline-none" />
                </Field>
                <Field id="agent-systemPrompt" label={t('chatManage.agentSystemPrompt')} className="lg:col-span-2">
                  <textarea id="agent-systemPrompt" value={agentDraft.systemPrompt} onChange={(event) => setAgentDraft((previous) => ({ ...previous, systemPrompt: event.target.value }))} rows={6} placeholder="系统级 prompt，可写工具定义" className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 outline-none" />
                </Field>
                <Field id="agent-personaDefinition" label={t('chatManage.agentPersonaDefinition')} className="lg:col-span-2">
                  <textarea id="agent-personaDefinition" value={agentDraft.personaDefinition} onChange={(event) => setAgentDraft((previous) => ({ ...previous, personaDefinition: event.target.value }))} rows={14} placeholder="详细的人格描述和行为规则" className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-3 outline-none" />
                </Field>
                <label className="flex items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm text-[color:var(--text-secondary)] lg:col-span-2">
                  <input type="checkbox" checked={agentDraft.free} onChange={(event) => setAgentDraft((previous) => ({ ...previous, free: event.target.checked }))} />
                  {t('chatManage.freeAgent')}
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" disabled={saving} onClick={handleSaveAgent} className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('chatManage.saveAgent')}</button>
                {selectedAgentId && (
                  <button type="button" disabled={saving} onClick={handleDeleteAgent} className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40">{t('chatManage.deleteAgent')}</button>
                )}
              </div>
            </section>
          </div>
        )}
    </ManagementPageLayout>
  );
}