-- Run once on the host PostgreSQL (port 5432):
--   sudo -u postgres psql -f scripts/setup-host-postgres.sql
CREATE USER nursing_user WITH PASSWORD 'nursing_pass';
CREATE DATABASE nursing_school OWNER nursing_user;
GRANT ALL PRIVILEGES ON DATABASE nursing_school TO nursing_user;
