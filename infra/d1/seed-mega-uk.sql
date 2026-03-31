-- =========================================
-- PartHub UK - Mega seed for brands & categories
-- Inspired by large-scale auto parts catalog patterns
-- =========================================

-- -------------------------
-- BRANDS
-- -------------------------
insert or ignore into brands (slug, name, logo_url) values
('abarth', 'Abarth', ''),
('acura', 'Acura', ''),
('alfa-romeo', 'Alfa Romeo', ''),
('alpine', 'Alpine', ''),
('aston-martin', 'Aston Martin', ''),
('audi', 'Audi', ''),
('bentley', 'Bentley', ''),
('bmw', 'BMW', ''),
('byd', 'BYD', ''),
('cadillac', 'Cadillac', ''),
('chevrolet', 'Chevrolet', ''),
('chrysler', 'Chrysler', ''),
('citroen', 'Citroën', ''),
('cupra', 'Cupra', ''),
('dacia', 'Dacia', ''),
('daewoo', 'Daewoo', ''),
('daihatsu', 'Daihatsu', ''),
('ds', 'DS Automobiles', ''),
('ferrari', 'Ferrari', ''),
('fiat', 'Fiat', ''),
('fisker', 'Fisker', ''),
('ford', 'Ford', ''),
('genesis', 'Genesis', ''),
('gmc', 'GMC', ''),
('honda', 'Honda', ''),
('hyundai', 'Hyundai', ''),
('ineos', 'INEOS', ''),
('infiniti', 'Infiniti', ''),
('isuzu', 'Isuzu', ''),
('iveco', 'Iveco', ''),
('jaguar', 'Jaguar', ''),
('jeep', 'Jeep', ''),
('kia', 'Kia', ''),
('lada', 'Lada', ''),
('lamborghini', 'Lamborghini', ''),
('lancia', 'Lancia', ''),
('land-rover', 'Land Rover', ''),
('ldv', 'LDV', ''),
('lexus', 'Lexus', ''),
('lotus', 'Lotus', ''),
('lynk-co', 'Lynk & Co', ''),
('maserati', 'Maserati', ''),
('maxus', 'Maxus', ''),
('maybach', 'Maybach', ''),
('mazda', 'Mazda', ''),
('mclaren', 'McLaren', ''),
('mercedes-benz', 'Mercedes-Benz', ''),
('mg', 'MG', ''),
('mini', 'Mini', ''),
('mitsubishi', 'Mitsubishi', ''),
('nio', 'NIO', ''),
('nissan', 'Nissan', ''),
('opel', 'Opel', ''),
('peugeot', 'Peugeot', ''),
('polestar', 'Polestar', ''),
('porsche', 'Porsche', ''),
('proton', 'Proton', ''),
('renault', 'Renault', ''),
('rolls-royce', 'Rolls-Royce', ''),
('saab', 'Saab', ''),
('seat', 'SEAT', ''),
('skoda', 'Škoda', ''),
('smart', 'Smart', ''),
('ssangyong', 'SsangYong', ''),
('subaru', 'Subaru', ''),
('suzuki', 'Suzuki', ''),
('tesla', 'Tesla', ''),
('toyota', 'Toyota', ''),
('vauxhall', 'Vauxhall', ''),
('vinfast', 'VinFast', ''),
('volkswagen', 'Volkswagen', ''),
('volvo', 'Volvo', ''),
('xpeng', 'XPENG', '');

-- -------------------------
-- CATEGORIES
-- -------------------------
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order) values
(null, 'engine-parts', 'Engine Parts', 'engine', '', 1),
(null, 'filters-fluids', 'Filters & Fluids', 'filter', '', 2),
(null, 'brakes', 'Brakes & Rotors', 'disc', '', 3),
(null, 'suspension-steering', 'Suspension & Steering', 'steering-wheel', '', 4),
(null, 'transmission-drivetrain', 'Transmission & Drivetrain', 'settings', '', 5),
(null, 'cooling-system', 'Cooling System', 'snowflake', '', 6),
(null, 'electrical-lighting', 'Electrical & Lighting', 'zap', '', 7),
(null, 'body-exterior', 'Body & Exterior', 'car', '', 8),
(null, 'interior-accessories', 'Interior & Accessories', 'armchair', '', 9),
(null, 'exhaust-emissions', 'Exhaust & Emissions', 'wind', '', 10),
(null, 'wheels-tyres', 'Wheels & Tyres', 'circle', '', 11),
(null, 'heating-aircon', 'Heating & Air Conditioning', 'fan', '', 12),
(null, 'fuel-air-intake', 'Fuel & Air Intake', 'droplets', '', 13),
(null, 'ignition-starting', 'Ignition & Starting', 'power', '', 14),
(null, 'sensors-control-units', 'Sensors & Control Units', 'cpu', '', 15),
(null, 'locks-windows-mirrors', 'Locks, Windows & Mirrors', 'rectangle-horizontal', '', 16),
(null, 'safety-airbags-seatbelts', 'Safety, Airbags & Seatbelts', 'shield', '', 17),
(null, 'trim-seals-mountings', 'Trim, Seals & Mountings', 'layers', '', 18),
(null, 'towbars-roof-racks', 'Towbars & Roof Systems', 'package', '', 19),
(null, 'commercial-van-parts', 'Commercial & Van Parts', 'truck', '', 20),
(null, 'tools-garage', 'Tools & Garage Equipment', 'wrench', '', 21),
(null, 'universal-parts', 'Universal Parts', 'box', '', 22),
(null, 'performance-tuning', 'Performance & Tuning', 'gauge', '', 23),
(null, 'ev-hybrid-parts', 'EV & Hybrid Parts', 'battery', '', 24);

