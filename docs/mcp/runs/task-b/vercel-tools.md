# Run `vercel-tools`

Packed by `docs/mcp/scripts/pack-runs.mjs`; the originals (`transcript.jsonl`, `stderr.txt`, prompts) are in
`raw-runs.tar.gz` next to this file.

## meta.txt

```
claude: 2.1.289 (Claude Code)
model: opus · effort: high · cwd: /Users/hryhorii_haponiuk/Desktop/Work Folder/Agentic Course/2026-quitcode-05-mcp-hw
server: vercel = {"mcpServers":{"vercel":{"type":"http","url":"https://mcp.vercel.com"}}}
settings.json sha256: a327c19c63d0351cbb675342ed58e735d750f1bfe2cf54609ef9ae6cce19a12d · git: untracked
.mcp.json sha256: def671e86e47f2327ea4de3497b726e6573bd383de44d5d3e02628c3d3f1c9e0 · git: untracked
prompt sha256: 1bf5a3596e35a58386645e6cf928f3ecef1e414621c75b2cd5faa196b7d2a6f2
prompt: Перелічи всі інструменти сервера vercel, які тобі зараз доступні. Нічого не викликай.
flags: -p --model opus --effort high --output-format stream-json --verbose --setting-sources project --strict-mcp-config --mcp-config <only vercel> --permission-mode default
started: 2026-10-04T09:30:32Z
exit: 0 · wall: 33s
```

## Transcript

## Session

