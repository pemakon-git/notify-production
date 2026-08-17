-- CreateEnum
CREATE TYPE "role" AS ENUM ('super_admin', 'property_manager', 'sales_agent');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'invited');

-- CreateEnum
CREATE TYPE "language" AS ENUM ('en', 'th');

-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('condo', 'house', 'townhome', 'apartment');

-- CreateEnum
CREATE TYPE "property_status" AS ENUM ('draft', 'pending_review', 'available', 'rented');

-- CreateEnum
CREATE TYPE "furnished" AS ENUM ('fully', 'partial', 'unfurnished');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('image', 'video', 'floor_plan');

-- CreateEnum
CREATE TYPE "property_request_status" AS ENUM ('pending', 'needs_info', 'converted', 'rejected');

-- CreateEnum
CREATE TYPE "lead_source" AS ENUM ('public_web', 'walk_in', 'phone', 'referral');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('new', 'working', 'closed');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('upcoming', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('draft', 'active', 'ended');

-- CreateEnum
CREATE TYPE "doc_type" AS ENUM ('title_deed', 'id_card', 'house_registration', 'lease', 'receipt', 'power_of_attorney', 'property_photo', 'other');

-- CreateEnum
CREATE TYPE "doc_status" AS ENUM ('uploaded', 'verified', 'active', 'archived');

-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('property', 'property_request', 'owner', 'customer', 'lead', 'contract', 'appointment', 'company', 'user');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('line', 'email', 'in_app');

-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('lead', 'appointment', 'property', 'owner', 'contract', 'system');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('queued', 'delivered', 'read', 'failed');

-- CreateEnum
CREATE TYPE "community_category" AS ENUM ('looking_room', 'looking_condo', 'for_rent', 'looking_tenant', 'buy_sell');

-- CreateEnum
CREATE TYPE "community_status" AS ENUM ('pending', 'published', 'archived', 'rejected');

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "role" "role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "language" "language" NOT NULL DEFAULT 'en',
    "team_id" UUID,
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "supabase_sid" TEXT,
    "device" VARCHAR(60),
    "browser" VARCHAR(60),
    "ip" VARCHAR(60),
    "last_seen_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "id_card_no" TEXT,
    "id_card_last4" VARCHAR(4),
    "address" TEXT,
    "note" TEXT,
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "owner_id" UUID NOT NULL,
    "assigned_to" UUID,
    "sourced_by" UUID,
    "property_type" "property_type" NOT NULL,
    "status" "property_status" NOT NULL DEFAULT 'draft',
    "title_th" VARCHAR(200) NOT NULL,
    "title_en" VARCHAR(200),
    "description_th" TEXT,
    "description_en" TEXT,
    "address" TEXT,
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "subdistrict" VARCHAR(100),
    "project_name" VARCHAR(150),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "deposit_months" SMALLINT,
    "bedrooms" SMALLINT,
    "bathrooms" SMALLINT,
    "area_sqm" DECIMAL(8,2),
    "floor" VARCHAR(20),
    "furnished" "furnished",
    "amenities" JSONB,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "content_dirty" BOOLEAN NOT NULL DEFAULT false,
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "media_type" "media_type" NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_status_history" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "from_status" "property_status",
    "to_status" "property_status" NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_requests" (
    "id" UUID NOT NULL,
    "status" "property_request_status" NOT NULL DEFAULT 'pending',
    "property_type" "property_type" NOT NULL,
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "project_name" VARCHAR(150),
    "expected_rent" DECIMAL(12,2),
    "bedrooms" SMALLINT,
    "bathrooms" SMALLINT,
    "area_sqm" DECIMAL(8,2),
    "note" TEXT,
    "owner_name" VARCHAR(150) NOT NULL,
    "owner_phone" VARCHAR(20) NOT NULL,
    "owner_consent" BOOLEAN NOT NULL DEFAULT false,
    "review_note" TEXT,
    "submitted_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "converted_to_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "property_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "id_card_no" TEXT,
    "id_card_last4" VARCHAR(4),
    "address" TEXT,
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150),
    "source" "lead_source" NOT NULL DEFAULT 'public_web',
    "status" "lead_status" NOT NULL DEFAULT 'new',
    "assigned_to" UUID,
    "customer_id" UUID,
    "lost_reason" TEXT,
    "message" TEXT,
    "preferred_view_at" TIMESTAMPTZ(6),
    "consent_at" TIMESTAMPTZ(6),
    "consent_version" VARCHAR(20),
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_interests" (
    "lead_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_interests_pkey" PRIMARY KEY ("lead_id","property_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "lead_id" UUID,
    "property_id" UUID,
    "agent_id" UUID NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'upcoming',
    "title" TEXT,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_min" SMALLINT NOT NULL DEFAULT 30,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "location" TEXT,
    "note" TEXT,
    "cancel_reason" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "property_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'draft',
    "start_date" DATE,
    "end_date" DATE,
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2),
    "commission_amount" DECIMAL(12,2),
    "signed_at" TIMESTAMPTZ(6),
    "signed_by" UUID,
    "receipt_issued_at" TIMESTAMPTZ(6),
    "renewed_from_id" UUID,
    "terminated_reason" TEXT,
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_terms" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "document_type" "doc_type" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "doc_status" NOT NULL DEFAULT 'uploaded',
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "version_no" SMALLINT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_links" (
    "document_id" UUID NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("document_id","entity_type","entity_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "channel" "notification_channel" NOT NULL DEFAULT 'in_app',
    "status" "notification_status" NOT NULL DEFAULT 'queued',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "title_key" VARCHAR(120),
    "body_key" VARCHAR(120),
    "params" JSONB,
    "entity_type" "entity_type",
    "entity_id" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "fail_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id","category","channel")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_role" "role",
    "action" VARCHAR(80) NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" VARCHAR(60),
    "old_value" JSONB,
    "new_value" JSONB,
    "ip" VARCHAR(60),
    "device" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "actor_id" UUID,
    "summary" TEXT NOT NULL,
    "i18n_key" VARCHAR(120),
    "i18n_params" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" UUID NOT NULL,
    "category" "community_category" NOT NULL,
    "status" "community_status" NOT NULL DEFAULT 'pending',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "contact" VARCHAR(150),
    "author_id" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "master_data" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "label_th" VARCHAR(150) NOT NULL,
    "label_en" VARCHAR(150) NOT NULL,
    "group" VARCHAR(60),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_sequences" (
    "scope" VARCHAR(10) NOT NULL,
    "year" SMALLINT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("scope","year")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_branch_id_idx" ON "profiles"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_supabase_sid_key" ON "user_sessions"("supabase_sid");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "owners_phone_idx" ON "owners"("phone");

