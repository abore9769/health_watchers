import {
  mapPatient,
  mapEncounter,
  mapConditions,
  mapObservations,
  mapMedicationRequests,
  buildFhirBundle,
} from './fhir-mapper';

const PATIENT = {
  _id: '507f1f77bcf86cd799439011',
  systemId: 'HW-0001',
  firstName: 'Jane',
  lastName: 'Doe',
  sex: 'F',
  dateOfBirth: '1990-05-15',
  contactNumber: '+2348012345678',
  address: '12 Lagos Street',
  isActive: true,
};

const ENCOUNTER = {
  _id: '507f1f77bcf86cd799439022',
  status: 'closed',
  type: 'consultation',
  chiefComplaint: 'Headache',
  createdAt: new Date('2026-01-10T09:00:00Z'),
  diagnosis: [{ code: 'G43.9', description: 'Migraine, unspecified' }],
  vitalSigns: { heartRate: 72, temperature: 36.6, bloodPressure: '120/80', oxygenSaturation: 98 },
  prescriptions: [{
    drugName: 'Ibuprofen',
    genericName: 'Ibuprofen',
    dosage: '400mg',
    frequency: 'TID',
    duration: '5 days',
    route: 'oral',
    prescribedAt: new Date('2026-01-10T09:30:00Z'),
  }],
};

describe('fhir-mapper', () => {
  describe('mapPatient', () => {
    it('returns resourceType Patient', () => {
      expect(mapPatient(PATIENT).resourceType).toBe('Patient');
    });

    it('maps sex F to female', () => {
      expect(mapPatient(PATIENT).gender).toBe('female');
    });

    it('maps sex M to male', () => {
      expect(mapPatient({ ...PATIENT, sex: 'M' }).gender).toBe('male');
    });

    it('maps sex O to other', () => {
      expect(mapPatient({ ...PATIENT, sex: 'O' }).gender).toBe('other');
    });

    it('includes systemId as identifier', () => {
      const p = mapPatient(PATIENT);
      expect(p.identifier[0].value).toBe('HW-0001');
    });

    it('includes birthDate', () => {
      expect(mapPatient(PATIENT).birthDate).toBe('1990-05-15');
    });

    it('includes telecom when contactNumber present', () => {
      expect(mapPatient(PATIENT).telecom?.[0].value).toBe('+2348012345678');
    });

    it('omits telecom when contactNumber absent', () => {
      const { contactNumber: _, ...p } = PATIENT;
      expect(mapPatient(p).telecom).toBeUndefined();
    });
  });

  describe('mapEncounter', () => {
    it('returns resourceType Encounter', () => {
      expect(mapEncounter(ENCOUNTER, PATIENT._id).resourceType).toBe('Encounter');
    });

    it('maps closed status to finished', () => {
      expect(mapEncounter(ENCOUNTER, PATIENT._id).status).toBe('finished');
    });

    it('maps open status to in-progress', () => {
      expect(mapEncounter({ ...ENCOUNTER, status: 'open' }, PATIENT._id).status).toBe('in-progress');
    });

    it('sets subject reference to Patient/{id}', () => {
      expect(mapEncounter(ENCOUNTER, PATIENT._id).subject.reference).toBe(`Patient/${PATIENT._id}`);
    });
  });

  describe('mapConditions', () => {
    it('returns one Condition per diagnosis', () => {
      const conditions = mapConditions(ENCOUNTER, PATIENT._id);
      expect(conditions).toHaveLength(1);
      expect(conditions[0].resourceType).toBe('Condition');
    });

    it('uses ICD-10 coding system', () => {
      const c = mapConditions(ENCOUNTER, PATIENT._id)[0];
      expect(c.code.coding[0].system).toBe('http://hl7.org/fhir/sid/icd-10');
      expect(c.code.coding[0].code).toBe('G43.9');
    });

    it('returns empty array when no diagnosis', () => {
      expect(mapConditions({ ...ENCOUNTER, diagnosis: [] }, PATIENT._id)).toHaveLength(0);
    });
  });

  describe('mapObservations', () => {
    it('creates Observation for heartRate', () => {
      const obs = mapObservations(ENCOUNTER, PATIENT._id);
      const hr = obs.find((o) => o.id.includes('heartRate'));
      expect(hr).toBeDefined();
      expect(hr!.valueQuantity?.value).toBe(72);
    });

    it('creates Observation for bloodPressure as valueString', () => {
      const obs = mapObservations(ENCOUNTER, PATIENT._id);
      const bp = obs.find((o) => o.id.includes('bp'));
      expect(bp).toBeDefined();
      expect(bp!.valueString).toBe('120/80');
    });

    it('uses LOINC coding system', () => {
      const obs = mapObservations(ENCOUNTER, PATIENT._id);
      expect(obs[0].code.coding[0].system).toBe('http://loinc.org');
    });

    it('returns empty array when no vitalSigns', () => {
      expect(mapObservations({ ...ENCOUNTER, vitalSigns: undefined }, PATIENT._id)).toHaveLength(0);
    });
  });

  describe('mapMedicationRequests', () => {
    it('returns one MedicationRequest per prescription', () => {
      const rxs = mapMedicationRequests(ENCOUNTER, PATIENT._id);
      expect(rxs).toHaveLength(1);
      expect(rxs[0].resourceType).toBe('MedicationRequest');
    });

    it('includes drug name in medicationCodeableConcept', () => {
      const rx = mapMedicationRequests(ENCOUNTER, PATIENT._id)[0];
      expect(rx.medicationCodeableConcept.text).toContain('Ibuprofen');
    });

    it('returns empty array when no prescriptions', () => {
      expect(mapMedicationRequests({ ...ENCOUNTER, prescriptions: [] }, PATIENT._id)).toHaveLength(0);
    });
  });

  describe('buildFhirBundle', () => {
    it('returns resourceType Bundle', () => {
      expect(buildFhirBundle(PATIENT, [ENCOUNTER]).resourceType).toBe('Bundle');
    });

    it('includes Patient, Encounter, Condition, Observation, MedicationRequest entries', () => {
      const bundle = buildFhirBundle(PATIENT, [ENCOUNTER]);
      const types = bundle.entry.map((e) => e.resource.resourceType);
      expect(types).toContain('Patient');
      expect(types).toContain('Encounter');
      expect(types).toContain('Condition');
      expect(types).toContain('Observation');
      expect(types).toContain('MedicationRequest');
    });

    it('total matches entry count', () => {
      const bundle = buildFhirBundle(PATIENT, [ENCOUNTER]);
      expect(bundle.total).toBe(bundle.entry.length);
    });

    it('handles patient with no encounters', () => {
      const bundle = buildFhirBundle(PATIENT, []);
      expect(bundle.entry).toHaveLength(1);
      expect(bundle.entry[0].resource.resourceType).toBe('Patient');
    });
  });
});