```
model: claude-opus-5-5 · claude 2.1.289 · permissionMode: default
cwd: ~/Desktop/Work Folder/Agentic Course/2026-quitcode-05-mcp-hw
mcp_servers: vercel (connected)
MCP tools offered (131): mcp__vercel__aggregate_events, mcp__vercel__aggregate_pageviews, mcp__vercel__artifact_query, mcp__vercel__count_events, mcp__vercel__count_pageviews, mcp__vercel__generate_route, mcp__vercel__get_active_attack_status, mcp__vercel__get_agent_run, mcp__vercel__get_agent_run_trace, mcp__vercel__get_ai_gateway_virtual_model_config, mcp__vercel__get_ai_gateway_virtual_model_config_by_slug, mcp__vercel__get_auth_token, mcp__vercel__get_auth_user, mcp__vercel__get_bulk_availability, mcp__vercel__get_bulk_price, mcp__vercel__get_bypass_ip, mcp__vercel__get_check, mcp__vercel__get_configuration, mcp__vercel__get_connector, mcp__vercel__get_connector_project_connection, mcp__vercel__get_contact_info_schema, mcp__vercel__get_custom_environment, mcp__vercel__get_deployment, mcp__vercel__get_deployment_check_run, mcp__vercel__get_deployment_file_contents, mcp__vercel__get_domain_availability, mcp__vercel__get_domain_contact_verification, mcp__vercel__get_domain_order, mcp__vercel__get_domain_price, mcp__vercel__get_domains_records_by_record_id, mcp__vercel__get_drain, mcp__vercel__get_edge_config_backup, mcp__vercel__get_edge_config_token, mcp__vercel__get_firewall_config, mcp__vercel__get_flag, mcp__vercel__get_flag_segment, mcp__vercel__get_flag_settings, mcp__vercel__get_git_deployment_context, mcp__vercel__get_kms_issuer, mcp__vercel__get_microfrontends_config, mcp__vercel__get_microfrontends_config_for_project, mcp__vercel__get_named_sandbox, mcp__vercel__get_observability_schema, mcp__vercel__get_order, mcp__vercel__get_project, mcp__vercel__get_project_check, mcp__vercel__get_project_trace, mcp__vercel__get_purchase_quote, mcp__vercel__get_rolling_release, mcp__vercel__get_rolling_release_billing_status, mcp__vercel__get_rolling_release_config, mcp__vercel__get_runtime_errors, mcp__vercel__get_runtime_logs, mcp__vercel__get_session, mcp__vercel__get_session_command, mcp__vercel__get_session_command_logs, mcp__vercel__get_session_snapshot, mcp__vercel__get_storage_stores_by_id, mcp__vercel__get_team, mcp__vercel__get_team_access_request, mcp__vercel__get_tld, mcp__vercel__get_tld_price, mcp__vercel__get_toolbar_thread, mcp__vercel__get_vercel_ci_invocation, mcp__vercel__get_vercel_ci_invocation_logs, mcp__vercel__get_vercel_ci_invocation_tree, mcp__vercel__get_vercel_ci_job_definition, mcp__vercel__get_vercel_ci_job_run, mcp__vercel__get_vercel_ci_job_run_logs, mcp__vercel__get_vercel_ci_task_logs, mcp__vercel__get_vercel_ci_task_run_logs, mcp__vercel__get_webhook, mcp__vercel__list_access_group_members, mcp__vercel__list_access_group_projects, mcp__vercel__list_agent_run_projects, mcp__vercel__list_agent_runs, mcp__vercel__list_aliases, mcp__vercel__list_billing_charges, mcp__vercel__list_bulk_redirect_versions, mcp__vercel__list_bulk_redirects, mcp__vercel__list_certs, mcp__vercel__list_check_runs, mcp__vercel__list_connector_project_connections, mcp__vercel__list_connectors, mcp__vercel__list_contract_commitments, mcp__vercel__list_deployment_aliases, mcp__vercel__list_deployment_events, mcp__vercel__list_deployment_files, mcp__vercel__list_deployments, mcp__vercel__list_domains, mcp__vercel__list_drains, mcp__vercel__list_event_types, mcp__vercel__list_feature_flag_sdk_keys, mcp__vercel__list_flags, mcp__vercel__list_flags_v2, mcp__vercel__list_integration_billing_plans, mcp__vercel__list_integration_configuration_products, mcp__vercel__list_integration_configurations, mcp__vercel__list_microfrontends_group_projects, mcp__vercel__list_named_sandboxes, mcp__vercel__list_private_link_endpoints, mcp__vercel__list_project_connector_connections, mcp__vercel__list_project_custom_environments, mcp__vercel__list_project_domains, mcp__vercel__list_project_route_versions, mcp__vercel__list_project_routes, mcp__vercel__list_projects, mcp__vercel__list_promote_aliases, mcp__vercel__list_session_commands, mcp__vercel__list_session_snapshots, mcp__vercel__list_sessions, mcp__vercel__list_supported_tlds, mcp__vercel__list_team_members, mcp__vercel__list_teams, mcp__vercel__list_toolbar_threads, mcp__vercel__list_user_events, mcp__vercel__list_vercel_ci_invocation_attempts, mcp__vercel__list_vercel_ci_invocations, mcp__vercel__list_vercel_ci_job_definitions, mcp__vercel__list_vercel_ci_job_runs, mcp__vercel__list_vercel_ci_task_definitions, mcp__vercel__list_vercel_ci_task_runs, mcp__vercel__read_access_group, mcp__vercel__read_access_group_project, mcp__vercel__read_network, mcp__vercel__read_private_link_endpoint, mcp__vercel__read_session_file, mcp__vercel__search_domains, mcp__vercel__search_repo, mcp__vercel__search_vercel_documentation, mcp__vercel__status
built-in tools offered: Task, Artifact, ArtifactComments, ArtifactData, Bash, CronCreate, CronDelete, CronList, DesignSync, Edit, EnterWorktree, ExitWorktree, ListAgents, Monitor, NotebookEdit, PushNotification, Read, RemoteTrigger, ReportFindings, ScheduleWakeup, SendMessage, ShareOnboardingGuide, Skill, TaskStop, ToolSearch, WebFetch, WebSearch, Workflow, Write
```

### agent

# Інструменти сервера `vercel`

Зараз мені доступно **131 інструмент** сервера `vercel`. Я нічого не викликав і не завантажував їхніх схем, тому бачу лише назви, без описів і параметрів. Усі назви мають префікс `mcp__vercel__`.

**Агрегація й підрахунок (5):**
`aggregate_events`, `aggregate_pageviews`, `count_events`, `count_pageviews`, `artifact_query`