-- CreateIndex
CREATE INDEX "owners_branch_id_idx" ON "owners"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_code_key" ON "properties"("code");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_property_type_idx" ON "properties"("property_type");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "properties_assigned_to_idx" ON "properties"("assigned_to");

-- CreateIndex
CREATE INDEX "properties_branch_id_idx" ON "properties"("branch_id");

-- CreateIndex
CREATE INDEX "properties_province_district_idx" ON "properties"("province", "district");

-- CreateIndex
CREATE INDEX "properties_monthly_rent_idx" ON "properties"("monthly_rent");

-- CreateIndex
CREATE INDEX "property_media_property_id_sort_order_idx" ON "property_media"("property_id", "sort_order");

-- CreateIndex
CREATE INDEX "property_status_history_property_id_created_at_idx" ON "property_status_history"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "property_requests_status_created_at_idx" ON "property_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "property_requests_submitted_by_idx" ON "property_requests"("submitted_by");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_code_key" ON "leads"("code");

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");

-- CreateIndex
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_code_key" ON "appointments"("code");

-- CreateIndex
CREATE INDEX "appointments_agent_id_scheduled_at_idx" ON "appointments"("agent_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_status_scheduled_at_idx" ON "appointments"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_code_key" ON "contracts"("code");

-- CreateIndex
CREATE INDEX "contracts_status_end_date_idx" ON "contracts"("status", "end_date");

-- CreateIndex
CREATE INDEX "contracts_property_id_idx" ON "contracts"("property_id");

-- CreateIndex
CREATE INDEX "contracts_customer_id_idx" ON "contracts"("customer_id");

-- CreateIndex
CREATE INDEX "contract_terms_contract_id_sort_order_idx" ON "contract_terms"("contract_id", "sort_order");

-- CreateIndex
CREATE INDEX "documents_document_type_status_idx" ON "documents"("document_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_no_key" ON "document_versions"("document_id", "version_no");

-- CreateIndex
CREATE INDEX "document_links_entity_type_entity_id_idx" ON "document_links"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_created_at_idx" ON "notifications"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_status_channel_idx" ON "notifications"("status", "channel");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_created_at_idx" ON "activity_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "community_posts_status_created_at_idx" ON "community_posts"("status", "created_at");

-- CreateIndex
CREATE INDEX "master_data_kind_is_active_sort_order_idx" ON "master_data"("kind", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "master_data_kind_code_key" ON "master_data"("kind", "code");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_sourced_by_fkey" FOREIGN KEY ("sourced_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_status_history" ADD CONSTRAINT "property_status_history_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_status_history" ADD CONSTRAINT "property_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_converted_to_id_fkey" FOREIGN KEY ("converted_to_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interests" ADD CONSTRAINT "lead_interests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interests" ADD CONSTRAINT "lead_interests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_renewed_from_id_fkey" FOREIGN KEY ("renewed_from_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_terms" ADD CONSTRAINT "contract_terms_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
