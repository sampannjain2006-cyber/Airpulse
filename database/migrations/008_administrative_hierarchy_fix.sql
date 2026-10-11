-- ============================================================
-- AirPulse Database Schema Migration 008
-- Authoritative Indian Administrative Hierarchy Fix
-- Corrects state and city mappings for all monitoring stations
-- ============================================================

-- 1. Standard State Pollution Control Board (SPCB) name mapping using boundary-safe regex
UPDATE monitoring_stations SET state = 'Haryana' WHERE name ~* '([^a-zA-Z]|^)HSPCB([^a-zA-Z]|$)' OR name ILIKE '%Haryana%';
UPDATE monitoring_stations SET state = 'Punjab' WHERE name ~* '([^a-zA-Z]|^)PPCB([^a-zA-Z]|$)' OR name ILIKE '%Punjab%';
UPDATE monitoring_stations SET state = 'Uttar Pradesh' WHERE name ~* '([^a-zA-Z]|^)UPPCB([^a-zA-Z]|$)' OR name ILIKE '%Uttar Pradesh%';
UPDATE monitoring_stations SET state = 'Maharashtra' WHERE name ~* '([^a-zA-Z]|^)MPCB([^a-zA-Z]|$)' OR name ILIKE '%Maharashtra%';
UPDATE monitoring_stations SET state = 'Delhi' WHERE name ~* '([^a-zA-Z]|^)DPCC([^a-zA-Z]|$)' OR name ILIKE '%Delhi%';
UPDATE monitoring_stations SET state = 'Rajasthan' WHERE name ~* '([^a-zA-Z]|^)RSPCB([^a-zA-Z]|$)' OR name ILIKE '%Rajasthan%';
UPDATE monitoring_stations SET state = 'Karnataka' WHERE name ~* '([^a-zA-Z]|^)KSPCB([^a-zA-Z]|$)' OR name ILIKE '%Karnataka%';
UPDATE monitoring_stations SET state = 'Bihar' WHERE name ~* '([^a-zA-Z]|^)BSPCB([^a-zA-Z]|$)' OR name ILIKE '%Bihar%';
UPDATE monitoring_stations SET state = 'Tamil Nadu' WHERE name ~* '([^a-zA-Z]|^)TNPCB([^a-zA-Z]|$)' OR name ILIKE '%Tamil Nadu%';
UPDATE monitoring_stations SET state = 'West Bengal' WHERE name ~* '([^a-zA-Z]|^)WBPCB([^a-zA-Z]|$)' OR name ~* '([^a-zA-Z]|^)WBSPCB([^a-zA-Z]|$)' OR name ILIKE '%West Bengal%';
UPDATE monitoring_stations SET state = 'Madhya Pradesh' WHERE name ~* '([^a-zA-Z]|^)MPPCB([^a-zA-Z]|$)' OR name ILIKE '%Madhya Pradesh%';
UPDATE monitoring_stations SET state = 'Andhra Pradesh' WHERE name ~* '([^a-zA-Z]|^)APPCB([^a-zA-Z]|$)' OR name ILIKE '%Andhra Pradesh%';
UPDATE monitoring_stations SET state = 'Odisha' WHERE name ~* '([^a-zA-Z]|^)OSPCB([^a-zA-Z]|$)' OR name ILIKE '%Odisha%';
UPDATE monitoring_stations SET state = 'Telangana' WHERE name ~* '([^a-zA-Z]|^)TSPCB([^a-zA-Z]|$)' OR name ILIKE '%Telangana%';
UPDATE monitoring_stations SET state = 'Chhattisgarh' WHERE name ~* '([^a-zA-Z]|^)CECB([^a-zA-Z]|$)' OR name ~* '([^a-zA-Z]|^)CSPCB([^a-zA-Z]|$)' OR name ILIKE '%Chhattisgarh%';
UPDATE monitoring_stations SET state = 'Kerala' WHERE name ~* '([^a-zA-Z]|^)Kerala PCB([^a-zA-Z]|$)' OR name ILIKE '%Kerala%';
UPDATE monitoring_stations SET state = 'Assam' WHERE name ~* '([^a-zA-Z]|^)PCBA([^a-zA-Z]|$)' OR name ~* '([^a-zA-Z]|^)APCB([^a-zA-Z]|$)' OR name ILIKE '%Assam%';
UPDATE monitoring_stations SET state = 'Uttarakhand' WHERE name ~* '([^a-zA-Z]|^)UKPCB([^a-zA-Z]|$)' OR name ILIKE '%Uttarakhand%';
UPDATE monitoring_stations SET state = 'Himachal Pradesh' WHERE name ~* '([^a-zA-Z]|^)HPPCB([^a-zA-Z]|$)' OR name ILIKE '%Himachal Pradesh%';
UPDATE monitoring_stations SET state = 'Jammu and Kashmir' WHERE name ~* '([^a-zA-Z]|^)JKPCC([^a-zA-Z]|$)' OR name ~* '([^a-zA-Z]|^)JKSPCB([^a-zA-Z]|$)' OR name ~* '([^a-zA-Z]|^)JKPCB([^a-zA-Z]|$)' OR name ILIKE '%Jammu%' OR name ILIKE '%Kashmir%';
UPDATE monitoring_stations SET state = 'Chandigarh' WHERE name ~* '([^a-zA-Z]|^)CPCC([^a-zA-Z]|$)' OR name ILIKE '%Chandigarh%';
UPDATE monitoring_stations SET state = 'Gujarat' WHERE name ~* '([^a-zA-Z]|^)GPCB([^a-zA-Z]|$)' OR name ILIKE '%Gujarat%';
UPDATE monitoring_stations SET state = 'Jharkhand' WHERE name ~* '([^a-zA-Z]|^)JSPCB([^a-zA-Z]|$)' OR name ILIKE '%Jharkhand%';
UPDATE monitoring_stations SET state = 'Sikkim' WHERE name ~* '([^a-zA-Z]|^)SSPCB([^a-zA-Z]|$)' OR name ILIKE '%Sikkim%';
UPDATE monitoring_stations SET state = 'Nagaland' WHERE name ~* '([^a-zA-Z]|^)NPCB([^a-zA-Z]|$)' OR name ILIKE '%Nagaland%';
UPDATE monitoring_stations SET state = 'Mizoram' WHERE name ~* '([^a-zA-Z]|^)Mizoram PCB([^a-zA-Z]|$)' OR name ILIKE '%Mizoram%';
UPDATE monitoring_stations SET state = 'Manipur' WHERE name ~* '([^a-zA-Z]|^)Manipur PCB([^a-zA-Z]|$)' OR name ILIKE '%Manipur%';
UPDATE monitoring_stations SET state = 'Meghalaya' WHERE name ~* '([^a-zA-Z]|^)Meghalaya PCB([^a-zA-Z]|$)' OR name ILIKE '%Meghalaya%';
UPDATE monitoring_stations SET state = 'Tripura' WHERE name ~* '([^a-zA-Z]|^)Tripura SPCB([^a-zA-Z]|$)' OR name ILIKE '%Tripura%';
UPDATE monitoring_stations SET state = 'Puducherry' WHERE name ~* '([^a-zA-Z]|^)PPCC([^a-zA-Z]|$)' OR name ILIKE '%Puducherry%';
UPDATE monitoring_stations SET state = 'Arunachal Pradesh' WHERE name ~* '([^a-zA-Z]|^)APSPCB([^a-zA-Z]|$)' OR name ILIKE '%Naharlagun%' OR name ILIKE '%Arunachal%';
UPDATE monitoring_stations SET state = 'Ladakh' WHERE name ~* '([^a-zA-Z]|^)LPCC([^a-zA-Z]|$)' OR name ILIKE '%Ladakh%' OR name ILIKE '%Leh%' OR name ILIKE '%Kargil%';

