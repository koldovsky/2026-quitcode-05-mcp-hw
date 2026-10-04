# Run `vercel-describe`

Packed by `docs/mcp/scripts/pack-runs.mjs`; the originals (`transcript.jsonl`, `stderr.txt`, prompts) are in
`raw-runs.tar.gz` next to this file.

## meta.txt

```
claude: 2.1.289 (Claude Code)
model: opus · effort: high · cwd: /private/tmp/claude-501/ws5/empty
server: vercel = {"mcpServers":{"vercel":{"type":"http","url":"https://mcp.vercel.com"}}}
settings.json sha256: 6557ac76e64a37898e3e6c25d2b81f5065020e8bc1cf289c8c524d0bfbbee705 · git: untracked
.mcp.json sha256: def671e86e47f2327ea4de3497b726e6573bd383de44d5d3e02628c3d3f1c9e0 · git: untracked
prompt sha256: 7476b905633f842d501d42d7ad50eeb132ec32346fad7ecd63d096e1f1b67a86
prompt: Нічого не викликай, крім ToolSearch. Через ToolSearch завантаж схеми інструментів сервера vercel: get_auth_token, get_project_token, get_edge_config_token, web_fetch_vercel_url, generate_route, create_observability_query, extend_session_timeout, record_events, stage_redirects, stage_routes, test_drain, search_repo, get_deployment_file_contents, read_session_file, artifact_query, status, list_deployment_events, get_deployment, get_runtime_logs, get_vercel_ci_task_logs, join_team, sign_kms_token, retry_vercel_ci_invocation. Для кожного дай рядок: ім'я | перша фраза опису дослівно | змінює стан, видає секрет/токен чи робить запит назовні (так/ні). Окремо скажи, яким інструментом отримати лог білду (build log) конкретного деплою.
flags: -p --model opus --effort high --output-format stream-json --verbose --setting-sources project --strict-mcp-config --mcp-config <only vercel> --permission-mode default
started: 2026-10-04T09:29:34Z
exit: 0 · wall: 37s
note (added after the run, 2026-10-04): cwd was an empty folder outside the repo, so .claude/settings.json above was NOT loaded; the session ran with no project allow/deny. The script now records this case itself.
```

## Transcript

## Session