-- -------------------------
-- SUBCATEGORIES
-- -------------------------

-- Engine Parts
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'engine-block', 'Engine Block', 'box', '', 101 from categories where slug = 'engine-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'cylinder-head', 'Cylinder Head', 'box', '', 102 from categories where slug = 'engine-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'timing-components', 'Timing Components', 'clock', '', 103 from categories where slug = 'engine-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'gaskets-seals', 'Gaskets & Seals', 'circle', '', 104 from categories where slug = 'engine-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'turbo-supercharger', 'Turbo & Supercharger', 'wind', '', 105 from categories where slug = 'engine-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'engine-mounts', 'Engine Mounts', 'square', '', 106 from categories where slug = 'engine-parts';

-- Filters & Fluids
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'oil-filters', 'Oil Filters', 'filter', '', 201 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'air-filters', 'Air Filters', 'filter', '', 202 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'fuel-filters', 'Fuel Filters', 'filter', '', 203 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'cabin-filters', 'Cabin Filters', 'filter', '', 204 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'engine-oil', 'Engine Oil', 'droplets', '', 205 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'gear-oil', 'Gear Oil', 'droplets', '', 206 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'coolant-antifreeze', 'Coolant & Antifreeze', 'droplets', '', 207 from categories where slug = 'filters-fluids';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'brake-fluid', 'Brake Fluid', 'droplets', '', 208 from categories where slug = 'filters-fluids';

-- Brakes
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'brake-pads', 'Brake Pads', 'disc', '', 301 from categories where slug = 'brakes';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'brake-discs', 'Brake Discs', 'disc', '', 302 from categories where slug = 'brakes';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'brake-calipers', 'Brake Calipers', 'disc', '', 303 from categories where slug = 'brakes';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'abs-components', 'ABS Components', 'shield', '', 304 from categories where slug = 'brakes';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'handbrake-parts', 'Handbrake Parts', 'circle', '', 305 from categories where slug = 'brakes';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'brake-master-cylinder', 'Brake Master Cylinder', 'circle', '', 306 from categories where slug = 'brakes';

-- Suspension & Steering
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'control-arms', 'Control Arms', 'git-branch', '', 401 from categories where slug = 'suspension-steering';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'shock-absorbers', 'Shock Absorbers', 'move-vertical', '', 402 from categories where slug = 'suspension-steering';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'springs-coilovers', 'Springs & Coilovers', 'move-vertical', '', 403 from categories where slug = 'suspension-steering';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'steering-racks', 'Steering Racks', 'move-horizontal', '', 404 from categories where slug = 'suspension-steering';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'wheel-bearings-hubs', 'Wheel Bearings & Hubs', 'circle', '', 405 from categories where slug = 'suspension-steering';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'track-rod-ends', 'Track Rod Ends', 'move-horizontal', '', 406 from categories where slug = 'suspension-steering';

-- Transmission & Drivetrain
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'gearboxes', 'Gearboxes', 'settings', '', 501 from categories where slug = 'transmission-drivetrain';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'clutch-flywheel', 'Clutch & Flywheel', 'circle', '', 502 from categories where slug = 'transmission-drivetrain';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'driveshafts-cv-joints', 'Driveshafts & CV Joints', 'git-branch', '', 503 from categories where slug = 'transmission-drivetrain';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'differentials', 'Differentials', 'box', '', 504 from categories where slug = 'transmission-drivetrain';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'prop-shafts', 'Prop Shafts', 'minus', '', 505 from categories where slug = 'transmission-drivetrain';

