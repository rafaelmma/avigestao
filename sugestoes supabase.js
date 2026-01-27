[
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.applications\\` has a foreign key \\`applications_bird_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "applications",
      "type": "table",
      "schema": "public",
      "fkey_name": "applications_bird_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_applications_applications_bird_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.applications\\` has a foreign key \\`applications_medication_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "applications",
      "type": "table",
      "schema": "public",
      "fkey_name": "applications_medication_id_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_applications_applications_medication_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.applications\\` has a foreign key \\`applications_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "applications",
      "type": "table",
      "schema": "public",
      "fkey_name": "applications_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_applications_applications_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.birds\\` has a foreign key \\`birds_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "birds",
      "type": "table",
      "schema": "public",
      "fkey_name": "birds_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_birds_birds_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.clutches\\` has a foreign key \\`clutches_pair_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "clutches",
      "type": "table",
      "schema": "public",
      "fkey_name": "clutches_pair_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_clutches_clutches_pair_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.clutches\\` has a foreign key \\`clutches_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "clutches",
      "type": "table",
      "schema": "public",
      "fkey_name": "clutches_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_clutches_clutches_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.movements\\` has a foreign key \\`movements_bird_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "movements",
      "type": "table",
      "schema": "public",
      "fkey_name": "movements_bird_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_movements_movements_bird_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.movements\\` has a foreign key \\`movements_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "movements",
      "type": "table",
      "schema": "public",
      "fkey_name": "movements_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_movements_movements_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.pairs\\` has a foreign key \\`pairs_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "pairs",
      "type": "table",
      "schema": "public",
      "fkey_name": "pairs_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_pairs_pairs_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.transactions\\` has a foreign key \\`transactions_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "transactions",
      "type": "table",
      "schema": "public",
      "fkey_name": "transactions_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_transactions_transactions_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.treatments\\` has a foreign key \\`treatments_bird_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "treatments",
      "type": "table",
      "schema": "public",
      "fkey_name": "treatments_bird_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_treatments_treatments_bird_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.treatments\\` has a foreign key \\`treatments_medication_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "treatments",
      "type": "table",
      "schema": "public",
      "fkey_name": "treatments_medication_id_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_treatments_treatments_medication_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.treatments\\` has a foreign key \\`treatments_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "treatments",
      "type": "table",
      "schema": "public",
      "fkey_name": "treatments_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_treatments_treatments_user_id_fkey"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_billing_metrics_user_id\\` on table \\`public.billing_metrics\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "billing_metrics",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_billing_metrics_idx_billing_metrics_user_id"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_billing_metrics_created_at\\` on table \\`public.billing_metrics\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "billing_metrics",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_billing_metrics_idx_billing_metrics_created_at"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_users_role\\` on table \\`public.users\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "users",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_users_idx_users_role"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_subscriptions_stripe_id\\` on table \\`public.subscriptions\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "subscriptions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_subscriptions_idx_subscriptions_stripe_id"
  }
]