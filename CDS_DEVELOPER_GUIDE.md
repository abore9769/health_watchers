# CDS Rules Management - Developer Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│  /settings/cds-rules                                         │
│  ├── CDSRulesClient (state management)                       │
│  ├── CDSRulesList (list view)                                │
│  ├── CDSRuleForm (create/edit)                               │
│  └── CDSRuleTester (testing)                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    React Query (caching)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API (Express.js)                          │
├─────────────────────────────────────────────────────────────┤
│  /api/v1/cds                                                 │
│  ├── GET /rules (list)                                       │
│  ├── POST /rules (create)                                    │
│  ├── PUT /rules/:ruleId (update)                             │
│  ├── DELETE /rules/:ruleId (deactivate)                      │
│  └── POST /evaluate (test)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  CDS Rules Engine                            │
├─────────────────────────────────────────────────────────────┤
│  cds-rules-engine.ts                                         │
│  ├── evaluateRules()                                         │
│  ├── evaluateConditions()                                    │
│  ├── getPatientContext()                                     │
│  └── Rule evaluation logic                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB                                   │
├─────────────────────────────────────────────────────────────┤
│  CDSRule collection                                          │
│  ├── ruleId (unique)                                         │
│  ├── name, description                                       │
│  ├── category, trigger                                       │
│  ├── conditions (JSON)                                       │
│  ├── action (type, message, severity)                        │
│  ├── isActive                                                │
│  └── clinicId (optional)                                     │
└─────────────────────────────────────────────────────────────┘
```

## Component Structure

### CDSRulesClient
**Purpose**: Main state management and orchestration

**Responsibilities**:
- Fetch rules from API
- Manage view state (list, create, edit, test)
- Handle mutations (create, update, delete)
- Coordinate between components

**Key Methods**:
```typescript
fetchRules()        // GET /api/v1/cds/rules
createRule()        // POST /api/v1/cds/rules
updateRule()        // PUT /api/v1/cds/rules/:ruleId
deleteRule()        // DELETE /api/v1/cds/rules/:ruleId
```

### CDSRulesList
**Purpose**: Display all rules in a list

**Props**:
- `rules: CDSRule[]` - Array of rules to display
- `onEdit: (rule: CDSRule) => void` - Edit callback
- `onTest: (rule: CDSRule) => void` - Test callback
- `onDelete: (ruleId: string) => void` - Delete callback
- `isDeleting: boolean` - Loading state

**Features**:
- Color-coded category badges
- Status badges (Active/Inactive)
- Action buttons
- Empty state

### CDSRuleForm
**Purpose**: Create and edit rules

**Props**:
- `initialRule?: CDSRule` - For editing
- `onSubmit: (rule) => void` - Submit callback
- `onCancel: () => void` - Cancel callback
- `isLoading: boolean` - Loading state

**Features**:
- Form validation
- JSON condition editor
- Action configuration
- Immutable rule ID

### CDSRuleTester
**Purpose**: Test rules with patient scenarios

**Props**:
- `rule: CDSRule` - Rule to test
- `onBack: () => void` - Back callback

**Features**:
- Patient scenario input
- Vital signs input
- Prescription input
- Test results display

## Adding New Rule Categories

### Step 1: Update Type Definition
```typescript
// apps/web/src/types/cds.ts
export type RuleCategory = 'drug_interaction' | 'screening' | 'vital_sign' | 'care_gap' | 'allergy' | 'new_category';
```

### Step 2: Update Form Component
```typescript
// apps/web/src/components/cds/CDSRuleForm.tsx
const categories: RuleCategory[] = [
  'drug_interaction',
  'screening',
  'vital_sign',
  'care_gap',
  'allergy',
  'new_category'  // Add here
];
```

### Step 3: Add Evaluation Logic
```typescript
// apps/api/src/modules/cds/cds-rules-engine.ts
private evaluateConditions(conditions: Record<string, unknown>, context: RuleEvaluationContext): boolean {
  // ... existing code ...
  
  if (conditions.type === 'new_category') {
    return this.evaluateNewCategoryRule(conditions, context);
  }
  
  return false;
}

private evaluateNewCategoryRule(conditions: Record<string, unknown>, context: RuleEvaluationContext): boolean {
  // Implement evaluation logic
  return false;
}
```

### Step 4: Update Swagger Docs
```typescript
// apps/api/src/modules/cds/cds.swagger.ts
// Add new_category to enum
enum: [drug_interaction, screening, vital_sign, care_gap, allergy, new_category]
```

## Adding New Triggers

### Step 1: Update Type Definition
```typescript
// apps/web/src/types/cds.ts
export type RuleTrigger = 'encounter_create' | 'prescription_add' | 'vital_sign_record' | 'new_trigger';
```

### Step 2: Update Form Component
```typescript
// apps/web/src/components/cds/CDSRuleForm.tsx
const triggers: RuleTrigger[] = [
  'encounter_create',
  'prescription_add',
  'vital_sign_record',
  'new_trigger'  // Add here
];
```

### Step 3: Integrate with Encounter Creation
```typescript
// apps/api/src/modules/encounters/encounters.controller.ts
// When new_trigger event occurs:
const alerts = await cdsRulesEngine.evaluateRules('new_trigger', {
  patientId: req.body.patientId,
  clinicId: req.user!.clinicId,
  // ... context data ...
});
```

## Extending the Tester

### Add New Input Fields
```typescript
// apps/web/src/components/cds/CDSRuleTester.tsx
interface TestScenario {
  patientId: string;
  vitalSigns?: { ... };
  prescription?: { ... };
  newField?: string;  // Add here
}

