-- Force creation of admin user and hangar database
-- This script runs only on fresh volume initialization

CREATE USER admin WITH PASSWORD 'admin123' SUPERUSER;
CREATE DATABASE hangar WITH OWNER admin;
GRANT ALL PRIVILEGES ON DATABASE hangar TO admin;
