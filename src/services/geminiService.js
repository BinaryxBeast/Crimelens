// ============================================================
// CrimeLens — Gemini Flash API Service
// Analyzes case data for linkages, patterns, and repeat-crime alerts
// ============================================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

// In-memory cache with TTL
const cache = { data: null, timestamp: 0, TTL: 5 * 60 * 1000 }; // 5 min

function getCacheKey(cases) {
  return cases.length + '-' + (cases[0]?.id || '') + '-' + (cases[cases.length - 1]?.id || '');
}

function getCached(key) {
  if (cache.data && cache.key === key && (Date.now() - cache.timestamp) < cache.TTL) {
    return cache.data;
  }
  return null;
}

function setCache(key, data) {
  cache.key = key;
  cache.data = data;
  cache.timestamp = Date.now();
}

/**
 * Build a structured prompt for Gemini to analyze case linkages
 */
function buildPrompt(caseSummaries) {
  return `You are an expert crime intelligence analyst for Karnataka State Police. Analyze the following FIR case records and identify:

1. **CASE LINKAGES**: Cases that are likely connected due to shared characteristics such as:
   - Same or similar modus operandi (MO)
   - Same accused/offender names or aliases
   - Same crime type recurring in the same district or nearby areas
   - Temporal clustering (multiple incidents in a short timeframe)
   - Similar stolen property types or target profiles

2. **CRIME PATTERNS**: Identify serial/repeat crime patterns such as:
   - Chain snatching sprees in a specific area
   - Burglary patterns with similar entry methods
   - Drug trafficking routes or networks
   - Cyber crime campaigns with similar techniques
   - Any escalating patterns (crimes becoming more severe)

3. **ACTIVE ALERTS**: Flag ongoing threats where:
   - The same type of crime is increasing in frequency in a specific area
   - A pattern suggests more incidents are likely coming
   - Connected cases suggest organized criminal activity

Here are the case records (JSON):
\`\`\`json
${JSON.stringify(caseSummaries, null, 1)}
\`\`\`

RESPOND ONLY with valid JSON in this exact structure (no markdown, no code fences):
{
  "linkages": [
    {
      "id": "LNK-001",
      "name": "descriptive name for this linkage",
      "linkedCaseIds": ["case_id_1", "case_id_2"],
      "linkedCaseFIRs": ["FIR-001", "FIR-002"],
      "connectionType": "modus_operandi|same_accused|location_cluster|temporal|property",
      "confidence": 0.85,
      "reasoning": "Explanation of why these cases are linked",
      "commonAttributes": {
        "crimeType": "type if shared",
        "district": "district if shared",
        "modusOperandi": "shared MO description",
        "timePattern": "e.g. Night hours, weekends"
      }
    }
  ],
  "patterns": [
    {
      "id": "PTN-001",
      "name": "Pattern name, e.g. Serial Chain Snatching Ring",
      "crimeType": "specific crime type",
      "district": "affected area",
      "caseCount": 5,
      "linkedCaseIds": ["id1", "id2"],
      "linkedCaseFIRs": ["FIR-001", "FIR-002"],
      "frequency": "e.g. 3 incidents per week",
      "severity": "critical|high|medium|low",
      "description": "detailed description of the pattern",
      "prediction": "what might happen next based on the pattern",
      "timespan": "e.g. Last 30 days"
    }
  ],
  "alerts": [
    {
      "id": "ALR-001",
      "title": "Short alert title",
      "severity": "critical|high|medium",
      "crimeType": "type",
      "district": "affected district",
      "message": "Detailed alert message with actionable intelligence",
      "linkedPatternId": "PTN-001 if linked to a pattern",
      "recommendation": "Suggested action for law enforcement"
    }
  ],
  "summary": {
    "totalLinkagesFound": 3,
    "totalPatternsFound": 2,
    "totalAlertsGenerated": 2,
    "overallThreatLevel": "high|medium|low",
    "keyInsight": "One sentence summary of the most critical finding"
  }
}

If there are no clear linkages, patterns, or alerts, still return the structure with empty arrays and appropriate summary. Be thorough but don't fabricate connections — only flag genuine statistical or behavioral patterns.`;
}

/**
 * Prepare case data into compact summaries for the prompt
 */
export function prepareCaseSummaries(incidents, resolvers = {}) {
  const { getDistrictName, getCrimeTypeName } = resolvers;

  return incidents.slice(0, 80).map(inc => {
    const cd = inc.complaint_data || {};
    const accused = inc._accusedAll || [];
    const victims = inc._victims || [];

    return {
      id: String(inc.CaseMasterID),
      firNumber: inc.CrimeNo || 'N/A',
      crimeType: getCrimeTypeName ? getCrimeTypeName(inc.CrimeMajorHeadID) : String(inc.CrimeMajorHeadID),
      crimeTypeId: inc.CrimeMajorHeadID,
      district: getDistrictName ? getDistrictName(inc.DistrictID) : String(inc.DistrictID),
      districtId: inc.DistrictID,
      date: inc.IncidentFromDate ? new Date(inc.IncidentFromDate).toISOString().split('T')[0] : null,
      severity: inc.GravityOffenceID || 0,
      status: inc.CaseStatusID,
      briefFacts: (inc.BriefFacts || '').slice(0, 200),
      firContents: (cd.fir_contents || '').slice(0, 200),
      address: cd.place_address || '',
      modusOperandi: accused.map(a => a.ModusOperandi || '').filter(Boolean).join('; ') ||
                     (cd.offenders || []).map(o => o.modus_operandi || '').filter(Boolean).join('; ') || '',
      accusedNames: accused.map(a => a.AccusedName).filter(Boolean),
      victimCount: victims.length,
      propertiesStolen: (cd.properties_stolen || '').slice(0, 100),
      latitude: inc.latitude,
      longitude: inc.longitude,
    };
  });
}

/**
 * Call Gemini Flash API to analyze case linkages
 */
export async function analyzeCaseLinkages(caseSummaries) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  if (!caseSummaries || caseSummaries.length === 0) {
    return {
      linkages: [],
      patterns: [],
      alerts: [],
      summary: {
        totalLinkagesFound: 0,
        totalPatternsFound: 0,
        totalAlertsGenerated: 0,
        overallThreatLevel: 'low',
        keyInsight: 'No case data available for analysis.',
      },
    };
  }

  // Check cache
  const cacheKey = getCacheKey(caseSummaries);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = buildPrompt(caseSummaries);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Gemini API error:', response.status, errBody);
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`Gemini API returned ${response.status}`);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  // Parse JSON (handle possible markdown code fences)
  let parsed;
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Failed to parse AI response');
  }

  // Validate & normalize the response structure
  const result = {
    linkages: Array.isArray(parsed.linkages) ? parsed.linkages : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    summary: parsed.summary || {
      totalLinkagesFound: (parsed.linkages || []).length,
      totalPatternsFound: (parsed.patterns || []).length,
      totalAlertsGenerated: (parsed.alerts || []).length,
      overallThreatLevel: 'low',
      keyInsight: 'Analysis complete.',
    },
  };

  setCache(cacheKey, result);
  return result;
}