// In the form:
<input
  type="text"
  placeholder="New field"
  onChange={(e) =>
    setScenario({
      ...scenario,
      newField: e.target.value,
    })
  }
/>
```

## Performance Optimization

### Caching Strategy
```typescript
// React Query caching
const { data: rules = [], isLoading, error } = useQuery({
  queryKey: ['cds-rules'],
  queryFn: fetchRules,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000,  // 10 minutes
});
```

### Database Indexes
```typescript
// apps/api/src/modules/cds/cds-rule.model.ts
cdsRuleSchema.index({ ruleId: 1 });
cdsRuleSchema.index({ isActive: 1 });
cdsRuleSchema.index({ clinicId: 1 });
cdsRuleSchema.index({ trigger: 1 });
cdsRuleSchema.index({ category: 1 });
```

### Rule Evaluation Optimization
```typescript
// Batch evaluate rules
async evaluateRules(trigger: string, context: RuleEvaluationContext): Promise<CDSAlert[]> {
  // Get applicable rules once
  const rules = await CDSRuleModel.find({
    trigger,
    isActive: true,
    $or: [{ clinicId: null }, { clinicId: context.clinicId }],
  });

  // Evaluate in parallel
  const alerts = await Promise.all(
    rules.map(rule => this.evaluateRule(rule, context))
  );

  return alerts.flat();
}
```

## Testing Guidelines

### Unit Test Template
```typescript
describe('CDSRuleForm', () => {
  it('should render form with initial values', () => {
    render(
      <CDSRuleForm
        initialRule={mockRule}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByDisplayValue(mockRule.name)).toBeInTheDocument();
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(
      <CDSRuleForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        isLoading={false}
      />
    );

    await user.type(screen.getByPlaceholderText('Name'), 'Test Rule');
    fireEvent.click(screen.getByText('Save Rule'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

### E2E Test Template
```typescript
test('should create a new CDS rule', async ({ page }) => {
  await page.goto(`${BASE_URL}/settings/cds-rules`);
  await page.click('button:has-text("Create Rule")');

  // Fill form
  await page.fill('input[placeholder="Name"]', 'Test Rule');
  await page.fill('textarea[placeholder="Description"]', 'Test description');

  // Submit
  await page.click('button:has-text("Save Rule")');
  await page.waitForURL(`${BASE_URL}/settings/cds-rules`);

  // Verify
  await expect(page.locator('text=Test Rule')).toBeVisible();
});
```

## Error Handling

### Frontend Error Handling
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['cds-rules'],
  queryFn: fetchRules,
});

if (error) {
  return (
    <div className="text-danger-500">
      {error instanceof Error ? error.message : 'Failed to load rules'}
    </div>
  );
}
```

### Backend Error Handling
```typescript
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = await CDSRuleModel.find(filter);
    return res.json({ success: true, data: rules });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching CDS rules');
    return res.status(500).json({ error: error.message });
  }
});
```

## Logging and Monitoring

### Add Logging
```typescript
logger.info({ ruleId, trigger }, 'CDS rule evaluated');
logger.warn({ ruleId, error }, 'CDS rule evaluation failed');
logger.error({ error }, 'Critical error in CDS engine');
```

### Monitor Performance
```typescript
const startTime = Date.now();
const alerts = await cdsRulesEngine.evaluateRules(trigger, context);
const elapsed = Date.now() - startTime;
logger.info({ trigger, alertCount: alerts.length, elapsed }, 'CDS rules evaluated');
```

## Security Best Practices

1. **Input Validation**
   - Validate all user inputs
   - Validate JSON conditions
   - Sanitize rule messages

2. **Access Control**
   - Check clinic ownership
   - Verify admin permissions
   - Log all modifications

3. **Data Protection**
   - Encrypt sensitive data
   - Use HTTPS
   - Implement rate limiting

## Deployment Considerations

1. **Database Migrations**
   - No migrations needed for initial release
   - Add migrations for future schema changes

2. **Backward Compatibility**
   - Maintain API compatibility
   - Support old rule formats
   - Gradual rollout of new features

3. **Monitoring**
   - Track rule evaluation times
   - Monitor error rates
   - Alert on performance degradation

## Troubleshooting

### Rules Not Firing
1. Check rule is active: `isActive: true`
2. Verify trigger matches: `trigger: 'encounter_create'`
3. Test conditions with patient data
4. Check clinic ID matches

### Performance Issues
1. Check database indexes
2. Monitor rule evaluation time
3. Optimize condition logic
4. Consider caching patient context

### Form Validation Errors
1. Verify all required fields filled
2. Check JSON syntax in conditions
3. Validate rule ID is unique
4. Check user permissions

## Resources

- **API Documentation**: `/api/v1/docs` (Swagger UI)
- **Feature Guide**: `CDS_RULES_MANAGEMENT.md`
- **Quick Start**: `CDS_QUICK_START.md`
- **Implementation Summary**: `CDS_IMPLEMENTATION_SUMMARY.md`
- **Code Examples**: Test files in `__tests__` and `e2e` directories

## Contributing

1. Follow project conventions
2. Write tests for new features
3. Update documentation
4. Submit PR with description
5. Request review from team

## Support

For questions or issues:
1. Check documentation
2. Review test files for examples
3. Check error logs
4. Contact team lead