```
model: claude-opus-5-5 · claude 2.1.289 · permissionMode: default
cwd: /private/tmp/claude-501/ws5/empty
mcp_servers: vercel (connected)
MCP tools offered (244): mcp__vercel__accept_project_transfer_request, mcp__vercel__activate_kms_signing_key, mcp__vercel__add_project_domain, mcp__vercel__add_route, mcp__vercel__add_toolbar_reaction, mcp__vercel__aggregate_events, mcp__vercel__aggregate_pageviews, mcp__vercel__approve_rolling_release_stage, mcp__vercel__artifact_query, mcp__vercel__assign_alias, mcp__vercel__buy_addon, mcp__vercel__buy_credits, mcp__vercel__buy_credits_endpoint, mcp__vercel__buy_domain, mcp__vercel__buy_domains, mcp__vercel__buy_pro, mcp__vercel__buy_single_domain, mcp__vercel__cancel_deployment, mcp__vercel__change_toolbar_thread_resolve_status, mcp__vercel__complete_rolling_release, mcp__vercel__count_events, mcp__vercel__count_pageviews, mcp__vercel__create_api_keys, mcp__vercel__create_check, mcp__vercel__create_connector, mcp__vercel__create_deployment, mcp__vercel__create_deployment_check_run, mcp__vercel__create_drain, mcp__vercel__create_edge_config_token, mcp__vercel__create_flag, mcp__vercel__create_git_project, mcp__vercel__create_kms_issuer_policy, mcp__vercel__create_kms_signing_key, mcp__vercel__create_observability_query, mcp__vercel__create_or_transfer_domain, mcp__vercel__create_private_link_endpoint, mcp__vercel__create_project, mcp__vercel__create_project_env, mcp__vercel__create_sandboxes_sessions_by_session_id_snapshot_v2, mcp__vercel__create_sandboxes_sessions_by_session_id_snapshot_v3, mcp__vercel__create_sandboxes_v2, mcp__vercel__create_sandboxes_v3, mcp__vercel__create_sandboxes_v4, mcp__vercel__create_sdk_key, mcp__vercel__create_session_directory, mcp__vercel__create_storage_stores_blob, mcp__vercel__delete_project, mcp__vercel__edit_project_env, mcp__vercel__edit_route, mcp__vercel__edit_toolbar_message, mcp__vercel__exchange_sso_token, mcp__vercel__extend_session_timeout, mcp__vercel__filter_project_envs, mcp__vercel__generate_route, mcp__vercel__get_access_to_vercel_url, mcp__vercel__get_active_attack_status, mcp__vercel__get_agent_run, mcp__vercel__get_agent_run_trace, mcp__vercel__get_ai_gateway_virtual_model_config, mcp__vercel__get_ai_gateway_virtual_model_config_by_slug, mcp__vercel__get_auth_token, mcp__vercel__get_auth_user, mcp__vercel__get_bulk_availability, mcp__vercel__get_bulk_price, mcp__vercel__get_bypass_ip, mcp__vercel__get_check, mcp__vercel__get_configuration, mcp__vercel__get_connector, mcp__vercel__get_connector_project_connection, mcp__vercel__get_contact_info_schema, mcp__vercel__get_custom_environment, mcp__vercel__get_deployment, mcp__vercel__get_deployment_check_run, mcp__vercel__get_deployment_file_contents, mcp__vercel__get_domain_availability, mcp__vercel__get_domain_contact_verification, mcp__vercel__get_domain_order, mcp__vercel__get_domain_price, mcp__vercel__get_domains_records_by_record_id, mcp__vercel__get_drain, mcp__vercel__get_edge_config_backup, mcp__vercel__get_edge_config_token, mcp__vercel__get_firewall_config, mcp__vercel__get_flag, mcp__vercel__get_flag_segment, mcp__vercel__get_flag_settings, mcp__vercel__get_git_deployment_context, mcp__vercel__get_kms_issuer, mcp__vercel__get_microfrontends_config, mcp__vercel__get_microfrontends_config_for_project, mcp__vercel__get_named_sandbox, mcp__vercel__get_observability_schema, mcp__vercel__get_order, mcp__vercel__get_project, mcp__vercel__get_project_check, mcp__vercel__get_project_env, mcp__vercel__get_project_token, mcp__vercel__get_project_trace, mcp__vercel__get_purchase_quote, mcp__vercel__get_rolling_release, mcp__vercel__get_rolling_release_billing_status, mcp__vercel__get_rolling_release_config, mcp__vercel__get_runtime_errors, mcp__vercel__get_runtime_logs, mcp__vercel__get_session, mcp__vercel__get_session_command, mcp__vercel__get_session_command_logs, mcp__vercel__get_session_snapshot, mcp__vercel__get_shared_env_var, mcp__vercel__get_storage_stores_by_id, mcp__vercel__get_team, mcp__vercel__get_team_access_request, mcp__vercel__get_tld, mcp__vercel__get_tld_price, mcp__vercel__get_toolbar_thread, mcp__vercel__get_vercel_ci_invocation, mcp__vercel__get_vercel_ci_invocation_logs, mcp__vercel__get_vercel_ci_invocation_tree, mcp__vercel__get_vercel_ci_job_definition, mcp__vercel__get_vercel_ci_job_run, mcp__vercel__get_vercel_ci_job_run_logs, mcp__vercel__get_vercel_ci_task_logs, mcp__vercel__get_vercel_ci_task_run_logs, mcp__vercel__get_webhook, mcp__vercel__import-claude-design-from-url, mcp__vercel__invalidate_by_src_images, mcp__vercel__invalidate_by_tags, mcp__vercel__issue_cert, mcp__vercel__join_team, mcp__vercel__kill_session_command, mcp__vercel__list_access_group_members, mcp__vercel__list_access_group_projects, mcp__vercel__list_agent_run_projects, mcp__vercel__list_agent_runs, mcp__vercel__list_aliases, mcp__vercel__list_billing_charges, mcp__vercel__list_bulk_redirect_versions, mcp__vercel__list_bulk_redirects, mcp__vercel__list_certs, mcp__vercel__list_check_runs, mcp__vercel__list_connector_project_connections, mcp__vercel__list_connectors, mcp__vercel__list_contract_commitments, mcp__vercel__list_deployment_aliases, mcp__vercel__list_deployment_events, mcp__vercel__list_deployment_files, mcp__vercel__list_deployments, mcp__vercel__list_domains, mcp__vercel__list_drains, mcp__vercel__list_event_types, mcp__vercel__list_feature_flag_sdk_keys, mcp__vercel__list_flags, mcp__vercel__list_flags_v2, mcp__vercel__list_integration_billing_plans, mcp__vercel__list_integration_configuration_products, mcp__vercel__list_integration_configurations, mcp__vercel__list_microfrontends_group_projects, mcp__vercel__list_named_sandboxes, mcp__vercel__list_private_link_endpoints, mcp__vercel__list_project_connector_connections, mcp__vercel__list_project_custom_environments, mcp__vercel__list_project_domains, mcp__vercel__list_project_route_versions, mcp__vercel__list_project_routes, mcp__vercel__list_projects, mcp__vercel__list_promote_aliases, mcp__vercel__list_session_commands, mcp__vercel__list_session_snapshots, mcp__vercel__list_sessions, mcp__vercel__list_supported_tlds, mcp__vercel__list_team_members, mcp__vercel__list_teams, mcp__vercel__list_toolbar_threads, mcp__vercel__list_user_events, mcp__vercel__list_vercel_ci_invocation_attempts, mcp__vercel__list_vercel_ci_invocations, mcp__vercel__list_vercel_ci_job_definitions, mcp__vercel__list_vercel_ci_job_runs, mcp__vercel__list_vercel_ci_task_definitions, mcp__vercel__list_vercel_ci_task_runs, mcp__vercel__patch_edge_config_items, mcp__vercel__patch_edge_config_schema, mcp__vercel__patch_url_protection_bypass, mcp__vercel__pause_project, mcp__vercel__put_firewall_config, mcp__vercel__read_access_group, mcp__vercel__read_access_group_project, mcp__vercel__read_network, mcp__vercel__read_private_link_endpoint, mcp__vercel__read_session_file, mcp__vercel__record_events, mcp__vercel__replace_connector_trigger_destinations, mcp__vercel__replace_domains_by_domain_records, mcp__vercel__reply_to_toolbar_thread, mcp__vercel__request_promote, mcp__vercel__request_rollback, mcp__vercel__rerequest_check, mcp__vercel__restore_edge_config_backup, mcp__vercel__retry_vercel_ci_invocation, mcp__vercel__revoke_kms_signing_key, mcp__vercel__run_session_command, mcp__vercel__search_domains, mcp__vercel__search_repo, mcp__vercel__search_vercel_documentation, mcp__vercel__sign_kms_message, mcp__vercel__sign_kms_token, mcp__vercel__stage_redirects, mcp__vercel__stage_routes, mcp__vercel__start_rolling_release, mcp__vercel__status, mcp__vercel__stop_session, mcp__vercel__test_drain, mcp__vercel__unpause_project, mcp__vercel__update_ai_gateway_virtual_model_config_by_slug, mcp__vercel__update_attack_challenge_mode, mcp__vercel__update_check, mcp__vercel__update_connector, mcp__vercel__update_deployment_check_run, mcp__vercel__update_drain, mcp__vercel__update_edge_config, mcp__vercel__update_firewall_config, mcp__vercel__update_flag, mcp__vercel__update_flag_segment, mcp__vercel__update_flag_settings, mcp__vercel__update_kms_issuer, mcp__vercel__update_kms_issuer_policy, mcp__vercel__update_network, mcp__vercel__update_private_link_endpoint, mcp__vercel__update_project, mcp__vercel__update_project_check, mcp__vercel__update_project_protection_bypass, mcp__vercel__update_record, mcp__vercel__update_rolling_release_config, mcp__vercel__update_route_versions, mcp__vercel__update_sandbox, mcp__vercel__update_session_network_policy, mcp__vercel__update_shared_env_variable, mcp__vercel__update_version, mcp__vercel__upload_artifact, mcp__vercel__upload_cert, mcp__vercel__upload_file, mcp__vercel__upsert_connector_project_connection, mcp__vercel__web_fetch_vercel_url, mcp__vercel__write_session_files
built-in tools offered: Task, Artifact, ArtifactComments, ArtifactData, Bash, CronCreate, CronDelete, CronList, DesignSync, Edit, EnterWorktree, ExitWorktree, ListAgents, Monitor, NotebookEdit, PushNotification, Read, RemoteTrigger, ReportFindings, ScheduleWakeup, SendMessage, ShareOnboardingGuide, Skill, TaskStop, ToolSearch, WebFetch, WebSearch, Workflow, Write
```

