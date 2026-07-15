import { useMemo } from 'react';

// Statistical anomaly detection using z-score and IQR
export function useAnomalyDetection(incidents, districts) {
  const anomalies = useMemo(() => {
    if (!incidents || incidents.length === 0) return [];

    // Group by district (using integer IDs)
    const districtCounts = {};
    incidents.forEach(i => {
      districtCounts[i.DistrictID] = (districtCounts[i.DistrictID] || 0) + 1;
    });

    const values = Object.values(districtCounts);
    const mean = values.reduce((s, v) => s + v, 0) / (values.length || 1);
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length || 1);
    const stdDev = Math.sqrt(variance);

    // Flag districts > 1.8 standard deviations above mean
    // Resolve district names from the districts array
    const districtMap = {};
    (districts || []).forEach(d => {
      districtMap[d.DistrictID || d.id] = d.DistrictName || d.name || String(d.DistrictID || d.id);
    });

    const flaggedDistricts = Object.entries(districtCounts)
      .filter(([, count]) => count > mean + 1.8 * stdDev)
      .map(([districtId, count]) => {
        const distName = districtMap[parseInt(districtId)] || districtMap[districtId] || districtId;
        return {
          district: distName,
          districtId: parseInt(districtId),
          count,
          zScore: stdDev > 0 ? ((count - mean) / stdDev).toFixed(2) : 0,
          type: 'district_spike',
          message: `${distName} has ${count} incidents — significantly above average (${Math.round(mean)})`,
        };
      });

    // Group by crime type and month to detect spikes
    const typeMonthCounts = {};
    incidents.forEach(i => {
      const d = new Date(i.IncidentFromDate);
      const key = `${i.CrimeMajorHeadID}-${d.getFullYear()}-${d.getMonth()}`;
      typeMonthCounts[key] = (typeMonthCounts[key] || 0) + 1;
    });

    // Find crime types with recent spikes
    const typeValues = Object.entries(typeMonthCounts);
    const typeMean = typeValues.reduce((s, [, v]) => s + v, 0) / (typeValues.length || 1);
    const typeStd = Math.sqrt(
      typeValues.reduce((s, [, v]) => s + (v - typeMean) ** 2, 0) / (typeValues.length || 1)
    );

    const flaggedTypes = typeValues
      .filter(([, v]) => v > typeMean + 1.5 * typeStd)
      .map(([key, count]) => {
        const [type] = key.split('-');
        return {
          crimeType: type,
          crimeTypeId: parseInt(type),
          count,
          zScore: typeStd > 0 ? ((count - typeMean) / typeStd).toFixed(2) : 0,
          type: 'type_spike',
          message: `Spike in crime type ${type} incidents detected`,
        };
      });

    // High severity outliers
    const highSeverityOutliers = incidents
      .filter(i => i.GravityOffenceID === 5)
      .slice(0, 5)
      .map(i => {
        const distName = districtMap[i.DistrictID] || i.DistrictID;
        return {
          incident: i,
          type: 'severity_outlier',
          message: `Critical severity incident: ${i.CrimeNo} — Crime Type ${i.CrimeMajorHeadID} in ${distName}`,
        };
      });

    return {
      flaggedDistricts,
      flaggedTypes,
      highSeverityOutliers,
      alertCount: flaggedDistricts.length + flaggedTypes.length + highSeverityOutliers.length,
    };
  }, [incidents, districts]);

  // Risk scores per district (predictive)
  const riskScores = useMemo(() => {
    if (!districts || !incidents) return [];

    return districts.map(d => {
      const distId = d.DistrictID || d.id;
      const districtIncidents = incidents.filter(i => i.DistrictID === distId);
      const recentIncidents = districtIncidents.filter(i => {
        const diff = (new Date() - new Date(i.IncidentFromDate)) / (1000 * 60 * 60 * 24);
        return diff <= 90;
      });

      const avgSeverity = recentIncidents.length > 0
        ? recentIncidents.reduce((s, i) => s + i.GravityOffenceID, 0) / recentIncidents.length
        : 0;

      const openRate = recentIncidents.length > 0
        ? recentIncidents.filter(i => i.CaseStatusID === 1).length / recentIncidents.length
        : 0;

      // Socio-economic weight (higher urbanisation & population → higher baseline)
      const socioWeight = ((d.urban_pct || 30) / 100) * 0.2;

      const rawScore = (recentIncidents.length * 3) + (avgSeverity * 10) + (openRate * 20) + (socioWeight * 10);
      const risk = Math.min(100, Math.round(rawScore));

      return {
        ...d,
        riskScore: risk,
        recentCount: recentIncidents.length,
        avgSeverity: avgSeverity.toFixed(1),
        openRate: Math.round(openRate * 100),
        riskLevel: risk >= 70 ? 'Critical' : risk >= 45 ? 'High' : risk >= 25 ? 'Medium' : 'Low',
        riskColor: risk >= 70 ? '#ff2244' : risk >= 45 ? '#ff8800' : risk >= 25 ? '#ffcc00' : '#00cc88',
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [districts, incidents]);

  return { anomalies, riskScores };
}