-- 2. State & city explicit assignments for major urban clusters
-- Haryana
UPDATE monitoring_stations SET state = 'Haryana', city = 'Gurugram' WHERE city ILIKE 'Gurugram' OR city ILIKE 'Gurgaon' OR name ILIKE '%Gurugram%' OR name ILIKE '%Gurgaon%' OR name ILIKE '%GGN%' OR name ILIKE '%Panchgaon%' OR id = 499;
UPDATE monitoring_stations SET state = 'Haryana', city = 'Faridabad' WHERE city ILIKE 'Faridabad' OR name ILIKE '%Faridabad%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Rohtak' WHERE city ILIKE 'Rohtak' OR name ILIKE '%Rohtak%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Panchkula' WHERE city ILIKE 'Panchkula' OR name ILIKE '%Panchkula%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Ambala' WHERE city ILIKE 'Ambala' OR name ILIKE '%Ambala%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Karnal' WHERE city ILIKE 'Karnal' OR name ILIKE '%Karnal%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Panipat' WHERE city ILIKE 'Panipat' OR name ILIKE '%Panipat%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Hisar' WHERE city ILIKE 'Hisar' OR name ILIKE '%Hisar%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Sonipat' WHERE city ILIKE 'Sonipat' OR name ILIKE '%Sonipat%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Yamuna Nagar' WHERE city ILIKE 'Yamuna Nagar' OR city ILIKE 'Yamunanagar' OR name ILIKE '%Yamunanagar%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Manesar' WHERE city ILIKE 'Manesar' OR name ILIKE '%Manesar%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Bahadurgarh' WHERE city ILIKE 'Bahadurgarh' OR name ILIKE '%Bahadurgarh%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Bhiwani' WHERE city ILIKE 'Bhiwani' OR name ILIKE '%Bhiwani%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Fatehabad' WHERE city ILIKE 'Fatehabad' OR name ILIKE '%Fatehabad%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Jind' WHERE (city ILIKE 'Jind' OR name ILIKE '%Jind%') AND name ~* '([^a-zA-Z]|^)HSPCB([^a-zA-Z]|$)';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Kaithal' WHERE city ILIKE 'Kaithal' OR name ILIKE '%Kaithal%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Kurukshetra' WHERE city ILIKE 'Kurukshetra' OR name ILIKE '%Kurukshetra%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Palwal' WHERE city ILIKE 'Palwal' OR name ILIKE '%Palwal%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Sirsa' WHERE city ILIKE 'Sirsa' OR name ILIKE '%Sirsa%';
UPDATE monitoring_stations SET state = 'Haryana', city = 'Dharuhera' WHERE city ILIKE 'Dharuhera' OR name ILIKE '%Dharuhera%';