-- Cooling System
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'radiators', 'Radiators', 'snowflake', '', 601 from categories where slug = 'cooling-system';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'water-pumps', 'Water Pumps', 'droplets', '', 602 from categories where slug = 'cooling-system';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'thermostats', 'Thermostats', 'thermometer', '', 603 from categories where slug = 'cooling-system';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'cooling-fans', 'Cooling Fans', 'fan', '', 604 from categories where slug = 'cooling-system';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'intercoolers', 'Intercoolers', 'snowflake', '', 605 from categories where slug = 'cooling-system';

-- Electrical & Lighting
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'alternators', 'Alternators', 'zap', '', 701 from categories where slug = 'electrical-lighting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'starter-motors', 'Starter Motors', 'power', '', 702 from categories where slug = 'electrical-lighting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'headlights', 'Headlights', 'sun', '', 703 from categories where slug = 'electrical-lighting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'rear-lights', 'Rear Lights', 'sun', '', 704 from categories where slug = 'electrical-lighting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'switches-relays', 'Switches & Relays', 'toggle-left', '', 705 from categories where slug = 'electrical-lighting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'wiring-harnesses', 'Wiring Harnesses', 'git-merge', '', 706 from categories where slug = 'electrical-lighting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'batteries', 'Batteries', 'battery', '', 707 from categories where slug = 'electrical-lighting';

-- Body & Exterior
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'bumpers-grilles', 'Bumpers & Grilles', 'car', '', 801 from categories where slug = 'body-exterior';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'doors-tailgates-bonnets', 'Doors, Tailgates & Bonnets', 'square', '', 802 from categories where slug = 'body-exterior';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'mirrors', 'Mirrors', 'square', '', 803 from categories where slug = 'body-exterior';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'wipers-washers', 'Wipers & Washers', 'droplets', '', 804 from categories where slug = 'body-exterior';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'fenders-arches', 'Fenders & Arches', 'circle', '', 805 from categories where slug = 'body-exterior';

-- Interior & Accessories
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'seats-trim', 'Seats & Trim', 'armchair', '', 901 from categories where slug = 'interior-accessories';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'dashboard-consoles', 'Dashboard & Consoles', 'layout', '', 902 from categories where slug = 'interior-accessories';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'infotainment-audio', 'Infotainment & Audio', 'music', '', 903 from categories where slug = 'interior-accessories';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'floor-mats-liners', 'Floor Mats & Liners', 'square', '', 904 from categories where slug = 'interior-accessories';

-- Exhaust & Emissions
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'exhaust-systems', 'Exhaust Systems', 'wind', '', 1001 from categories where slug = 'exhaust-emissions';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'catalytic-converters', 'Catalytic Converters', 'wind', '', 1002 from categories where slug = 'exhaust-emissions';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'dpf-egr', 'DPF & EGR', 'wind', '', 1003 from categories where slug = 'exhaust-emissions';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'lambda-sensors', 'Lambda Sensors', 'cpu', '', 1004 from categories where slug = 'exhaust-emissions';

-- Wheels & Tyres
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'alloy-wheels', 'Alloy Wheels', 'circle', '', 1101 from categories where slug = 'wheels-tyres';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'steel-wheels', 'Steel Wheels', 'circle', '', 1102 from categories where slug = 'wheels-tyres';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'summer-tyres', 'Summer Tyres', 'circle', '', 1103 from categories where slug = 'wheels-tyres';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'winter-tyres', 'Winter Tyres', 'circle', '', 1104 from categories where slug = 'wheels-tyres';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'wheel-caps-bolts', 'Wheel Caps & Bolts', 'circle', '', 1105 from categories where slug = 'wheels-tyres';

-- Heating & Air Conditioning
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'ac-compressors', 'AC Compressors', 'fan', '', 1201 from categories where slug = 'heating-aircon';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'heater-motors-blowers', 'Heater Motors & Blowers', 'fan', '', 1202 from categories where slug = 'heating-aircon';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'climate-control-panels', 'Climate Control Panels', 'sliders', '', 1203 from categories where slug = 'heating-aircon';

-- Fuel & Air Intake
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'fuel-pumps', 'Fuel Pumps', 'droplets', '', 1301 from categories where slug = 'fuel-air-intake';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'injectors-rail', 'Injectors & Fuel Rail', 'droplets', '', 1302 from categories where slug = 'fuel-air-intake';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'throttle-body-maf', 'Throttle Body & MAF', 'wind', '', 1303 from categories where slug = 'fuel-air-intake';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'intake-manifold', 'Intake Manifold', 'wind', '', 1304 from categories where slug = 'fuel-air-intake';