### call 1: `ToolSearch`

```json
{
  "query": "select:mcp__vercel__get_auth_token,mcp__vercel__get_project_token,mcp__vercel__get_edge_config_token,mcp__vercel__web_fetch_vercel_url,mcp__vercel__generate_route,mcp__vercel__create_observability_query,mcp__vercel__extend_session_timeout,mcp__vercel__record_events,mcp__vercel__stage_redirects,mcp__vercel__stage_routes,mcp__vercel__test_drain,mcp__vercel__search_repo,mcp__vercel__get_deployment_file_contents,mcp__vercel__read_session_file,mcp__vercel__artifact_query,mcp__vercel__status,mcp__vercel__list_deployment_events,mcp__vercel__get_deployment,mcp__vercel__get_runtime_logs,mcp__vercel__get_vercel_ci_task_logs,mcp__vercel__join_team,mcp__vercel__sign_kms_token,mcp__vercel__retry_vercel_ci_invocation",
  "max_results": 30
}
```

→ result of call 1:

```
{"type":"tool_reference","tool_name":"mcp__vercel__get_auth_token"}
{"type":"tool_reference","tool_name":"mcp__vercel__get_project_token"}
{"type":"tool_reference","tool_name":"mcp__vercel__get_edge_config_token"}
{"type":"tool_reference","tool_name":"mcp__vercel__web_fetch_vercel_url"}
{"type":"tool_reference","tool_name":"mcp__vercel__generate_route"}
{"type":"tool_reference","tool_name":"mcp__vercel__create_observability_query"}
{"type":"tool_reference","tool_name":"mcp__vercel__extend_session_timeout"}
{"type":"tool_reference","tool_name":"mcp__vercel__record_events"}
{"type":"tool_reference","tool_name":"mcp__vercel__stage_redirects"}
{"type":"tool_reference","tool_name":"mcp__vercel__stage_routes"}
{"type":"tool_reference","tool_name":"mcp__vercel__test_drain"}
{"type":"tool_reference","tool_name":"mcp__vercel__search_repo"}
{"type":"tool_reference","tool_name":"mcp__vercel__get_deployment_file_contents"}
{"type":"tool_reference","tool_name":"mcp__vercel__read_session_file"}
{"type":"tool_reference","tool_name":"mcp__vercel__artifact_query"}
{"type":"tool_reference","tool_name":"mcp__vercel__status"}
{"type":"tool_reference","tool_name":"mcp__vercel__list_deployment_events"}
{"type":"tool_reference","tool_name":"mcp__vercel__get_deployment"}
{"type":"tool_reference","tool_name":"mcp__vercel__get_runtime_logs"}
{"type":"tool_reference","tool_name":"mcp__vercel__get_vercel_ci_task_logs"}
{"type":"tool_reference","tool_name":"mcp__vercel__join_team"}
{"type":"tool_reference","tool_name":"mcp__vercel__sign_kms_token"}
{"type":"tool_reference","tool_name":"mcp__vercel__retry_vercel_ci_invocation"}
```

