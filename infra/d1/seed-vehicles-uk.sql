-- =========================================
-- PartHub UK - Vehicle makes / models / years
-- Schema-safe version
-- =========================================

-- -------------------------
-- MAKES
-- -------------------------
insert or ignore into vehicle_makes (slug, name, logo_url) values
('audi', 'Audi', ''),
('bmw', 'BMW', ''),
('citroen', 'Citroën', ''),
('cupra', 'Cupra', ''),
('dacia', 'Dacia', ''),
('fiat', 'Fiat', ''),
('ford', 'Ford', ''),
('honda', 'Honda', ''),
('hyundai', 'Hyundai', ''),
('jaguar', 'Jaguar', ''),
('jeep', 'Jeep', ''),
('kia', 'Kia', ''),
('land-rover', 'Land Rover', ''),
('lexus', 'Lexus', ''),
('mazda', 'Mazda', ''),
('mercedes-benz', 'Mercedes-Benz', ''),
('mg', 'MG', ''),
('mini', 'Mini', ''),
('mitsubishi', 'Mitsubishi', ''),
('nissan', 'Nissan', ''),
('peugeot', 'Peugeot', ''),
('renault', 'Renault', ''),
('seat', 'SEAT', ''),
('skoda', 'Škoda', ''),
('suzuki', 'Suzuki', ''),
('tesla', 'Tesla', ''),
('toyota', 'Toyota', ''),
('vauxhall', 'Vauxhall', ''),
('volkswagen', 'Volkswagen', ''),
('volvo', 'Volvo', '');

-- -------------------------
-- MODELS
-- -------------------------

-- Audi
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'a1', 'A1' from vehicle_makes where slug='audi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'a3', 'A3' from vehicle_makes where slug='audi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'a4', 'A4' from vehicle_makes where slug='audi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'a6', 'A6' from vehicle_makes where slug='audi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'q2', 'Q2' from vehicle_makes where slug='audi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'q3', 'Q3' from vehicle_makes where slug='audi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'q5', 'Q5' from vehicle_makes where slug='audi';

-- BMW
insert or ignore into vehicle_models (make_id, slug, name)
select id, '1-series', '1 Series' from vehicle_makes where slug='bmw';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '3-series', '3 Series' from vehicle_makes where slug='bmw';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '5-series', '5 Series' from vehicle_makes where slug='bmw';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'x1', 'X1' from vehicle_makes where slug='bmw';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'x3', 'X3' from vehicle_makes where slug='bmw';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'x5', 'X5' from vehicle_makes where slug='bmw';

-- Citroen
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'c1', 'C1' from vehicle_makes where slug='citroen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'c3', 'C3' from vehicle_makes where slug='citroen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'c4', 'C4' from vehicle_makes where slug='citroen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'berlingo', 'Berlingo' from vehicle_makes where slug='citroen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'dispatch', 'Dispatch' from vehicle_makes where slug='citroen';

-- Cupra
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ateca', 'Ateca' from vehicle_makes where slug='cupra';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'formentor', 'Formentor' from vehicle_makes where slug='cupra';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'leon', 'Leon' from vehicle_makes where slug='cupra';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'born', 'Born' from vehicle_makes where slug='cupra';

-- Dacia
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'duster', 'Duster' from vehicle_makes where slug='dacia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'sandero', 'Sandero' from vehicle_makes where slug='dacia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'jogger', 'Jogger' from vehicle_makes where slug='dacia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'logan', 'Logan' from vehicle_makes where slug='dacia';

-- Fiat
insert or ignore into vehicle_models (make_id, slug, name)
select id, '500', '500' from vehicle_makes where slug='fiat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '500x', '500X' from vehicle_makes where slug='fiat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'panda', 'Panda' from vehicle_makes where slug='fiat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'tipo', 'Tipo' from vehicle_makes where slug='fiat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ducato', 'Ducato' from vehicle_makes where slug='fiat';

-- Ford
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'fiesta', 'Fiesta' from vehicle_makes where slug='ford';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'focus', 'Focus' from vehicle_makes where slug='ford';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mondeo', 'Mondeo' from vehicle_makes where slug='ford';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'kuga', 'Kuga' from vehicle_makes where slug='ford';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'puma', 'Puma' from vehicle_makes where slug='ford';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'transit', 'Transit' from vehicle_makes where slug='ford';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ranger', 'Ranger' from vehicle_makes where slug='ford';