-- Punjab
UPDATE monitoring_stations SET state = 'Punjab', city = 'Amritsar' WHERE city ILIKE 'Amritsar' OR name ILIKE '%Amritsar%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Ludhiana' WHERE city ILIKE 'Ludhiana' OR name ILIKE '%Ludhiana%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Jalandhar' WHERE city ILIKE 'Jalandhar' OR name ILIKE '%Jalandhar%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Patiala' WHERE city ILIKE 'Patiala' OR name ILIKE '%Patiala%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Bathinda' WHERE city ILIKE 'Bathinda' OR name ILIKE '%Bathinda%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Mandi Gobindgarh' WHERE city ILIKE 'Mandi Gobindgarh' OR name ILIKE '%Mandi Gobindgarh%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Rupnagar' WHERE city ILIKE 'Rupnagar' OR name ILIKE '%Rupnagar%';
UPDATE monitoring_stations SET state = 'Punjab', city = 'Khanna' WHERE city ILIKE 'Khanna' OR name ILIKE '%Khanna%';

-- Delhi
UPDATE monitoring_stations SET state = 'Delhi', city = 'Delhi' WHERE city ILIKE 'Delhi' OR city ILIKE 'New Delhi' OR name ILIKE '%Delhi%' OR id IN (2, 3, 4, 5, 6, 7, 8, 9, 17, 33, 498, 715, 716, 731);

-- Karnataka
UPDATE monitoring_stations SET state = 'Karnataka', city = 'Bengaluru' WHERE city ILIKE 'Bengaluru' OR city ILIKE 'Bangalore' OR city ILIKE 'KSPCB' OR name ILIKE '%Bengaluru%' OR name ILIKE '%Bangalore%' OR id IN (22, 39, 416, 497, 728, 732);

