#!/bin/bash

###############################################################################
# ZeroDB Migration Runner
#
# This script runs database migrations in a safe, idempotent manner.
# All migrations are designed to be run multiple times without errors.
#
# Usage:
#   ./run-migration.sh [migration_file]
#
# Examples:
#   ./run-migration.sh 001_initial_schema.sql
#   ./run-migration.sh                         # Runs all migrations in order
#
# Environment Variables Required:
#   DATABASE_URL - PostgreSQL connection string
#                  Example: postgresql://user:pass@host:port/dbname
#
# Author: ZDBGame Team
# Date: 2026-03-13
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check if DATABASE_URL is set
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL environment variable is not set."
        echo ""
        echo "Please set DATABASE_URL with your ZeroDB connection string:"
        echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
        echo ""
        echo "For local development:"
        echo "  export DATABASE_URL='postgresql://localhost:5432/zdbgame'"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

test_connection() {
    log_info "Testing database connection..."

    if psql "${DATABASE_URL}" -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Failed to connect to database"
        log_error "Please check your DATABASE_URL and ensure the database server is running"
        exit 1
    fi
}

create_migrations_table() {
    log_info "Setting up migrations tracking table..."

    psql "${DATABASE_URL}" <<EOF > /dev/null 2>&1
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_file TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum TEXT,
            execution_time_ms INTEGER
        );

        COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';
EOF

    log_success "Migrations tracking table ready"
}

calculate_checksum() {
    local file=$1
    if command -v md5sum &> /dev/null; then
        md5sum "$file" | awk '{print $1}'
    elif command -v md5 &> /dev/null; then
        md5 -q "$file"
    else
        log_warning "Checksum calculation not available (md5sum/md5 not found)"
        echo "no-checksum"
    fi
}

is_migration_applied() {
    local migration_file=$1
    local count=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '${migration_file}';" | xargs)

    [ "$count" -gt 0 ]
}

run_migration() {
    local migration_file=$1
    local migration_path="${SCRIPT_DIR}/${migration_file}"

    if [ ! -f "$migration_path" ]; then
        log_error "Migration file not found: ${migration_file}"
        return 1
    fi

    # Check if already applied
    if is_migration_applied "$migration_file"; then
        log_warning "Migration ${migration_file} already applied - skipping"
        return 0
    fi

    log_info "Running migration: ${migration_file}"

    # Calculate checksum
    local checksum=$(calculate_checksum "$migration_path")

    # Record start time
    local start_time=$(date +%s%3N)

    # Run the migration
    if psql "${DATABASE_URL}" -f "$migration_path" > /dev/null 2>&1; then
        # Calculate execution time
        local end_time=$(date +%s%3N)
        local execution_time=$((end_time - start_time))

        # Record migration
        psql "${DATABASE_URL}" -c "
            INSERT INTO schema_migrations (migration_file, checksum, execution_time_ms)
            VALUES ('${migration_file}', '${checksum}', ${execution_time});
        " > /dev/null 2>&1

        log_success "Migration ${migration_file} applied successfully (${execution_time}ms)"
        return 0
    else
        log_error "Migration ${migration_file} failed"
        return 1
    fi
}

show_migration_status() {
    log_info "Migration Status:"
    echo ""

    psql "${DATABASE_URL}" -c "
        SELECT
            migration_file,
            applied_at,
            execution_time_ms || 'ms' as execution_time
        FROM schema_migrations
        ORDER BY applied_at DESC;
    " 2>/dev/null || log_warning "No migrations applied yet"

    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    log_info "ZeroDB Migration Runner v1.0"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Test database connection
    test_connection

    # Create migrations tracking table
    create_migrations_table

    # Determine which migrations to run
    if [ $# -eq 0 ]; then
        # Run all migrations in order
        log_info "Running all migrations in order..."

        local migration_files=$(ls "${SCRIPT_DIR}"/*.sql 2>/dev/null | sort)

        if [ -z "$migration_files" ]; then
            log_warning "No migration files found in ${SCRIPT_DIR}"
            exit 0
        fi

        local failed=0
        for migration_path in $migration_files; do
            local migration_file=$(basename "$migration_path")

            if ! run_migration "$migration_file"; then
                failed=1
                break
            fi
        done

        if [ $failed -eq 0 ]; then
            log_success "All migrations completed successfully"
        else
            log_error "Migration process failed"
            exit 1
        fi
    else
        # Run specific migration
        local migration_file=$1

        if ! run_migration "$migration_file"; then
            exit 1
        fi
    fi

    # Show migration status
    show_migration_status

    log_success "Migration process complete!"
    echo ""
}

# Run main function
main "$@"