-- Honda
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'civic', 'Civic' from vehicle_makes where slug='honda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'jazz', 'Jazz' from vehicle_makes where slug='honda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'cr-v', 'CR-V' from vehicle_makes where slug='honda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'hr-v', 'HR-V' from vehicle_makes where slug='honda';

-- Hyundai
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'i10', 'i10' from vehicle_makes where slug='hyundai';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'i20', 'i20' from vehicle_makes where slug='hyundai';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'i30', 'i30' from vehicle_makes where slug='hyundai';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'tucson', 'Tucson' from vehicle_makes where slug='hyundai';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'kona', 'Kona' from vehicle_makes where slug='hyundai';

-- Jaguar
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'xe', 'XE' from vehicle_makes where slug='jaguar';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'xf', 'XF' from vehicle_makes where slug='jaguar';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'f-pace', 'F-PACE' from vehicle_makes where slug='jaguar';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'e-pace', 'E-PACE' from vehicle_makes where slug='jaguar';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'i-pace', 'I-PACE' from vehicle_makes where slug='jaguar';

-- Jeep
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'renegade', 'Renegade' from vehicle_makes where slug='jeep';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'compass', 'Compass' from vehicle_makes where slug='jeep';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'cherokee', 'Cherokee' from vehicle_makes where slug='jeep';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'grand-cherokee', 'Grand Cherokee' from vehicle_makes where slug='jeep';

-- Kia
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'picanto', 'Picanto' from vehicle_makes where slug='kia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'rio', 'Rio' from vehicle_makes where slug='kia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ceed', 'Ceed' from vehicle_makes where slug='kia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'sportage', 'Sportage' from vehicle_makes where slug='kia';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'niro', 'Niro' from vehicle_makes where slug='kia';

-- Land Rover
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'range-rover-evoque', 'Range Rover Evoque' from vehicle_makes where slug='land-rover';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'range-rover-sport', 'Range Rover Sport' from vehicle_makes where slug='land-rover';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'discovery-sport', 'Discovery Sport' from vehicle_makes where slug='land-rover';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'defender', 'Defender' from vehicle_makes where slug='land-rover';

-- Lexus
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ct', 'CT' from vehicle_makes where slug='lexus';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'is', 'IS' from vehicle_makes where slug='lexus';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'nx', 'NX' from vehicle_makes where slug='lexus';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'rx', 'RX' from vehicle_makes where slug='lexus';

-- Mazda
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mazda2', 'Mazda2' from vehicle_makes where slug='mazda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mazda3', 'Mazda3' from vehicle_makes where slug='mazda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mazda6', 'Mazda6' from vehicle_makes where slug='mazda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'cx-3', 'CX-3' from vehicle_makes where slug='mazda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'cx-5', 'CX-5' from vehicle_makes where slug='mazda';

-- Mercedes-Benz
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'a-class', 'A-Class' from vehicle_makes where slug='mercedes-benz';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'c-class', 'C-Class' from vehicle_makes where slug='mercedes-benz';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'e-class', 'E-Class' from vehicle_makes where slug='mercedes-benz';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'gla', 'GLA' from vehicle_makes where slug='mercedes-benz';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'glc', 'GLC' from vehicle_makes where slug='mercedes-benz';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'sprinter', 'Sprinter' from vehicle_makes where slug='mercedes-benz';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'vito', 'Vito' from vehicle_makes where slug='mercedes-benz';

-- MG
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mg3', 'MG3' from vehicle_makes where slug='mg';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mg4', 'MG4' from vehicle_makes where slug='mg';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'zs', 'ZS' from vehicle_makes where slug='mg';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'hs', 'HS' from vehicle_makes where slug='mg';

-- Mini
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'hatch', 'Hatch' from vehicle_makes where slug='mini';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'clubman', 'Clubman' from vehicle_makes where slug='mini';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'countryman', 'Countryman' from vehicle_makes where slug='mini';

-- Mitsubishi
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'asx', 'ASX' from vehicle_makes where slug='mitsubishi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'l200', 'L200' from vehicle_makes where slug='mitsubishi';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'outlander', 'Outlander' from vehicle_makes where slug='mitsubishi';