-- Tamil Nadu
UPDATE monitoring_stations SET state = 'Tamil Nadu', city = 'Chennai' WHERE city ILIKE 'Chennai' OR name ILIKE '%Chennai%' OR id IN (14, 31, 34, 37);

-- West Bengal
UPDATE monitoring_stations SET state = 'West Bengal', city = 'Kolkata' WHERE city ILIKE 'Kolkata' OR city ILIKE 'WBSPCB' OR name ILIKE '%Kolkata%' OR id IN (21, 25, 30, 495);

-- Uttar Pradesh
UPDATE monitoring_stations SET state = 'Uttar Pradesh', city = 'Kanpur' WHERE city ILIKE 'Kanpur' OR name ILIKE '%Kanpur%' OR id = 84;
UPDATE monitoring_stations SET state = 'Uttar Pradesh', city = 'Lucknow' WHERE city ILIKE 'Lucknow' OR name ILIKE '%Lucknow%' OR id IN (13, 32);
UPDATE monitoring_stations SET state = 'Uttar Pradesh', city = 'Varanasi' WHERE city ILIKE 'Varanasi' OR name ILIKE '%Varanasi%' OR id = 40;
UPDATE monitoring_stations SET state = 'Uttar Pradesh', city = 'Agra' WHERE city ILIKE 'Agra' OR name ILIKE '%Agra%';
UPDATE monitoring_stations SET state = 'Uttar Pradesh', city = 'Mathura' WHERE city ILIKE 'Mathura' OR name ILIKE '%Mathura%';
UPDATE monitoring_stations SET state = 'Uttar Pradesh', city = 'Sitapur' WHERE id = 776 OR name ILIKE '%Palm City%';

-- Madhya Pradesh
UPDATE monitoring_stations SET state = 'Madhya Pradesh', city = 'Ratlam' WHERE city ILIKE 'Ratlam' OR name ILIKE '%Ratlam%';
UPDATE monitoring_stations SET state = 'Madhya Pradesh', city = 'Singrauli' WHERE city ILIKE 'Singrauli' OR name ILIKE '%Singrauli%';
UPDATE monitoring_stations SET state = 'Madhya Pradesh', city = 'Damoh' WHERE city ILIKE 'Damoh' OR name ILIKE '%Damoh%';
UPDATE monitoring_stations SET state = 'Madhya Pradesh', city = 'Katni' WHERE city ILIKE 'Katni' OR name ILIKE '%Katni%';
UPDATE monitoring_stations SET state = 'Madhya Pradesh', city = 'Sagar' WHERE city ILIKE 'Sagar' OR name ILIKE '%Sagar%';
UPDATE monitoring_stations SET state = 'Madhya Pradesh', city = 'Mandideep' WHERE city ILIKE 'Mandideep' OR name ILIKE '%Mandideep%';

-- Andhra Pradesh
UPDATE monitoring_stations SET state = 'Andhra Pradesh', city = 'Rajamahendravaram' WHERE city ILIKE 'Rajamahendravaram' OR name ILIKE '%Rajamahendravaram%';
UPDATE monitoring_stations SET state = 'Andhra Pradesh', city = 'Tirupati' WHERE city ILIKE 'Tirupati' OR city ILIKE 'Tirupathi' OR name ILIKE '%Tirupati%';

-- Kerala
UPDATE monitoring_stations SET state = 'Kerala', city = 'Thiruvananthapuram' WHERE name ILIKE '%Thiruvananthapuram%';

-- Clean whitespace
UPDATE monitoring_stations SET city = TRIM(city), state = TRIM(state);

-- Ensure 40 primary dashboard monitoring stations retain dashboard flag
UPDATE monitoring_stations SET is_dashboard_station = TRUE WHERE id <= 40;

-- Update schema version
INSERT INTO system_info (key, value)
VALUES ('schema_version', '008_administrative_hierarchy_fix')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
