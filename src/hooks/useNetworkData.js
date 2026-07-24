import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useLookupData } from './useLookupData';

export function useNetworkData() {
  const [nodes, setNodes]   = useState([]);
  const [links, setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { getDistrictName, getUnitName, getCrimeTypeName } = useLookupData();

  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch CaseMaster records with complaint_data
      const { data: incidents } = await supabase
        .from('CaseMaster')
        .select('CaseMasterID, CrimeNo, CrimeMajorHeadID, PoliceStationID, GravityOffenceID, complaint_data');

      const graphNodes  = [];
      const graphLinks  = [];
      
      const districtNodes = {};
      const stationNodes = {};
      const offenderNodes = {};
      const victimNodes = {};
      const officerNodes = {};

      const stationDistrictLinks = new Set();

      (incidents || []).forEach((inc) => {
        // District Node
        const distIdVal = inc.complaint_data?.district || null;
        const distName = distIdVal ? getDistrictName(distIdVal) : 'Unknown District';
        if (!districtNodes[distName]) {
          const distId = `district-${distName}`;
          districtNodes[distName] = distId;
          graphNodes.push({
            id: distId,
            label: distName,
            type: 'district',
            val: 10,
          });
        }

        // Police Station Node
        const stationName = inc.PoliceStationID ? getUnitName(inc.PoliceStationID) : 'Unknown Station';
        if (!stationNodes[stationName]) {
          const stationId = `station-${stationName}`;
          stationNodes[stationName] = stationId;
          graphNodes.push({
            id: stationId,
            label: stationName,
            type: 'station',
            val: 8,
          });
        }

        // Link District -> Station
        const distLinkKey = `${distName}-${stationName}`;
        if (!stationDistrictLinks.has(distLinkKey)) {
          stationDistrictLinks.add(distLinkKey);
          graphLinks.push({
            source: districtNodes[distName],
            target: stationNodes[stationName],
            type: 'part_of'
          });
        }

        // Incident Node
        const incNodeId = `incident-${inc.CaseMasterID}`;
        graphNodes.push({
          id:        incNodeId,
          label:     inc.CrimeNo || `Case #${inc.CaseMasterID}`,
          type:      'incident',
          crimeType: getCrimeTypeName(inc.CrimeMajorHeadID),
          severity:  inc.GravityOffenceID,
          val:       5,
        });

        // Link Station -> Incident
        graphLinks.push({
          source: stationNodes[stationName],
          target: incNodeId,
          type: 'handled_by'
        });

        // Extract offender & victim from relational data or complaint_data
        const cd = inc.complaint_data || {};
        
        // Offender Nodes (multiple) — use relational data first, fallback to complaint_data
        const offenderList = (inc._accusedAll && inc._accusedAll.length > 0)
          ? inc._accusedAll.map(a => ({ name: a.AccusedName, district: null, modus_operandi: '' }))
          : (cd.offenders || (cd.offender ? [cd.offender] : []));
        
        for (const offData of offenderList) {
          const offenderName = offData.name || offData.AccusedName;
          if (offenderName) {
            let offKey = offenderName.toLowerCase().trim().replace(/\s+/g, '_');
            if (offKey.includes('unknown') || offKey.includes('anonymous') || offKey.includes('annonymous')) {
              offKey = `${offKey}_${inc.CaseMasterID}`;
            }
            if (!offenderNodes[offKey]) {
              const offNodeId = `offender-${offKey}`;
              offenderNodes[offKey] = offNodeId;
              graphNodes.push({
                id:     offNodeId,
                label:  offenderName,
                type:   'offender',
                district: offData.district ? getDistrictName(offData.district) : distName,
                modus:  offData.modus_operandi || '',
                val:    3,
              });
            }
            // Link Incident -> Offender
            graphLinks.push({
              source: incNodeId,
              target: offenderNodes[offKey],
              type: 'accused',
            });
          }
        }

        // Victim Nodes (multiple) — use relational data first, fallback to complaint_data
        const victimList = (inc._victims && inc._victims.length > 0)
          ? inc._victims.map(v => ({ name: v.VictimName, age: v.AgeYear, gender: v.GenderID === 1 ? 'Male' : v.GenderID === 2 ? 'Female' : 'Other', occupation: v.OccupationName }))
          : (cd.victims || (cd.victim ? [cd.victim] : []));

        for (const vicData of victimList) {
          const victimName = vicData.name || vicData.VictimName;
          if (victimName) {
            let vicKey = victimName.toLowerCase().trim().replace(/\s+/g, '_');
            if (vicKey.includes('unknown') || vicKey.includes('anonymous') || vicKey.includes('annonymous')) {
              vicKey = `${vicKey}_${inc.CaseMasterID}`;
            }
            if (!victimNodes[vicKey]) {
              const vicNodeId = `victim-${vicKey}`;
              victimNodes[vicKey] = vicNodeId;
              graphNodes.push({
                id: vicNodeId,
                label: victimName,
                type: 'victim',
                age: vicData.age,
                gender: vicData.gender,
                occupation: vicData.occupation,
                val: 3,
              });
            }
            // Link Incident -> Victim
            graphLinks.push({
              source: incNodeId,
              target: victimNodes[vicKey],
              type: 'victim',
            });
          }
        }

        // Officer Node
        const officerName = cd.officer_name || cd.investigating_officer?.name || cd.investigating_officer;
        if (officerName && typeof officerName === 'string') {
          let officerKey = officerName.toLowerCase().trim().replace(/\s+/g, '_');
          if (!officerNodes[officerKey]) {
            const offNodeId = `officer-${officerKey}`;
            officerNodes[officerKey] = offNodeId;
            graphNodes.push({
              id: offNodeId,
              label: officerName,
              type: 'officer',
              rank: cd.officer_rank || '',
              val: 4,
            });
          }
          // Link Incident -> Officer
          graphLinks.push({
            source: incNodeId,
            target: officerNodes[officerKey],
            type: 'investigated_by',
          });
        }
      });

      setNodes(graphNodes);
      setLinks(graphLinks);
    } catch (err) {
      console.error('Network data error:', err);
    } finally {
      setLoading(false);
    }
  }, [getDistrictName, getUnitName, getCrimeTypeName]);

  useEffect(() => { fetchNetwork(); }, [fetchNetwork]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`network-realtime-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CaseMaster' }, () => fetchNetwork())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNetwork]);

  return { nodes, links, loading, refetch: fetchNetwork };
}