**`get_*` (66):**
`get_active_attack_status`, `get_agent_run`, `get_agent_run_trace`, `get_ai_gateway_virtual_model_config`, `get_ai_gateway_virtual_model_config_by_slug`, `get_auth_token`, `get_auth_user`, `get_bulk_availability`, `get_bulk_price`, `get_bypass_ip`, `get_check`, `get_configuration`, `get_connector`, `get_connector_project_connection`, `get_contact_info_schema`, `get_custom_environment`, `get_deployment`, `get_deployment_check_run`, `get_deployment_file_contents`, `get_domain_availability`, `get_domain_contact_verification`, `get_domain_order`, `get_domain_price`, `get_domains_records_by_record_id`, `get_drain`, `get_edge_config_backup`, `get_edge_config_token`, `get_firewall_config`, `get_flag`, `get_flag_segment`, `get_flag_settings`, `get_git_deployment_context`, `get_kms_issuer`, `get_microfrontends_config`, `get_microfrontends_config_for_project`, `get_named_sandbox`, `get_observability_schema`, `get_order`, `get_project`, `get_project_check`, `get_project_trace`, `get_purchase_quote`, `get_rolling_release`, `get_rolling_release_billing_status`, `get_rolling_release_config`, `get_runtime_errors`, `get_runtime_logs`, `get_session`, `get_session_command`, `get_session_command_logs`, `get_session_snapshot`, `get_storage_stores_by_id`, `get_team`, `get_team_access_request`, `get_tld`, `get_tld_price`, `get_toolbar_thread`, `get_vercel_ci_invocation`, `get_vercel_ci_invocation_logs`, `get_vercel_ci_invocation_tree`, `get_vercel_ci_job_definition`, `get_vercel_ci_job_run`, `get_vercel_ci_job_run_logs`, `get_vercel_ci_task_logs`, `get_vercel_ci_task_run_logs`, `get_webhook`

**`list_*` (50):**
`list_access_group_members`, `list_access_group_projects`, `list_agent_run_projects`, `list_agent_runs`, `list_aliases`, `list_billing_charges`, `list_bulk_redirect_versions`, `list_bulk_redirects`, `list_certs`, `list_check_runs`, `list_connector_project_connections`, `list_connectors`, `list_contract_commitments`, `list_deployment_aliases`, `list_deployment_events`, `list_deployment_files`, `list_deployments`, `list_domains`, `list_drains`, `list_event_types`, `list_feature_flag_sdk_keys`, `list_flags`, `list_flags_v2`, `list_integration_billing_plans`, `list_integration_configuration_products`, `list_integration_configurations`, `list_microfrontends_group_projects`, `list_named_sandboxes`, `list_private_link_endpoints`, `list_project_connector_connections`, `list_project_custom_environments`, `list_project_domains`, `list_project_route_versions`, `list_project_routes`, `list_projects`, `list_promote_aliases`, `list_session_commands`, `list_session_snapshots`, `list_sessions`, `list_supported_tlds`, `list_team_members`, `list_teams`, `list_toolbar_threads`, `list_user_events`, `list_vercel_ci_invocation_attempts`, `list_vercel_ci_invocations`, `list_vercel_ci_job_definitions`, `list_vercel_ci_job_runs`, `list_vercel_ci_task_definitions`, `list_vercel_ci_task_runs`

**`read_*` (5):**
`read_access_group`, `read_access_group_project`, `read_network`, `read_private_link_endpoint`, `read_session_file`

**Пошук та інше (5):**
`search_domains`, `search_repo`, `search_vercel_documentation`, `generate_route`, `status`

## Що варто знати

- **Явних інструментів запису немає.** Серед назв немає `create_*`, `update_*`, `delete_*`, `buy_*` чи `deploy_to_vercel`. Отже, задеплоїти або щось купити через цей набір не вийде. Хоча `get_purchase_quote` є, інструментів для самої купівлі немає.
- **`generate_route`: що він робить, з назви не видно.** Перш ніж його використовувати, варто подивитися схему.
- **Ці інструменти можуть повертати секрети:** `get_auth_token`, `get_edge_config_token`, `list_feature_flag_sdk_keys`. Без прямого запиту я їх не викликатиму.
- **Результати `list_teams` і `list_projects` у файли не записуються** — так вимагає правило в `AGENTS.md`.

---

## Result

```
tool calls: 0 · turns: 1 · duration: 30 s · cost: $0.17
permission denials: none
```

