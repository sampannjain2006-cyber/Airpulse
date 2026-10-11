import { getPool } from '../config/db.js';

const PCB_MAP = [
  ['HSPCB', 'Haryana'],
  ['PPCB', 'Punjab'],
  ['UPPCB', 'Uttar Pradesh'],
  ['MPCB', 'Maharashtra'],
  ['DPCC', 'Delhi'],
  ['RSPCB', 'Rajasthan'],
  ['KSPCB', 'Karnataka'],
  ['BSPCB', 'Bihar'],
  ['TNPCB', 'Tamil Nadu'],
  ['WBPCB', 'West Bengal'],
  ['WBSPCB', 'West Bengal'],
  ['MPPCB', 'Madhya Pradesh'],
  ['APPCB', 'Andhra Pradesh'],
  ['APSPCB', 'Arunachal Pradesh'],
  ['OSPCB', 'Odisha'],
  ['TSPCB', 'Telangana'],
  ['CECB', 'Chhattisgarh'],
  ['CSPCB', 'Chhattisgarh'],
  ['KERALA PCB', 'Kerala'],
  ['PCBA', 'Assam'],
  ['APCB', 'Assam'],
  ['MANIPUR PCB', 'Manipur'],
  ['MEGHALAYA PCB', 'Meghalaya'],
  ['TRIPURA SPCB', 'Tripura'],
  ['UKPCB', 'Uttarakhand'],
  ['HPPCB', 'Himachal Pradesh'],
  ['JKPCC', 'Jammu and Kashmir'],
  ['JKSPCB', 'Jammu and Kashmir'],
  ['JKPCB', 'Jammu and Kashmir'],
  ['CPCC', 'Chandigarh'],
  ['GPCB', 'Gujarat'],
  ['JSPCB', 'Jharkhand'],
  ['SSPCB', 'Sikkim'],
  ['NPCB', 'Nagaland'],
  ['MIZORAM PCB', 'Mizoram'],
  ['PPCC', 'Puducherry'],
  ['ANPCC', 'Andaman and Nicobar Islands'],
  ['LPCC', 'Ladakh'],
];

function getBoardState(name) {
  for (const [code, state] of PCB_MAP) {
    const re = new RegExp('([^a-zA-Z]|^)' + code + '([^a-zA-Z]|$)', 'i');
    if (re.test(name)) return state;
  }
  return null;
}

