# CDS Rules Management UI

## Overview

The CDS (Clinical Decision Support) Rules Management UI enables clinic administrators to view, create, edit, test, and manage clinical decision support rules without requiring database access or developer involvement.

## Features

### 1. Rules List View
- Display all active and inactive CDS rules
- Show rule metadata: name, description, category, trigger, and action
- Color-coded badges for categories and status
- Quick action buttons: Edit, Test, Delete

### 2. Create New Rules
- Form-based rule creation with validation
- Support for all rule categories:
  - `drug_interaction` - Drug interaction detection
  - `screening` - Screening recommendations
  - `vital_sign` - Vital sign thresholds
  - `care_gap` - Care gap identification
  - `allergy` - Allergy alerts
- Support for all triggers:
  - `encounter_create` - Triggered on encounter creation
  - `prescription_add` - Triggered when prescription is added
  - `vital_sign_record` - Triggered when vital signs are recorded
- JSON-based condition definition for flexibility
- Action configuration: type, severity, and message

### 3. Edit Rules
- Modify existing rule properties
- Update conditions and actions
- Toggle rule active/inactive status
- Rule ID is immutable after creation

### 4. Rule Testing
- Simulate patient scenarios to test rule behavior
- Input patient ID and clinic ID
- Provide context-specific data:
  - Vital signs (blood pressure, heart rate, temperature, O2 saturation)
  - Prescription information (drug name)
- See which rules would fire for the scenario
- View alert details: severity, message, and action type

### 5. Rule Deactivation
- Soft delete rules by marking them as inactive
- Deactivated rules don't fire but remain in the database for audit purposes
- Can be reactivated by editing and toggling the active status

## API Endpoints

All endpoints are prefixed with `/api/v1/cds`

### GET /rules
List all CDS rules with optional filtering.

**Query Parameters:**
- `clinicId` (optional) - Filter by clinic (returns global + clinic-specific rules)
- `isActive` (optional) - Filter by active status (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ruleId": "rule_high_bp",
      "name": "High Blood Pressure Alert",
      "description": "Alert when blood pressure is critically high",
      "category": "vital_sign",
      "trigger": "encounter_create",
      "conditions": {
        "type": "vital_sign",
        "bloodPressure": { "critical": true }
      },
      "action": {
        "type": "alert",
        "message": "Patient has critically high blood pressure",
        "severity": "critical"
      },
      "isActive": true,
      "clinicId": null,
      "createdAt": "2026-05-28T16:56:47.676Z",
      "updatedAt": "2026-05-28T16:56:47.676Z"
    }
  ]
}
```

### POST /rules
Create a new CDS rule.

**Request Body:**
```json
{
  "ruleId": "rule_high_bp",
  "name": "High Blood Pressure Alert",
  "description": "Alert when blood pressure is critically high",
  "category": "vital_sign",
  "trigger": "encounter_create",
  "conditions": {
    "type": "vital_sign",
    "bloodPressure": { "critical": true }
  },
  "action": {
    "type": "alert",
    "message": "Patient has critically high blood pressure",
    "severity": "critical"
  },
  "clinicId": null
}
```

### PUT /rules/:ruleId
Update an existing CDS rule.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Rule Name",
  "description": "Updated description",
  "conditions": { ... },
  "action": { ... },
  "isActive": false
}
```

### DELETE /rules/:ruleId
Deactivate a CDS rule (soft delete).

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### POST /evaluate
Evaluate rules for a patient scenario (used for testing).

**Request Body:**
```json
{
  "trigger": "vital_sign_record",
  "patientId": "507f1f77bcf86cd799439011",
  "clinicId": "507f1f77bcf86cd799439012",
  "vitalSigns": {
    "bloodPressure": "185/120",
    "heartRate": 120,
    "temperature": 39.5,
    "oxygenSaturation": 88
  }
}
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "ruleId": "rule_high_bp",
      "severity": "critical",
      "message": "Patient has critically high blood pressure",
      "action": "alert"
    }
  ]
}
```

## UI Routes

- `/settings/cds-rules` - Main CDS rules management page
- `/settings/cds-rules/create` - Create new rule (handled in-page)
- `/settings/cds-rules/edit/:ruleId` - Edit rule (handled in-page)
- `/settings/cds-rules/test/:ruleId` - Test rule (handled in-page)

## Condition Examples

### Vital Sign Rule
```json
{
  "type": "vital_sign",
  "bloodPressure": {
    "critical": true
  },
  "heartRate": {
    "critical": true
  }
}
```

### Drug Interaction Rule
```json
{
  "type": "drug_interaction",
  "contraindications": ["Aspirin", "Ibuprofen"]
}
```

### Screening Rule
```json
{
  "type": "screening",
  "screeningType": "mammography",
  "minAge": 40,
  "maxAge": 75,
  "requiredSex": "F"
}
```

### Allergy Rule
```json
{
  "type": "allergy",
  "allergenType": "drug"
}
```

## Testing

### E2E Tests
Run Playwright tests for the CDS rules management UI:

```bash
npm run test:e2e -- cds-rules.spec.ts
```

Test coverage includes:
- Displaying rules list
- Creating new rules
- Editing existing rules
- Testing rules with patient scenarios
- Deactivating rules
- Form validation
- JSON validation in conditions
- Rule details display
- Status badges

### Manual Testing Checklist

1. **List View**
   - [ ] Navigate to `/settings/cds-rules`
   - [ ] Verify all rules are displayed
   - [ ] Check category and status badges
   - [ ] Verify action buttons are visible

2. **Create Rule**
   - [ ] Click "Create Rule" button
   - [ ] Fill in all required fields
   - [ ] Enter valid JSON in conditions
   - [ ] Submit and verify rule appears in list

3. **Edit Rule**
   - [ ] Click "Edit" on a rule
   - [ ] Modify rule properties
   - [ ] Submit and verify changes

4. **Test Rule**
   - [ ] Click "Test" on a rule
   - [ ] Enter patient and clinic IDs
   - [ ] Provide test data (vital signs, prescription)
   - [ ] Verify test results show if rule fires

5. **Deactivate Rule**
   - [ ] Click "Delete" on a rule
   - [ ] Verify rule is removed from list
   - [ ] Check database that rule is marked inactive

## Security Considerations

- All endpoints require authentication
- Clinic admins can only manage rules for their clinic
- Global rules (clinicId: null) can only be managed by system admins
- Rule conditions are validated as JSON
- All user actions are logged for audit purposes

## Performance

- Rules are cached in React Query with automatic invalidation on mutations
- List view uses efficient MongoDB queries with indexes
- Rule evaluation is optimized to run in <100ms for typical scenarios

## Future Enhancements

- [ ] Drag-and-drop rule priority ordering
- [ ] Rule templates for common scenarios
- [ ] Bulk rule import/export
- [ ] Rule versioning and rollback
- [ ] Advanced rule builder UI (visual rule designer)
- [ ] Rule performance analytics
- [ ] A/B testing for rule variations
