#!/bin/bash
set -e
export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/bdb_planner_$TIMESTAMP.sql.gz"
mkdir -p "$BACKUP_DIR"
DB_USER=$(echo $DATABASE_URL | sed 's/mysql:\/\/\([^:]*\):.*/\1/')
DB_PASS=$(echo $DATABASE_URL | sed 's/mysql:\/\/[^:]*:\([^@]*\)@.*/\1/')
DB_HOST=$(echo $DATABASE_URL | sed 's/mysql:\/\/[^@]*@\([^:]*\):.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed 's/mysql:\/\/[^@]*@[^:]*:\([^\/]*\)\/.*/\1/')
DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" | gzip > "$BACKUP_FILE"
echo "✅ Backup saved to: $BACKUP_FILE"
ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
echo "🧹 Cleaned up old backups (keeping last 7)"