const CITY_LOOKUP = {
  // Haryana
  'gurugram': 'Haryana', 'gurgaon': 'Haryana', 'faridabad': 'Haryana', 'rohtak': 'Haryana',
  'panchkula': 'Haryana', 'ambala': 'Haryana', 'karnal': 'Haryana', 'panipat': 'Haryana',
  'hisar': 'Haryana', 'sonipat': 'Haryana', 'yamunanagar': 'Haryana', 'manesar': 'Haryana',
  'bahadurgarh': 'Haryana', 'bhiwani': 'Haryana', 'charkhi dadri': 'Haryana', 'fatehabad': 'Haryana',
  'jind': 'Haryana', 'kaithal': 'Haryana', 'kurukshetra': 'Haryana', 'palwal': 'Haryana',
  'sirsa': 'Haryana', 'dharuhera': 'Haryana', 'ballabgarh': 'Haryana', 'mandikhera': 'Haryana',
  'narnaul': 'Haryana',

  // Punjab
  'amritsar': 'Punjab', 'ludhiana': 'Punjab', 'jalandhar': 'Punjab', 'patiala': 'Punjab',
  'bathinda': 'Punjab', 'mandi gobindgarh': 'Punjab', 'rupnagar': 'Punjab', 'khanna': 'Punjab',
  'mohali': 'Punjab', 'sas nagar': 'Punjab',

  // Chandigarh
  'chandigarh': 'Chandigarh',

  // Delhi
  'delhi': 'Delhi', 'new delhi': 'Delhi',

  // Uttar Pradesh
  'agra': 'Uttar Pradesh', 'kanpur': 'Uttar Pradesh', 'lucknow': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh',
  'noida': 'Uttar Pradesh', 'greater noida': 'Uttar Pradesh', 'ghaziabad': 'Uttar Pradesh', 'meerut': 'Uttar Pradesh',
  'prayagraj': 'Uttar Pradesh', 'allahabad': 'Uttar Pradesh', 'bareilly': 'Uttar Pradesh', 'aligarh': 'Uttar Pradesh',
  'moradabad': 'Uttar Pradesh', 'saharanpur': 'Uttar Pradesh', 'gorakhpur': 'Uttar Pradesh', 'firozabad': 'Uttar Pradesh',
  'jhansi': 'Uttar Pradesh', 'muzaffarnagar': 'Uttar Pradesh', 'mathura': 'Uttar Pradesh', 'ayodhya': 'Uttar Pradesh',
  'baghpat': 'Uttar Pradesh', 'bulandshahr': 'Uttar Pradesh', 'hapur': 'Uttar Pradesh', 'raebareli': 'Uttar Pradesh',
  'vrindavan': 'Uttar Pradesh', 'modinagar': 'Uttar Pradesh', 'khurja': 'Uttar Pradesh', 'baraut': 'Uttar Pradesh',
  'gajraula': 'Uttar Pradesh', 'khora': 'Uttar Pradesh', 'shamli': 'Uttar Pradesh', 'fatehpur sikri': 'Uttar Pradesh',
  'sitapur': 'Uttar Pradesh',

  // Rajasthan
  'jaipur': 'Rajasthan', 'jodhpur': 'Rajasthan', 'kota': 'Rajasthan', 'ajmer': 'Rajasthan',
  'bikaner': 'Rajasthan', 'udaipur': 'Rajasthan', 'alwar': 'Rajasthan', 'bhiwadi': 'Rajasthan',
  'pali': 'Rajasthan', 'sikar': 'Rajasthan', 'chittorgarh': 'Rajasthan', 'bharatpur': 'Rajasthan',
  'bhilwara': 'Rajasthan', 'jhunjhunu': 'Rajasthan', 'churu': 'Rajasthan', 'kishangarh': 'Rajasthan',

  // Maharashtra
  'mumbai': 'Maharashtra', 'pune': 'Maharashtra', 'nagpur': 'Maharashtra', 'nashik': 'Maharashtra',
  'solapur': 'Maharashtra', 'thane': 'Maharashtra', 'chandrapur': 'Maharashtra', 'navi mumbai': 'Maharashtra',
  'ahmednagar': 'Maharashtra', 'akola': 'Maharashtra', 'amravati': 'Maharashtra', 'badlapur': 'Maharashtra',
  'ambernath': 'Maharashtra', 'kolhapur': 'Maharashtra', 'sangli': 'Maharashtra', 'jalgaon': 'Maharashtra',
  'latur': 'Maharashtra', 'pimpri': 'Maharashtra',

  // Karnataka
  'bengaluru': 'Karnataka', 'bangalore': 'Karnataka', 'mysuru': 'Karnataka', 'mysore': 'Karnataka',
  'hubballi': 'Karnataka', 'dharwad': 'Karnataka', 'kalaburagi': 'Karnataka', 'mangaluru': 'Karnataka',
  'belagavi': 'Karnataka', 'bagalkot': 'Karnataka', 'chikkaballapur': 'Karnataka', 'chikkamagaluru': 'Karnataka',
  'davangere': 'Karnataka', 'gadag': 'Karnataka', 'hassan': 'Karnataka', 'haveri': 'Karnataka',
  'kolar': 'Karnataka', 'koppal': 'Karnataka', 'madikeri': 'Karnataka', 'mandya': 'Karnataka',
  'raichur': 'Karnataka', 'ramanagara': 'Karnataka', 'shivamogga': 'Karnataka', 'tumakuru': 'Karnataka',
  'udupi': 'Karnataka', 'vijayapura': 'Karnataka', 'yadgir': 'Karnataka',

  // Tamil Nadu
  'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu', 'salem': 'Tamil Nadu',
  'tiruchirappalli': 'Tamil Nadu', 'tiruppur': 'Tamil Nadu', 'vellore': 'Tamil Nadu', 'thoothukudi': 'Tamil Nadu',
  'ariyalur': 'Tamil Nadu', 'chengalpattu': 'Tamil Nadu', 'cuddalore': 'Tamil Nadu', 'dharmapuri': 'Tamil Nadu',
  'dindigul': 'Tamil Nadu', 'erode': 'Tamil Nadu', 'kanchipuram': 'Tamil Nadu', 'kanyakumari': 'Tamil Nadu',
  'karur': 'Tamil Nadu', 'krishnagiri': 'Tamil Nadu', 'nagapattinam': 'Tamil Nadu', 'namakkal': 'Tamil Nadu',
  'nilgiris': 'Tamil Nadu', 'perambalur': 'Tamil Nadu', 'pudukkottai': 'Tamil Nadu', 'ramanathapuram': 'Tamil Nadu',
  'ranipet': 'Tamil Nadu', 'sivaganga': 'Tamil Nadu', 'tenkasi': 'Tamil Nadu', 'thanjavur': 'Tamil Nadu',
  'theni': 'Tamil Nadu', 'thiruvallur': 'Tamil Nadu', 'thiruvarur': 'Tamil Nadu', 'tirunelveli': 'Tamil Nadu',
  'tirupathur': 'Tamil Nadu', 'tiruvannamalai': 'Tamil Nadu', 'viluppuram': 'Tamil Nadu', 'virudhunagar': 'Tamil Nadu',

  // West Bengal
  'kolkata': 'West Bengal', 'howrah': 'West Bengal', 'asansol': 'West Bengal', 'durgapur': 'West Bengal',
  'haldia': 'West Bengal', 'siliguri': 'West Bengal',

  // Telangana
  'hyderabad': 'Telangana', 'warangal': 'Telangana', 'karimnagar': 'Telangana', 'khammam': 'Telangana', 'nizamabad': 'Telangana',

  // Andhra Pradesh
  'visakhapatnam': 'Andhra Pradesh', 'vijayawada': 'Andhra Pradesh', 'guntur': 'Andhra Pradesh', 'nellore': 'Andhra Pradesh',
  'kurnool': 'Andhra Pradesh', 'rajamahendravaram': 'Andhra Pradesh', 'tirupati': 'Andhra Pradesh', 'tirupathi': 'Andhra Pradesh',
  'kakinada': 'Andhra Pradesh', 'kadapa': 'Andhra Pradesh', 'anantapur': 'Andhra Pradesh', 'eluru': 'Andhra Pradesh',
  'chittoor': 'Andhra Pradesh', 'srikakulam': 'Andhra Pradesh', 'amaravati': 'Andhra Pradesh',

  // Bihar
  'patna': 'Bihar', 'gaya': 'Bihar', 'muzaffarpur': 'Bihar', 'bhagalpur': 'Bihar', 'purnia': 'Bihar',
  'darbhanga': 'Bihar', 'bihar sharif': 'Bihar', 'arrah': 'Bihar', 'begusarai': 'Bihar', 'katihar': 'Bihar',
  'munger': 'Bihar', 'chhapra': 'Bihar', 'danapur': 'Bihar', 'saharsa': 'Bihar', 'hajipur': 'Bihar',
  'sasaram': 'Bihar', 'dehri': 'Bihar', 'bettiah': 'Bihar', 'motihari': 'Bihar', 'kishanganj': 'Bihar',
  'siwan': 'Bihar', 'buxar': 'Bihar', 'samastipur': 'Bihar', 'araria': 'Bihar',

  // Gujarat
  'ahmedabad': 'Gujarat', 'surat': 'Gujarat', 'vadodara': 'Gujarat', 'rajkot': 'Gujarat', 'bhavnagar': 'Gujarat',
  'jamnagar': 'Gujarat', 'gandhinagar': 'Gujarat', 'junagadh': 'Gujarat', 'anand': 'Gujarat', 'navsari': 'Gujarat',
  'morbi': 'Gujarat', 'nadiad': 'Gujarat', 'surendranagar': 'Gujarat', 'bharuch': 'Gujarat', 'vapi': 'Gujarat',
  'ankleshwar': 'Gujarat', 'mehsana': 'Gujarat',

  // Madhya Pradesh
  'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh', 'gwalior': 'Madhya Pradesh', 'jabalpur': 'Madhya Pradesh',
  'ujjain': 'Madhya Pradesh', 'sagar': 'Madhya Pradesh', 'dewas': 'Madhya Pradesh', 'satna': 'Madhya Pradesh',
  'ratlam': 'Madhya Pradesh', 'rewa': 'Madhya Pradesh', 'katni': 'Madhya Pradesh', 'singrauli': 'Madhya Pradesh',
  'pithampur': 'Madhya Pradesh', 'damoh': 'Madhya Pradesh', 'maihar': 'Madhya Pradesh', 'mandideep': 'Madhya Pradesh',

  // Odisha
  'bhubaneswar': 'Odisha', 'cuttack': 'Odisha', 'rourkela': 'Odisha', 'talcher': 'Odisha', 'angul': 'Odisha',
  'jharsuguda': 'Odisha', 'suinda': 'Odisha',

  // Jharkhand
  'ranchi': 'Jharkhand', 'jamshedpur': 'Jharkhand', 'dhanbad': 'Jharkhand', 'bokaro': 'Jharkhand',

  // Chhattisgarh
  'raipur': 'Chhattisgarh', 'bhilai': 'Chhattisgarh', 'bilaspur': 'Chhattisgarh', 'korba': 'Chhattisgarh',

  // Kerala
  'thiruvananthapuram': 'Kerala', 'kochi': 'Kerala', 'kozhikode': 'Kerala', 'kollam': 'Kerala',
  'thrissur': 'Kerala', 'kannur': 'Kerala', 'palakkad': 'Kerala',

  // Assam
  'guwahati': 'Assam', 'silchar': 'Assam', 'dibrugarh': 'Assam',

  // Uttarakhand
  'dehradun': 'Uttarakhand', 'haridwar': 'Uttarakhand', 'rishikesh': 'Uttarakhand', 'kashipur': 'Uttarakhand',

  // Himachal Pradesh
  'shimla': 'Himachal Pradesh', 'dharamshala': 'Himachal Pradesh', 'baddi': 'Himachal Pradesh',
  'damtal': 'Himachal Pradesh', 'paonta sahib': 'Himachal Pradesh',

  // Jammu and Kashmir
  'srinagar': 'Jammu and Kashmir', 'jammu': 'Jammu and Kashmir', 'rajouri': 'Jammu and Kashmir',
  'bandipora': 'Jammu and Kashmir', 'doda': 'Jammu and Kashmir', 'udhampur': 'Jammu and Kashmir',
  'reasi': 'Jammu and Kashmir',

  // Ladakh
  'leh': 'Ladakh', 'kargil': 'Ladakh',

  // Goa
  'panaji': 'Goa',

  // North East & UTs
  'agartala': 'Tripura', 'aizawl': 'Mizoram', 'imphal': 'Manipur', 'shillong': 'Meghalaya',
  'kohima': 'Nagaland', 'naharlagun': 'Arunachal Pradesh', 'puducherry': 'Puducherry',
  'sri vijaya puram': 'Andaman and Nicobar Islands',
};

