/**
 * LOCATION INTELLIGENCE CONFIGURATION
 * Primary and future scalable locations for the accounting education system.
 * Used across persona generation, research, competitor analysis, SEO targeting.
 */

const LOCATIONS = {
  primary: [
    {
      city: "Kolkata",
      state: "West Bengal",
      tier: "Metro",
      localLanguage: "Bengali",
      economicProfile: "Large commerce student base, growing IT/BPO sector, strong CA coaching culture",
      educationHub: "Multiple commerce colleges, Calcutta University, strong B.Com enrollment",
      keyIndustries: ["IT/BPO", "Manufacturing", "Banking", "Tea Industry", "Jute Industry"],
      accountingDemand: "High demand for Tally/GST-trained freshers in local businesses and BPOs",
      studentPainPoints: [
        "High competition for limited corporate jobs",
        "Most jobs in unorganized sector require practical skills not taught in colleges",
        "Language barrier in English interviews",
        "Limited internship opportunities compared to Bangalore/Delhi"
      ],
      searchBehavior: [
        "accounting jobs in Kolkata salary",
        "tally course in Kolkata fees",
        "best commerce college Kolkata placement",
        "GST filing course near me Kolkata"
      ]
    },
    {
      city: "Lucknow",
      state: "Uttar Pradesh",
      tier: "Tier-1",
      localLanguage: "Hindi",
      economicProfile: "Rapidly growing IT sector, government job aspirants, expanding service sector",
      educationHub: "Lucknow University, multiple B.Com colleges, growing coaching institute culture",
      keyIndustries: ["Government Services", "IT/ITES", "Real Estate", "Retail", "Manufacturing"],
      accountingDemand: "Growing demand for GST practitioners, Tally operators, and tax consultants",
      studentPainPoints: [
        "Government job vs private sector career confusion",
        "Low awareness of modern accounting tools beyond Tally",
        "Family pressure to pursue safe government jobs",
        "Limited exposure to corporate accounting environment"
      ],
      searchBehavior: [
        "accounting course in Lucknow with placement",
        "salary after B.Com in Lucknow",
        "best tally institute Lucknow fees",
        "private job after commerce in UP"
      ]
    }
  ],
  future: [
    {
      city: "Bangalore",
      state: "Karnataka",
      tier: "Metro",
      localLanguage: "Kannada",
      economicProfile: "IT capital, high demand for finance professionals in tech companies"
    },
    {
      city: "Patna",
      state: "Bihar",
      tier: "Tier-2",
      localLanguage: "Hindi",
      economicProfile: "Growing education hub, large student population, aspirational career seekers"
    },
    {
      city: "Delhi",
      state: "Delhi NCR",
      tier: "Metro",
      localLanguage: "Hindi",
      economicProfile: "Largest job market, corporate headquarters, maximum accounting job openings"
    }
  ]
};

/**
 * Get primary location data for agent prompts.
 */
function getPrimaryLocationContext() {
  return LOCATIONS.primary.map(loc => {
    return `
CITY: ${loc.city}, ${loc.state} (${loc.tier})
Economy: ${loc.economicProfile}
Education: ${loc.educationHub}
Key Industries: ${loc.keyIndustries.join(", ")}
Accounting Demand: ${loc.accountingDemand}
Student Pain Points: ${loc.studentPainPoints.join("; ")}
Local Search Behavior: ${loc.searchBehavior.join("; ")}`;
  }).join("\n---\n");
}

/**
 * Get a specific primary location by city name.
 */
function getLocationByCity(city) {
  return LOCATIONS.primary.find(l => l.city.toLowerCase() === city.toLowerCase())
    || LOCATIONS.future.find(l => l.city.toLowerCase() === city.toLowerCase());
}

/**
 * Get all primary city names.
 */
function getPrimaryCities() {
  return LOCATIONS.primary.map(l => l.city);
}

module.exports = { LOCATIONS, getPrimaryLocationContext, getLocationByCity, getPrimaryCities };
