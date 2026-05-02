(() => {
  const elements = {
    pageTitle: document.getElementById('page-title'),
    pageDescription: document.getElementById('page-description'),
    methodSelect: document.getElementById('method-select'),
    endpointComboboxInput: document.getElementById('endpoint-combobox-input'),
    endpointComboboxList: document.getElementById('endpoint-combobox-list'),
    workspaceParamsSection: document.getElementById('workspace-params-section'),
    formHint: document.getElementById('form-hint'),
    requestPanels: document.getElementById('request-panels'),
    responseMeta: document.getElementById('response-meta'),
    responsePreview: document.getElementById('response-preview'),
    sendRequestButton: document.getElementById('send-request'),
    logMeta: document.getElementById('log-meta'),
    requestLogDetail: document.getElementById('request-log-detail'),
  };

  const state = {
    metadata: null,
    endpointMap: new Map(),
    activeEndpointId: null,
    searchKeyword: '',
    methodFilter: 'ALL',
    visibleEndpointIds: [],
    comboboxOpen: false,
    comboboxBlurTimer: null,
    requestLogs: [],
  };

  function getActiveEndpoint() {
    return state.endpointMap.get(state.activeEndpointId) || null;
  }

  function getVisibleEndpoints() {
    return state.visibleEndpointIds
      .map((endpointId) => state.endpointMap.get(endpointId))
      .filter(Boolean);
  }

  function getBodyEditor() {
    return document.getElementById('body-json');
  }

  function clearComboboxBlurTimer() {
    if (state.comboboxBlurTimer) {
      window.clearTimeout(state.comboboxBlurTimer);
      state.comboboxBlurTimer = null;
    }
  }

  function setComboboxOpen(isOpen) {
    state.comboboxOpen = isOpen;
    elements.endpointComboboxInput.setAttribute('aria-expanded', String(isOpen));
    elements.endpointComboboxList.classList.toggle('hidden', !isOpen);
  }

  function logRequestLifecycle(stage, details) {
    console.log(`[explorer.request-log] ${stage}`, details);
  }

  function normalizeSearchKeyword(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function formatTimestamp(timestamp) {
    try {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour12: false,
      });
    } catch (_error) {
      return timestamp;
    }
  }

  function formatDuration(duration) {
    if (duration === null || duration === undefined) {
      return '--';
    }

    return `${duration}ms`;
  }

  function getStatusLabel(status) {
    if (status === 'pending') {
      return '进行中';
    }

    if (status === 'error') {
      return '失败';
    }

    return String(status);
  }

  function filterEndpoints(endpoints, searchKeyword, methodFilter) {
    const keyword = normalizeSearchKeyword(searchKeyword);

    return endpoints.filter((endpoint) => {
      const matchesMethod = methodFilter === 'ALL' || endpoint.method === methodFilter;

      if (!matchesMethod) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [endpoint.name, endpoint.category, endpoint.path].some((fieldValue) =>
        String(fieldValue || '')
          .toLowerCase()
          .includes(keyword),
      );
    });
  }

  function syncVisibleEndpoints() {
    const endpoints = state.metadata?.endpoints || [];
    const visibleEndpoints = filterEndpoints(endpoints, state.searchKeyword, state.methodFilter);

    state.visibleEndpointIds = visibleEndpoints.map((endpoint) => endpoint.id);

    if (!state.visibleEndpointIds.length) {
      state.activeEndpointId = null;
      return;
    }

    if (!state.activeEndpointId || !state.visibleEndpointIds.includes(state.activeEndpointId)) {
      state.activeEndpointId = state.visibleEndpointIds[0];
    }
  }

  function createInput(field, sectionKey) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field-grid';

    const label = document.createElement('label');
    label.className = 'field-label';
    label.htmlFor = `${sectionKey}-${field.key}`;
    label.textContent = `${field.label}${field.required ? ' *' : ''}`;

    let input;

    if (field.inputType === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'textarea';
    } else if (field.inputType === 'boolean') {
      input = document.createElement('select');
      input.className = 'input';

      ['', 'true', 'false'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value || '请选择';
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.inputType === 'number' ? 'number' : 'text';
      input.className = 'input';
    }

    input.id = `${sectionKey}-${field.key}`;
    input.dataset.section = sectionKey;
    input.dataset.fieldKey = field.key;
    input.placeholder = field.placeholder || '';

    if (field.defaultValue !== undefined) {
      input.value = String(field.defaultValue);
    }

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    if (field.description) {
      const helpText = document.createElement('p');
      helpText.className = 'field-help';
      helpText.textContent = field.description;
      wrapper.appendChild(helpText);
    }

    return wrapper;
  }

  function createRequestSection(titleText, childNodes, descriptionText) {
    const section = document.createElement('section');
    section.className = 'form-section';

    const header = document.createElement('div');
    header.className = 'request-section-header';

    const headingGroup = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'section-title';
    title.textContent = titleText;
    headingGroup.appendChild(title);

    if (descriptionText) {
      const description = document.createElement('p');
      description.className = 'field-help';
      description.textContent = descriptionText;
      headingGroup.appendChild(description);
    }

    header.appendChild(headingGroup);
    section.appendChild(header);

    const content = document.createElement('div');
    content.className = 'request-section-content';

    childNodes.forEach((node) => {
      content.appendChild(node);
    });

    section.appendChild(content);
    return section;
  }

  function createBodySection(endpoint) {
    const textarea = document.createElement('textarea');
    textarea.id = 'body-json';
    textarea.className = 'textarea';
    textarea.value = JSON.stringify(endpoint.bodyExample || {}, null, 2);

    return createRequestSection(
      'Body JSON',
      [textarea],
      endpoint.bodyDescription || '请求体需为合法 JSON 对象。',
    );
  }

  function getFormHintText(endpoint) {
    return (
      [
        endpoint.pathParams?.length ? `路径参数 ${endpoint.pathParams.length}` : null,
        endpoint.queryParams?.length ? `查询参数 ${endpoint.queryParams.length}` : null,
        endpoint.method === 'POST' ? '支持 Body JSON' : null,
      ]
        .filter(Boolean)
        .join(' · ') || '当前接口无需额外参数'
    );
  }

  function renderRequestConfig(endpoint) {
    const pathParams = endpoint.pathParams || [];
    const queryParams = endpoint.queryParams || [];
    const hasBody = endpoint.method === 'POST';
    const inputSections = [];

    elements.requestPanels.innerHTML = '';
    elements.formHint.textContent = getFormHintText(endpoint);

    if (pathParams.length) {
      const nodes = pathParams.map((field) => createInput(field, 'pathParams'));
      inputSections.push(createRequestSection('路径参数', nodes, '用于替换接口路径中的动态片段。'));
    }

    if (queryParams.length) {
      const nodes = queryParams.map((field) => createInput(field, 'queryParams'));
      inputSections.push(createRequestSection('查询参数', nodes, '仅会提交非空的查询参数。'));
    }

    if (hasBody) {
      inputSections.push(createBodySection(endpoint));
    }

    if (!inputSections.length) {
      elements.workspaceParamsSection.classList.add('hidden');
      return;
    }

    const requestForm = document.createElement('form');
    requestForm.id = 'request-form';
    requestForm.className = 'form-sections';

    inputSections.forEach((section) => {
      requestForm.appendChild(section);
    });

    elements.workspaceParamsSection.classList.remove('hidden');
    elements.requestPanels.appendChild(requestForm);
  }

  function getFieldValues(sectionKey) {
    const values = {};
    const inputs = elements.requestPanels.querySelectorAll(`[data-section="${sectionKey}"]`);

    inputs.forEach((input) => {
      values[input.dataset.fieldKey] = input.value;
    });

    return values;
  }

  function buildUrl(endpoint) {
    const pathValues = getFieldValues('pathParams');
    const queryValues = getFieldValues('queryParams');
    let urlPath = endpoint.path.replace(/:([A-Za-z0-9_]+)\??/g, (_match, key) =>
      pathValues[key] ? encodeURIComponent(pathValues[key]) : '',
    );

    urlPath = urlPath.replace(/\/{2,}/g, '/');

    const searchParams = new URLSearchParams();
    Object.keys(queryValues).forEach((key) => {
      const value = queryValues[key];

      if (value !== '') {
        searchParams.set(key, value);
      }
    });

    const queryString = searchParams.toString();
    return `${urlPath}${queryString ? `?${queryString}` : ''}`;
  }

  function parseRequestBody(bodyText) {
    if (!bodyText?.trim()) {
      return undefined;
    }

    let parsedBody;

    try {
      parsedBody = JSON.parse(bodyText);
    } catch (_error) {
      throw new Error('Body JSON 不是合法的 JSON。');
    }

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      throw new Error('Body JSON 必须是一个 JSON 对象。');
    }

    return parsedBody;
  }

  function buildRequestPayload(endpoint) {
    const payload = {
      method: endpoint.method,
      url: buildUrl(endpoint),
      bodyText: '',
      body: undefined,
    };

    if (endpoint.method === 'POST') {
      const bodyEditor = getBodyEditor();
      const bodyText = bodyEditor ? bodyEditor.value.trim() : '';

      payload.bodyText = bodyText;
      payload.body = parseRequestBody(bodyText);
    }

    return payload;
  }

  function validateFields(endpoint) {
    const missingFields = [];

    ['pathParams', 'queryParams'].forEach((sectionKey) => {
      const fields = endpoint[sectionKey] || [];
      const values = getFieldValues(sectionKey);

      fields.forEach((field) => {
        if (field.required && !values[field.key]) {
          missingFields.push(field.label);
        }
      });
    });

    return missingFields;
  }

  function resetResponsePanel() {
    elements.responseMeta.textContent = '发送请求后在这里查看最新结果';
    elements.responsePreview.classList.remove('error-text');
    elements.responsePreview.textContent = '等待请求...';
  }

  function buildEndpointOptionLabel(endpoint) {
    return `${endpoint.name} · ${endpoint.path}`;
  }

  function buildEndpointOptionDescription(endpoint) {
    return `${endpoint.category} · ${endpoint.path}`;
  }

  function renderMethodSelect() {
    elements.methodSelect.value = state.methodFilter;
  }

  function renderComboboxInput() {
    const activeEndpoint = getActiveEndpoint();
    const inputValue =
      state.comboboxOpen || state.searchKeyword
        ? state.searchKeyword
        : activeEndpoint
          ? buildEndpointOptionLabel(activeEndpoint)
          : '';

    elements.endpointComboboxInput.value = inputValue;
  }

  function createComboboxOption(endpoint) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'endpoint-combobox-option';
    option.dataset.endpointId = endpoint.id;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(endpoint.id === state.activeEndpointId));
    option.classList.toggle('is-active', endpoint.id === state.activeEndpointId);

    const method = document.createElement('span');
    method.className = `endpoint-combobox-method ${String(endpoint.method).toLowerCase()}`;
    method.textContent = endpoint.method;

    const copy = document.createElement('div');
    copy.className = 'endpoint-combobox-copy';

    const title = document.createElement('span');
    title.className = 'endpoint-combobox-title';
    title.textContent = buildEndpointOptionLabel(endpoint);

    const description = document.createElement('span');
    description.className = 'endpoint-combobox-description';
    description.textContent = buildEndpointOptionDescription(endpoint);

    copy.appendChild(title);
    copy.appendChild(description);
    option.appendChild(method);
    option.appendChild(copy);

    return option;
  }

  function renderComboboxList() {
    const visibleEndpoints = getVisibleEndpoints();
    elements.endpointComboboxList.innerHTML = '';

    if (!visibleEndpoints.length) {
      const emptyState = document.createElement('div');
      emptyState.className = 'endpoint-combobox-empty';
      emptyState.textContent = '没有匹配的接口';
      elements.endpointComboboxList.appendChild(emptyState);
      return;
    }

    visibleEndpoints.forEach((endpoint) => {
      elements.endpointComboboxList.appendChild(createComboboxOption(endpoint));
    });
  }

  function renderToolbar() {
    renderMethodSelect();
    renderComboboxInput();
    renderComboboxList();
    setComboboxOpen(state.comboboxOpen);
    elements.sendRequestButton.disabled = !getActiveEndpoint();
  }

  function renderEmptyWorkspace() {
    elements.formHint.textContent = '等待选择接口';
    elements.workspaceParamsSection.classList.add('hidden');
    elements.requestPanels.innerHTML = '';
    resetResponsePanel();
  }

  function renderActiveEndpoint() {
    const endpoint = getActiveEndpoint();

    if (!endpoint) {
      renderEmptyWorkspace();
      return;
    }

    renderRequestConfig(endpoint);
    resetResponsePanel();
  }

  function createLogEntry(endpoint, payload) {
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      method: endpoint.method,
      url: payload.url,
      requestBody: payload.bodyText || '',
      status: 'pending',
      duration: null,
      responsePreview: '请求进行中...',
      errorMessage: '',
    };

    logRequestLifecycle('create', {
      activeEndpointId: state.activeEndpointId,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      method: endpoint.method,
      url: payload.url,
    });

    return logEntry;
  }

  function updateLogEntry(logId, patch) {
    state.requestLogs = state.requestLogs.map((log) =>
      log.id === logId ? Object.assign({}, log, patch) : log,
    );

    const updatedLog = state.requestLogs.find((log) => log.id === logId) || null;

    logRequestLifecycle('update', {
      logId,
      patch,
      requestLogCount: state.requestLogs.length,
      updatedLog,
    });
  }

  function formatRequestLogDetail(log) {
    const header = `$ [${formatTimestamp(log.timestamp)}] ${log.method} ${log.url}`;
    const responseLabel = log.errorMessage ? '> error' : '> response';

    return [
      header,
      `> endpoint: ${log.endpointName}`,
      `> status: ${getStatusLabel(log.status)}`,
      `> duration: ${formatDuration(log.duration)}`,
      '',
      '> request body',
      log.requestBody || '(empty)',
      '',
      responseLabel,
      log.errorMessage || log.responsePreview || '(empty)',
    ].join('\n');
  }

  function renderRequestLogs() {
    if (!state.requestLogs.length) {
      elements.logMeta.textContent = '当前会话暂无请求记录';
      elements.requestLogDetail.textContent = '发送请求后将在这里看到会话日志。';
      logRequestLifecycle('render-empty', {
        requestLogCount: 0,
      });
      return;
    }

    elements.logMeta.textContent = `当前会话共 ${state.requestLogs.length} 条请求记录`;
    elements.requestLogDetail.textContent = state.requestLogs
      .map((log, index) =>
        [
          `========== session record ${String(index + 1).padStart(2, '0')} ==========`,
          formatRequestLogDetail(log),
        ].join('\n'),
      )
      .join('\n\n');

    logRequestLifecycle('render-detail', {
      requestLogCount: state.requestLogs.length,
      latestStatus: state.requestLogs[0]?.status,
      latestDuration: state.requestLogs[0]?.duration,
      latestEndpointName: state.requestLogs[0]?.endpointName,
    });
  }

  function handleFilterChange(methodFilter) {
    const previousActiveEndpointId = state.activeEndpointId;

    state.methodFilter = methodFilter;
    syncVisibleEndpoints();
    renderToolbar();

    if (state.activeEndpointId !== previousActiveEndpointId) {
      renderActiveEndpoint();
    }
  }

  function handleSearchChange(keyword) {
    const previousActiveEndpointId = state.activeEndpointId;

    state.searchKeyword = keyword;
    syncVisibleEndpoints();
    renderToolbar();

    if (state.activeEndpointId !== previousActiveEndpointId) {
      renderActiveEndpoint();
    }
  }

  function handleEndpointSelect(endpointId) {
    if (!endpointId || endpointId === state.activeEndpointId) {
      return;
    }

    state.activeEndpointId = endpointId;
    renderToolbar();
    renderActiveEndpoint();
  }

  function openCombobox() {
    clearComboboxBlurTimer();
    setComboboxOpen(true);
    renderComboboxList();
  }

  function closeCombobox() {
    clearComboboxBlurTimer();
    state.searchKeyword = '';
    syncVisibleEndpoints();
    setComboboxOpen(false);
    renderToolbar();
    renderActiveEndpoint();
  }

  async function sendRequest() {
    const endpoint = getActiveEndpoint();

    if (!endpoint) {
      return;
    }

    const missingFields = validateFields(endpoint);
    if (missingFields.length) {
      logRequestLifecycle('validation-failed', {
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        missingFields,
      });
      elements.responseMeta.textContent = '请求未发送';
      elements.responsePreview.classList.add('error-text');
      elements.responsePreview.textContent = `缺少必填参数: ${missingFields.join(', ')}`;
      return;
    }

    let payload;

    try {
      payload = buildRequestPayload(endpoint);
    } catch (error) {
      logRequestLifecycle('payload-invalid', {
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        error: error instanceof Error ? error.message : String(error),
      });
      elements.responseMeta.textContent = '请求未发送';
      elements.responsePreview.classList.add('error-text');
      elements.responsePreview.textContent = error instanceof Error ? error.message : String(error);
      return;
    }

    const logEntry = createLogEntry(endpoint, payload);
    const startTime = performance.now();

    state.requestLogs.unshift(logEntry);
    renderRequestLogs();

    elements.sendRequestButton.disabled = true;
    elements.sendRequestButton.textContent = '请求中...';
    elements.responseMeta.textContent = '请求中...';
    elements.responsePreview.classList.remove('error-text');
    elements.responsePreview.textContent = '正在等待响应...';

    try {
      const options = {
        method: endpoint.method,
        headers: {},
      };

      if (endpoint.method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        options.body = payload.body ? JSON.stringify(payload.body) : undefined;
      }

      logRequestLifecycle('fetch-dispatch', {
        logId: logEntry.id,
        method: options.method,
        url: payload.url,
        hasBody: Boolean(options.body),
        headers: options.headers,
      });

      const response = await fetch(payload.url, options);
      const duration = Math.round(performance.now() - startTime);
      const responseText = await response.text();
      let parsedBody = responseText;

      try {
        parsedBody = JSON.parse(responseText);
      } catch (_error) {
        parsedBody = responseText;
      }

      const responsePreviewText =
        typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody, null, 2);

      elements.responseMeta.textContent = `状态: ${response.status} | 耗时: ${duration}ms`;
      elements.responsePreview.classList.remove('error-text');
      elements.responsePreview.textContent = responsePreviewText;

      updateLogEntry(logEntry.id, {
        status: response.status,
        duration,
        responsePreview: responsePreviewText,
        errorMessage: '',
      });

      logRequestLifecycle('fetch-success', {
        logId: logEntry.id,
        status: response.status,
        duration,
        responsePreviewLength: responsePreviewText.length,
      });
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);

      elements.responseMeta.textContent = '请求失败';
      elements.responsePreview.classList.add('error-text');
      elements.responsePreview.textContent = errorMessage;

      updateLogEntry(logEntry.id, {
        status: 'error',
        duration,
        responsePreview: '',
        errorMessage,
      });

      logRequestLifecycle('fetch-error', {
        logId: logEntry.id,
        duration,
        errorMessage,
      });
    } finally {
      elements.sendRequestButton.disabled = false;
      elements.sendRequestButton.textContent = '发送请求';
      renderRequestLogs();
      renderToolbar();
      logRequestLifecycle('send-finish', {
        logId: logEntry.id,
        requestLogCount: state.requestLogs.length,
      });
    }
  }

  async function initialize() {
    try {
      const response = await fetch('/explorer/metadata');
      const metadata = await response.json();

      state.metadata = metadata;
      state.endpointMap = new Map();
      (metadata.endpoints || []).forEach((endpoint) => {
        state.endpointMap.set(endpoint.id, endpoint);
      });

      elements.pageTitle.textContent = metadata.title;
      elements.pageDescription.textContent = metadata.description;

      syncVisibleEndpoints();
      renderToolbar();
      renderActiveEndpoint();
      renderRequestLogs();
    } catch (error) {
      elements.responseMeta.textContent = '初始化失败';
      elements.responsePreview.classList.add('error-text');
      elements.responsePreview.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  elements.methodSelect.addEventListener('change', (event) => {
    handleFilterChange(event.target.value);
  });

  elements.endpointComboboxInput.addEventListener('focus', () => {
    openCombobox();
    elements.endpointComboboxInput.select();
  });

  elements.endpointComboboxInput.addEventListener('click', () => {
    openCombobox();
  });

  elements.endpointComboboxInput.addEventListener('input', (event) => {
    handleSearchChange(event.target.value);
    setComboboxOpen(true);
  });

  elements.endpointComboboxInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const firstVisibleEndpoint = getVisibleEndpoints()[0];

      if (firstVisibleEndpoint) {
        handleEndpointSelect(firstVisibleEndpoint.id);
      }
      closeCombobox();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeCombobox();
    }
  });

  elements.endpointComboboxInput.addEventListener('blur', () => {
    clearComboboxBlurTimer();
    state.comboboxBlurTimer = window.setTimeout(() => {
      closeCombobox();
    }, 120);
  });

  elements.endpointComboboxList.addEventListener('mousedown', (event) => {
    const target = event.target.closest('[data-endpoint-id]');

    if (target) {
      event.preventDefault();
    }
  });

  elements.endpointComboboxList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-endpoint-id]');

    if (!target) {
      return;
    }

    handleEndpointSelect(target.dataset.endpointId);
    closeCombobox();
  });

  elements.sendRequestButton.addEventListener('click', sendRequest);

  initialize();
})();