export async function runCorrection() {
  const pool = getPool();
  console.log('[AirPulse] Correcting station administrative hierarchy...');

  const { rows } = await pool.query('SELECT id, name, locality, city, state, latitude, longitude, is_dashboard_station FROM monitoring_stations ORDER BY id;');

  let updatedCount = 0;
  for (const s of rows) {
    let targetState = null;
    let targetCity = s.city ? s.city.trim() : '';

    // 1. Direct Board match
    const bState = getBoardState(s.name);
    if (bState) {
      targetState = bState;
    }

    // 2. City lookup in station name or city
    if (!targetState) {
      const cLow = targetCity.toLowerCase();
      if (CITY_LOOKUP[cLow]) {
        targetState = CITY_LOOKUP[cLow];
      }
    }

    // Check station name for cities
    for (const [c, st] of Object.entries(CITY_LOOKUP)) {
      const re = new RegExp('([^a-zA-Z]|^)' + c + '([^a-zA-Z]|$)', 'i');
      if (re.test(s.name)) {
        if (!targetState) targetState = st;
        // Clean city name if current city is invalid or 'India'
        if (targetCity.toLowerCase() === 'india' || targetCity.toLowerCase() === 'kspcb' || targetCity.toLowerCase() === 'wbspcb' || targetCity.length <= 2) {
          targetCity = c.charAt(0).toUpperCase() + c.slice(1);
        }
        break;
      }
    }

    // 3. Fallback coordinates for residual stations
    if (!targetState) {
      const lat = parseFloat(s.latitude);
      const lon = parseFloat(s.longitude);
      if (lat >= 28.4 && lat <= 28.9 && lon >= 76.8 && lon <= 77.4) targetState = 'Delhi';
      else if (lat >= 32.5 && lat <= 35.0 && lon >= 74.0 && lon <= 76.5) targetState = 'Jammu and Kashmir';
      else if (lat >= 12.8 && lat <= 13.2 && lon >= 77.4 && lon <= 77.8) targetState = 'Karnataka';
      else if (lat >= 12.8 && lat <= 13.3 && lon >= 80.0 && lon <= 80.4) targetState = 'Tamil Nadu';
      else if (lat >= 22.3 && lat <= 22.8 && lon >= 88.2 && lon <= 88.6) targetState = 'West Bengal';
      else if (lat >= 22.6 && lat <= 22.8 && lon >= 75.7 && lon <= 76.0) targetState = 'Madhya Pradesh';
      else if (lat >= 26.7 && lat <= 27.0 && lon >= 80.8 && lon <= 81.1) targetState = 'Uttar Pradesh';
      else if (lat >= 26.3 && lat <= 26.6 && lon >= 80.2 && lon <= 80.5) targetState = 'Uttar Pradesh';
    }

    // Clean up city if it's still 'India' or PCB code
    if (targetCity.toLowerCase() === 'india' || targetCity.toLowerCase() === 'kspcb' || targetCity.toLowerCase() === 'wbspcb') {
      if (targetState === 'Delhi') targetCity = 'Delhi';
      else if (targetState === 'Karnataka') targetCity = 'Bengaluru';
      else if (targetState === 'Tamil Nadu') targetCity = 'Chennai';
      else if (targetState === 'West Bengal') targetCity = 'Kolkata';
      else if (targetState === 'Maharashtra') targetCity = 'Mumbai';
      else if (targetState === 'Telangana') targetCity = 'Hyderabad';
      else if (targetState === 'Jammu and Kashmir') targetCity = 'Srinagar';
    }

    // Special cleanup for Thiruvananthapuram mistakenly labeled Hapur
    if (s.name.includes('Thiruvananthapuram')) {
      targetCity = 'Thiruvananthapuram';
      targetState = 'Kerala';
    }
    if (s.name.includes('Mandideep')) {
      targetCity = 'Mandideep';
      targetState = 'Madhya Pradesh';
    }

    if (targetState && (targetState !== s.state || targetCity !== s.city)) {
      await pool.query(
        'UPDATE monitoring_stations SET state = $1, city = $2, updated_at = NOW() WHERE id = $3;',
        [targetState, targetCity, s.id]
      );
      updatedCount++;
    }
  }

  // Ensure top 40 stations remain marked dashboard stations
  await pool.query('UPDATE monitoring_stations SET is_dashboard_station = TRUE WHERE id <= 40;');

  console.log(`[AirPulse] Successfully synchronized administrative hierarchy for ${updatedCount} stations.`);
}

if (process.argv[1]?.endsWith('correctStationData.js')) {
  runCorrection().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