-- Ignition & Starting
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'spark-plugs-coils', 'Spark Plugs & Coils', 'zap', '', 1401 from categories where slug = 'ignition-starting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'glow-plugs', 'Glow Plugs', 'zap', '', 1402 from categories where slug = 'ignition-starting';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'ignition-locks-keys', 'Ignition Locks & Keys', 'key', '', 1403 from categories where slug = 'ignition-starting';

-- Sensors & Control Units
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'ecu-modules', 'ECU & Modules', 'cpu', '', 1501 from categories where slug = 'sensors-control-units';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'parking-sensors-cameras', 'Parking Sensors & Cameras', 'cpu', '', 1502 from categories where slug = 'sensors-control-units';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'abs-airflow-temp-sensors', 'ABS, Airflow & Temp Sensors', 'cpu', '', 1503 from categories where slug = 'sensors-control-units';

-- Locks, Windows & Mirrors
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'window-regulators', 'Window Regulators', 'square', '', 1601 from categories where slug = 'locks-windows-mirrors';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'door-locks-actuators', 'Door Locks & Actuators', 'lock', '', 1602 from categories where slug = 'locks-windows-mirrors';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'mirror-units-switches', 'Mirror Units & Switches', 'square', '', 1603 from categories where slug = 'locks-windows-mirrors';

-- Safety
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'airbags', 'Airbags', 'shield', '', 1701 from categories where slug = 'safety-airbags-seatbelts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'seatbelts-tensioners', 'Seatbelts & Tensioners', 'shield', '', 1702 from categories where slug = 'safety-airbags-seatbelts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'abs-esp-safety-modules', 'ABS / ESP Safety Modules', 'shield', '', 1703 from categories where slug = 'safety-airbags-seatbelts';

-- Trim, Seals & Mountings
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'clips-fasteners', 'Clips & Fasteners', 'layers', '', 1801 from categories where slug = 'trim-seals-mountings';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'rubber-seals', 'Rubber Seals', 'layers', '', 1802 from categories where slug = 'trim-seals-mountings';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'mounting-brackets', 'Mounting Brackets', 'layers', '', 1803 from categories where slug = 'trim-seals-mountings';

-- Towbars & Roof
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'towbars-electrics', 'Towbars & Electrics', 'package', '', 1901 from categories where slug = 'towbars-roof-racks';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'roof-racks-boxes', 'Roof Racks & Boxes', 'package', '', 1902 from categories where slug = 'towbars-roof-racks';

-- Commercial & Van Parts
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'van-body-parts', 'Van Body Parts', 'truck', '', 2001 from categories where slug = 'commercial-van-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'van-brakes-suspension', 'Van Brakes & Suspension', 'truck', '', 2002 from categories where slug = 'commercial-van-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'van-interior-load', 'Van Interior & Load Area', 'truck', '', 2003 from categories where slug = 'commercial-van-parts';

-- Tools & Garage
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'diagnostics-tools', 'Diagnostics Tools', 'wrench', '', 2101 from categories where slug = 'tools-garage';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'hand-tools', 'Hand Tools', 'wrench', '', 2102 from categories where slug = 'tools-garage';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'jacks-lifts', 'Jacks & Lifts', 'wrench', '', 2103 from categories where slug = 'tools-garage';

-- Universal Parts
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'universal-lighting', 'Universal Lighting', 'box', '', 2201 from categories where slug = 'universal-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'universal-fasteners', 'Universal Fasteners', 'box', '', 2202 from categories where slug = 'universal-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'universal-electrics', 'Universal Electrics', 'box', '', 2203 from categories where slug = 'universal-parts';

-- Performance & Tuning
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'performance-exhaust', 'Performance Exhaust', 'gauge', '', 2301 from categories where slug = 'performance-tuning';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'performance-intake', 'Performance Intake', 'gauge', '', 2302 from categories where slug = 'performance-tuning';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'lowering-kits', 'Lowering Kits', 'gauge', '', 2303 from categories where slug = 'performance-tuning';

-- EV & Hybrid
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'hv-battery-parts', 'HV Battery Parts', 'battery', '', 2401 from categories where slug = 'ev-hybrid-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'charging-parts', 'Charging Parts', 'battery', '', 2402 from categories where slug = 'ev-hybrid-parts';
insert or ignore into categories (parent_id, slug, name, icon, image_url, sort_order)
select id, 'hybrid-cooling-electrics', 'Hybrid Cooling & Electrics', 'battery', '', 2403 from categories where slug = 'ev-hybrid-parts';
