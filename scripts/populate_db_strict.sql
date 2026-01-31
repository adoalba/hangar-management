-- Clear existing data
TRUNCATE TABLE parts;

-- Insert Test Data covering all phases
INSERT INTO parts (id, part_name, pn, sn, location, tag_color, brand, model, tt_tat, tso, trem, registration_date) VALUES
('uuid-1', 'Main Rotor Blade', 'MRB-001', 'SN-1001', 'Hangar A', 'YELLOW', 'Bell', '412', '1000', '500', '2000', NOW()),
('uuid-2', 'Tail Rotor Hub', 'TRH-202', 'SN-2002', 'Hangar B', 'GREEN', 'Airbus', 'H145', '500', '100', '400', NOW()),
('uuid-3', 'Landing Gear Strut', 'LGS-303', 'SN-3003', 'Warehouse', 'WHITE', 'Leonardo', 'AW139', '2000', '1500', '500', NOW()),
('uuid-4', 'Avionics Display', 'AVD-404', 'SN-4004', 'Scrap Yard', 'RED', 'Garmin', 'G1000', '50', '50', '0', NOW());

-- Ensure user session exists (optional, but good for testing if we need to link user)
-- users table should already have admin from init_db.py