-- Nissan
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'juke', 'Juke' from vehicle_makes where slug='nissan';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'micra', 'Micra' from vehicle_makes where slug='nissan';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'qashqai', 'Qashqai' from vehicle_makes where slug='nissan';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'x-trail', 'X-Trail' from vehicle_makes where slug='nissan';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'leaf', 'Leaf' from vehicle_makes where slug='nissan';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'navara', 'Navara' from vehicle_makes where slug='nissan';

-- Peugeot
insert or ignore into vehicle_models (make_id, slug, name)
select id, '108', '108' from vehicle_makes where slug='peugeot';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '208', '208' from vehicle_makes where slug='peugeot';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '308', '308' from vehicle_makes where slug='peugeot';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '2008', '2008' from vehicle_makes where slug='peugeot';
insert or ignore into vehicle_models (make_id, slug, name)
select id, '3008', '3008' from vehicle_makes where slug='peugeot';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'partner', 'Partner' from vehicle_makes where slug='peugeot';

-- Renault
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'clio', 'Clio' from vehicle_makes where slug='renault';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'captur', 'Captur' from vehicle_makes where slug='renault';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'megane', 'Mégane' from vehicle_makes where slug='renault';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'kadjar', 'Kadjar' from vehicle_makes where slug='renault';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'trafic', 'Trafic' from vehicle_makes where slug='renault';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'kangoo', 'Kangoo' from vehicle_makes where slug='renault';

-- SEAT
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ibiza', 'Ibiza' from vehicle_makes where slug='seat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'leon', 'Leon' from vehicle_makes where slug='seat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'arona', 'Arona' from vehicle_makes where slug='seat';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ateca', 'Ateca' from vehicle_makes where slug='seat';

-- Skoda
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'fabia', 'Fabia' from vehicle_makes where slug='skoda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'octavia', 'Octavia' from vehicle_makes where slug='skoda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'superb', 'Superb' from vehicle_makes where slug='skoda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'karoq', 'Karoq' from vehicle_makes where slug='skoda';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'kodiaq', 'Kodiaq' from vehicle_makes where slug='skoda';

-- Suzuki
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'swift', 'Swift' from vehicle_makes where slug='suzuki';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'ignis', 'Ignis' from vehicle_makes where slug='suzuki';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'vitara', 'Vitara' from vehicle_makes where slug='suzuki';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 's-cross', 'S-Cross' from vehicle_makes where slug='suzuki';

-- Tesla
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'model-3', 'Model 3' from vehicle_makes where slug='tesla';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'model-s', 'Model S' from vehicle_makes where slug='tesla';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'model-x', 'Model X' from vehicle_makes where slug='tesla';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'model-y', 'Model Y' from vehicle_makes where slug='tesla';

-- Toyota
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'aygo', 'Aygo' from vehicle_makes where slug='toyota';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'yaris', 'Yaris' from vehicle_makes where slug='toyota';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'corolla', 'Corolla' from vehicle_makes where slug='toyota';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'c-hr', 'C-HR' from vehicle_makes where slug='toyota';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'rav4', 'RAV4' from vehicle_makes where slug='toyota';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'hilux', 'Hilux' from vehicle_makes where slug='toyota';

-- Vauxhall
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'corsa', 'Corsa' from vehicle_makes where slug='vauxhall';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'astra', 'Astra' from vehicle_makes where slug='vauxhall';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'insignia', 'Insignia' from vehicle_makes where slug='vauxhall';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'mokka', 'Mokka' from vehicle_makes where slug='vauxhall';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'vivaro', 'Vivaro' from vehicle_makes where slug='vauxhall';

-- Volkswagen
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'up', 'Up' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'polo', 'Polo' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'golf', 'Golf' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'passat', 'Passat' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'tiguan', 'Tiguan' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 't-roc', 'T-Roc' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'transporter', 'Transporter' from vehicle_makes where slug='volkswagen';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'caddy', 'Caddy' from vehicle_makes where slug='volkswagen';

-- Volvo
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'v40', 'V40' from vehicle_makes where slug='volvo';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'v60', 'V60' from vehicle_makes where slug='volvo';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'xc40', 'XC40' from vehicle_makes where slug='volvo';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'xc60', 'XC60' from vehicle_makes where slug='volvo';
insert or ignore into vehicle_models (make_id, slug, name)
select id, 'xc90', 'XC90' from vehicle_makes where slug='volvo';
