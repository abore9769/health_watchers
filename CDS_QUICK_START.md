# CDS Rules Management - Quick Start Guide

## Accessing the CDS Rules Management UI

1. Log in to Health Watchers as a clinic administrator
2. Navigate to **Settings** → **CDS Rules Management**
3. Or go directly to: `http://localhost:3000/settings/cds-rules`

## Creating Your First Rule

### Step 1: Click "Create Rule"
Click the blue "Create Rule" button in the top right corner.

### Step 2: Fill in Basic Information
- **Rule ID**: Unique identifier (auto-generated, e.g., `rule_1234567890`)
- **Name**: Human-readable rule name (e.g., "High Blood Pressure Alert")
- **Description**: What the rule does (e.g., "Alert when blood pressure is critically high")

### Step 3: Select Rule Type
- **Category**: Choose from:
  - `vital_sign` - Monitor vital signs
  - `drug_interaction` - Check for drug interactions
  - `screening` - Recommend screenings
  - `care_gap` - Identify care gaps
  - `allergy` - Check for allergies
- **Trigger**: When the rule should fire:
  - `encounter_create` - When a new encounter is created
  - `prescription_add` - When a prescription is added
  - `vital_sign_record` - When vital signs are recorded

### Step 4: Define Conditions (JSON)
Enter the rule conditions as JSON. Examples:

**Vital Sign Rule:**
```json
{
  "type": "vital_sign",
  "bloodPressure": {
    "critical": true
  }
}
```

**Drug Interaction Rule:**
```json
{
  "type": "drug_interaction",
  "contraindications": ["Aspirin", "Ibuprofen"]
}
```

**Screening Rule:**
```json
{
  "type": "screening",
  "screeningType": "mammography",
  "minAge": 40,
  "maxAge": 75,
  "requiredSex": "F"
}
```

### Step 5: Configure Action
- **Type**: What should happen:
  - `alert` - Show an alert
  - `recommendation` - Show a recommendation
  - `block` - Block the action
- **Severity**: How urgent:
  - `info` - Informational
  - `warning` - Warning
  - `critical` - Critical
- **Message**: The message to display (e.g., "Patient has critically high blood pressure")

### Step 6: Save
Click "Save Rule" to create the rule.

## Testing a Rule

### Step 1: Click "Test" on a Rule
Find the rule in the list and click the "Test" button.

### Step 2: Enter Patient Information
- **Patient ID**: The MongoDB ObjectId of the patient
- **Clinic ID**: The MongoDB ObjectId of the clinic

### Step 3: Provide Test Data
Depending on the rule type, provide:
- **Vital Signs**: Blood pressure, heart rate, temperature, O2 saturation
- **Prescription**: Drug name
- **Other**: Any other relevant data

### Step 4: Run Test
Click "Run Test" to see if the rule would fire for this scenario.

### Step 5: Review Results
- ✓ **Rule fires**: The rule matched the scenario
- ✗ **Rule doesn't fire**: The rule didn't match

## Editing a Rule

### Step 1: Click "Edit" on a Rule
Find the rule in the list and click the "Edit" button.

### Step 2: Modify the Rule
Update any fields except the Rule ID (which is immutable).

### Step 3: Save Changes
Click "Save Rule" to update the rule.

## Deactivating a Rule

### Step 1: Click "Delete" on a Rule
Find the rule in the list and click the "Delete" button.

### Step 2: Confirm
The rule will be deactivated (soft deleted) and removed from the active list.

**Note**: Deactivated rules are not deleted from the database, only marked as inactive. They can be reactivated by editing and toggling the "Active" checkbox.

## Common Rule Examples

### Example 1: High Blood Pressure Alert
```
Name: High Blood Pressure Alert
Category: vital_sign
Trigger: encounter_create
Conditions: {
  "type": "vital_sign",
  "bloodPressure": { "critical": true }
}
Action Type: alert
Severity: critical
Message: Patient has critically high blood pressure. Consider immediate intervention.
```

### Example 2: Drug Interaction Check
```
Name: Aspirin-Ibuprofen Interaction
Category: drug_interaction
Trigger: prescription_add
Conditions: {
  "type": "drug_interaction",
  "contraindications": ["Aspirin", "Ibuprofen"]
}
Action Type: block
Severity: critical
Message: Cannot prescribe Ibuprofen - patient is already on Aspirin.
```

### Example 3: Mammography Screening
```
Name: Mammography Screening Recommendation
Category: screening
Trigger: encounter_create
Conditions: {
  "type": "screening",
  "screeningType": "mammography",
  "minAge": 40,
  "maxAge": 75,
  "requiredSex": "F"
}
Action Type: recommendation
Severity: warning
Message: Patient is due for mammography screening.
```

### Example 4: Low Oxygen Saturation
```
Name: Low Oxygen Saturation Alert
Category: vital_sign
Trigger: vital_sign_record
Conditions: {
  "type": "vital_sign",
  "oxygenSaturation": { "critical": true }
}
Action Type: alert
Severity: critical
Message: Patient's oxygen saturation is critically low (< 90%).
```

## Troubleshooting

### "Invalid JSON in conditions"
- Check your JSON syntax
- Use a JSON validator (e.g., jsonlint.com)
- Ensure all strings are quoted
- Ensure all braces and brackets are matched

### Rule doesn't fire in test
- Verify the test data matches the conditions
- Check the condition logic
- Review the rule trigger type
- Test with different patient data

### Can't create rule
- Ensure all required fields are filled
- Check that Rule ID is unique
- Verify JSON conditions are valid
- Check that you have admin permissions

## Tips & Best Practices

1. **Use descriptive names**: Make rule names clear and specific
2. **Document conditions**: Add detailed descriptions
3. **Test before deploying**: Always test rules with realistic scenarios
4. **Start simple**: Begin with basic rules and add complexity
5. **Monitor performance**: Check rule execution times
6. **Version your rules**: Use naming conventions (e.g., v1, v2)
7. **Backup important rules**: Export rule configurations
8. **Review regularly**: Audit rules quarterly for relevance

## API Integration

If you're integrating with the API directly:

```bash
# List all rules
curl http://localhost:3001/api/v1/cds/rules

# Create a rule
curl -X POST http://localhost:3001/api/v1/cds/rules \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "rule_high_bp",
    "name": "High Blood Pressure Alert",
    ...
  }'

# Test a rule
curl -X POST http://localhost:3001/api/v1/cds/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": "vital_sign_record",
    "patientId": "507f1f77bcf86cd799439011",
    "clinicId": "507f1f77bcf86cd799439012",
    "vitalSigns": {
      "bloodPressure": "185/120"
    }
  }'
```

## Support

For issues or questions:
1. Check the full documentation: `CDS_RULES_MANAGEMENT.md`
2. Review the API docs: `/api/v1/docs` (Swagger UI)
3. Check the implementation summary: `CDS_IMPLEMENTATION_SUMMARY.md`
4. Contact your system administrator

## Next Steps

- Create your first rule
- Test it with patient data
- Deploy to production
- Monitor rule performance
- Iterate based on feedback