### agent

Завантажив схеми всіх 23 інструментів через ToolSearch. Більше нічого не викликав.

**Формат:** ім'я | перша фраза опису дослівно | змінює стан / видає секрет чи токен / робить запит назовні

| # | Інструмент | Перша фраза опису | Так/ні |
|---|---|---|---|
| 1 | get_auth_token | Retrieve metadata about an authentication token belonging to the currently authenticated User. | **ні**: лише метадані, значення токена не повертає |
| 2 | get_project_token | Generates an OIDC token for the project and returns it. | **так**: видає токен |
| 3 | get_edge_config_token | Return meta data about a Global Config token. | **ні**: лише метадані. Сам токен треба передати на вхід |
| 4 | web_fetch_vercel_url | Creates or reuses a temporary authentication bypass link, then fetches a Vercel deployment URL and returns the response. | **так**: створює bypass-посилання, робить запит за URL і може перейти на зовнішні редиректи |
| 5 | generate_route | Generate a routing rule configuration from a natural language description. | **ні**: лише пропонує конфігурацію, нічого не зберігає |
| 6 | create_observability_query | createObservabilityQuery | **ні**: попри "create" у назві, за схемою це запит на читання метрик |
| 7 | extend_session_timeout | Extends the maximum execution time of a running session. | **так**: змінює стан сесії, може збільшити витрати |
| 8 | record_events | Records an artifacts cache usage event. | **так**: записує події |
| 9 | stage_redirects | Stages new redirects for a project and returns the new version. | **так**: створює staged-версію |
| 10 | stage_routes | Stage routing rules for a project. | **так**: створює staged-версію. З `overwrite: true` замінює всі правила |
| 11 | test_drain | Validate the delivery configuration of a Drain using sample events. | **так**: надсилає тестові події на зовнішній endpoint |
| 12 | search_repo | Lists git repositories linked to a namespace `id` for a supported provider. | **ні**: тільки читання |
| 13 | get_deployment_file_contents | Allows to retrieve the content of a file by supplying the file identifier and the deployment unique identifier. | **ні**: тільки читання. Але у файлах деплою можуть бути секрети |
| 14 | read_session_file | Downloads the contents of a file from a session's filesystem. | **ні**: тільки читання |
| 15 | artifact_query | Query information about an array of artifacts. | **ні** |
| 16 | status | Check the status of Remote Caching for this principal. | **ні** |
| 17 | list_deployment_events | Get the build logs of a deployment by deployment ID and build ID. | **ні** |
| 18 | get_deployment | Retrieves information for a deployment either by supplying its ID (`id` property) or Hostname (`url` property). | **ні** |
| 19 | get_runtime_logs | Get runtime logs for a project or deployment. | **ні** |
| 20 | get_vercel_ci_task_logs | Returns log lines for the tasks of an invocation attempt in a single request, grouped by task. | **ні** |
| 21 | join_team | Join a team with a provided invite code or team ID. | **так**: змінює членство в команді |
| 22 | sign_kms_token | Sign a JWT with a KMS issuer's active signing key. | **так**: видає підписаний JWT |
| 23 | retry_vercel_ci_invocation | Retry Invocation | **так**: перезапускає CI |

**Лог білду конкретного деплою:** потрібен `list_deployment_events`. Обов'язковий параметр `idOrUrl`: ID деплою (`dpl_...`) або його hostname. Додатково можна передати:
- `name`: ID білду (`bld_...`);
- `limit: -1`: щоб отримати весь лог;
- `follow: 1`: щоб дивитися лог наживо.

Інші два інструменти для цього не підходять:
- `get_runtime_logs` показує логи виконання функцій, а не білду;
- `get_vercel_ci_task_logs` стосується задач Vercel CI, а не білду деплою.

---

## Result

```
tool calls: 1 · turns: 2 · duration: 33 s · cost: $0.26
permission denials: none
```

