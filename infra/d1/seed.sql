-- ============================================================
-- PartHub Platform — Seed Data
-- ============================================================

-- Admin user (password: Admin123!)
INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES
('Admin', 'admin@parthub.site',
 'c4430a21a7b0b6bb374e23cdde875a8d462c4db68eed0e3e3a0bfb0cfb7c4e3b',
 'admin');

-- Vehicle Makes
INSERT OR IGNORE INTO vehicle_makes (slug, name) VALUES
('toyota','Toyota'), ('ford','Ford'), ('honda','Honda'),
('bmw','BMW'), ('mercedes','Mercedes-Benz'), ('chevrolet','Chevrolet'),
('nissan','Nissan'), ('volkswagen','Volkswagen'), ('audi','Audi'),
('hyundai','Hyundai'), ('kia','Kia'), ('mazda','Mazda'),
('subaru','Subaru'), ('jeep','Jeep'), ('dodge','Dodge');

-- Vehicle Models (Toyota)
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'camry', 'Camry' FROM vehicle_makes WHERE slug = 'toyota';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'corolla', 'Corolla' FROM vehicle_makes WHERE slug = 'toyota';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'rav4', 'RAV4' FROM vehicle_makes WHERE slug = 'toyota';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'tacoma', 'Tacoma' FROM vehicle_makes WHERE slug = 'toyota';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, '4runner', '4Runner' FROM vehicle_makes WHERE slug = 'toyota';

-- Vehicle Models (Ford)
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'f-150', 'F-150' FROM vehicle_makes WHERE slug = 'ford';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'mustang', 'Mustang' FROM vehicle_makes WHERE slug = 'ford';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'explorer', 'Explorer' FROM vehicle_makes WHERE slug = 'ford';
INSERT OR IGNORE INTO vehicle_models (make_id, slug, name)
SELECT id, 'escape', 'Escape' FROM vehicle_makes WHERE slug = 'ford';

-- Categories
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES
('engine-parts', 'Engine Parts', 1),
('brakes', 'Brakes & Rotors', 2),
('suspension', 'Suspension & Steering', 3),
('electrical', 'Electrical & Lighting', 4),
('filters', 'Filters & Fluids', 5),
('exhaust', 'Exhaust & Emissions', 6),
('transmission', 'Transmission & Drivetrain', 7),
('cooling', 'Cooling System', 8),
('body-exterior', 'Body & Exterior', 9),
('interior', 'Interior & Accessories', 10),
('tools', 'Tools & Equipment', 11),
('tires-wheels', 'Tires & Wheels', 12);

-- Brands
INSERT OR IGNORE INTO brands (slug, name) VALUES
('bosch','Bosch'), ('denso','Denso'), ('monroe','Monroe'),
('moog','Moog'), ('acdelco','ACDelco'), ('gates','Gates'),
('dorman','Dorman'), ('ngk','NGK'), ('fel-pro','Fel-Pro'),
('oe-solutions','OE Solutions'), ('duralast','Duralast'), ('motorcraft','Motorcraft');
