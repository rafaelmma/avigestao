// Arquivado: Warnings de Supabase movidos para `archived/supabase/warnings_supabase.js`
// Arquivo original removido do fluxo principal do projeto.
// Conteúdo preservado em archived/supabase.
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`authenticated\\` for action \\`UPDATE\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",\"deny all update\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_authenticated_UPDATE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`authenticator\\` for action \\`DELETE\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_authenticator_DELETE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`authenticator\\` for action \\`INSERT\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_authenticator_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`authenticator\\` for action \\`SELECT\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_authenticator_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`authenticator\\` for action \\`UPDATE\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_authenticator_UPDATE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`dashboard_user\\` for action \\`DELETE\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_dashboard_user_DELETE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`dashboard_user\\` for action \\`INSERT\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_dashboard_user_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`dashboard_user\\` for action \\`SELECT\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_dashboard_user_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.subscriptions\\` has multiple permissive policies for role \\`dashboard_user\\` for action \\`UPDATE\\`. Policies include \\`{\"Service role can manage subscriptions\",\"User subscription only\",service_role_manage_subscriptions,subscriptions_select_own,subscriptions_user_owns,\"user can read own subscription\",user_can_read_own_subscription}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_subscriptions_dashboard_user_UPDATE"
  }
]