# WCAG 2.1 AA Accessibility Guidelines

## Overview

Health Watchers is committed to WCAG 2.1 AA accessibility compliance. This document outlines accessibility requirements and best practices for developers.

## Automated Testing

### Run Accessibility Tests
```bash
npm run test:a11y
```

### Run Specific Test
```bash
npm run test:a11y -- --grep "dashboard"
```

## Manual Testing

### Keyboard Navigation
- Tab through all interactive elements
- Shift+Tab to navigate backwards
- Enter/Space to activate buttons
- Arrow keys for menus and lists
- Escape to close modals

### Screen Reader Testing
- **macOS**: VoiceOver (Cmd+F5)
- **Windows**: NVDA (free) or JAWS
- **Linux**: Orca

### Color Contrast
- Use WebAIM Contrast Checker
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text (18pt+)

## Key Requirements

### 1. Keyboard Accessibility
- All interactive elements must be keyboard accessible
- Tab order must be logical
- Focus must be visible
- No keyboard traps (except modals)

```tsx
// ✅ Good: Button is keyboard accessible
<button onClick={handleClick}>Click me</button>

// ❌ Bad: Div is not keyboard accessible
<div onClick={handleClick}>Click me</div>
```

### 2. Focus Management
- Focus must be visible (outline or box-shadow)
- Focus must be managed in modals (focus trap)
- Focus must be restored when modal closes

```tsx
// ✅ Good: Focus trap in modal
<dialog ref={dialogRef}>
  <button autoFocus>First button</button>
  {/* ... */}
  <button>Last button</button>
</dialog>

// ✅ Good: Focus visible
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### 3. ARIA Attributes
- Use semantic HTML first
- Add ARIA only when needed
- Keep ARIA attributes accurate

```tsx
// ✅ Good: Semantic HTML
<button>Save</button>
<nav>Navigation</nav>
<main>Main content</main>

// ✅ Good: ARIA for dynamic content
<div role="alert" aria-live="polite">
  Error: Please fill in all fields
</div>

// ❌ Bad: Unnecessary ARIA
<div role="button">Click me</div>
```

### 4. Form Labels
- All inputs must have associated labels
- Use `<label for="id">` or `aria-label`
- Error messages must be associated

```tsx
// ✅ Good: Label with for attribute
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ✅ Good: aria-label
<input aria-label="Search patients" type="search" />

// ✅ Good: Error association
<input aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Invalid email</span>
```

### 5. Color Contrast
- Text: 4.5:1 (normal), 3:1 (large)
- UI components: 3:1
- Don't rely on color alone

```css
/* ✅ Good: High contrast */
color: #000;
background-color: #fff;

/* ❌ Bad: Low contrast */
color: #999;
background-color: #f5f5f5;
```

### 6. Headings
- Use proper heading hierarchy (h1 → h2 → h3)
- Don't skip levels
- One h1 per page

```tsx
// ✅ Good: Proper hierarchy
<h1>Dashboard</h1>
<h2>Recent Patients</h2>
<h3>Patient Details</h3>

// ❌ Bad: Skipped levels
<h1>Dashboard</h1>
<h3>Recent Patients</h3>
```

### 7. Images
- All images must have alt text
- Alt text should describe the image
- Decorative images: `alt=""`

```tsx
// ✅ Good: Descriptive alt text
<img src="patient.jpg" alt="Patient John Doe, age 45" />

// ✅ Good: Decorative image
<img src="divider.png" alt="" aria-hidden="true" />

// ❌ Bad: Missing alt text
<img src="patient.jpg" />
```

### 8. Dynamic Content
- Use `role="alert"` for urgent messages
- Use `role="status"` for status updates
- Use `aria-live="polite"` for updates

```tsx
// ✅ Good: Alert for errors
<div role="alert">
  Error: Payment failed
</div>

// ✅ Good: Status for updates
<div role="status" aria-live="polite">
  Saving...
</div>
```

### 9. Modals
- Focus trap (Tab stays in modal)
- Focus restoration (focus returns to trigger)
- Escape key closes modal
- Proper ARIA attributes

```tsx
// ✅ Good: Modal with focus management
<dialog ref={dialogRef} role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <button autoFocus>Cancel</button>
  <button>Confirm</button>
</dialog>
```

### 10. Links
- Links must have descriptive text
- Avoid "click here" or "read more"
- Use `aria-label` if needed

```tsx
// ✅ Good: Descriptive link text
<a href="/patients/123">View patient John Doe</a>

// ✅ Good: aria-label for icon links
<a href="/settings" aria-label="Settings">
  <SettingsIcon />
</a>

// ❌ Bad: Non-descriptive text
<a href="/patients/123">Click here</a>
```

## Testing Checklist

- [ ] No axe-core violations
- [ ] Keyboard navigation works
- [ ] Focus is visible
- [ ] Screen reader announces content
- [ ] Color contrast is sufficient
- [ ] Headings have proper hierarchy
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] Modals trap focus
- [ ] Dynamic content is announced

## Common Issues

### Issue: Focus not visible
**Solution**: Add focus styles
```css
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Issue: Form input not labeled
**Solution**: Add label or aria-label
```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Issue: Modal doesn't trap focus
**Solution**: Use focus management
```tsx
useEffect(() => {
  const firstButton = dialogRef.current?.querySelector('button');
  firstButton?.focus();
}, []);
```

### Issue: Color contrast too low
**Solution**: Increase contrast
```css
/* Before: #999 on #f5f5f5 = 2.3:1 */
/* After: #666 on #fff = 7.5:1 */
color: #666;
background-color: #fff;
```

### Issue: Screen reader doesn't announce error
**Solution**: Add role="alert"
```tsx
<div role="alert" aria-live="assertive">
  {error}
</div>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Inclusive Components](https://inclusive-components.design/)

## Accessibility Testing Tools

- **axe-core**: Automated WCAG testing
- **WAVE**: Browser extension for accessibility
- **Lighthouse**: Chrome DevTools accessibility audit
- **NVDA**: Free screen reader (Windows)
- **VoiceOver**: Built-in screen reader (macOS)

## CI/CD Integration

Accessibility tests run on every push and PR:
- Tests must pass before merging
- Violations block deployment
- Reports are published to PR

## Questions?

For accessibility questions or issues:
1. Check this guide
2. Review test examples
3. Check WCAG 2.1 guidelines
4. Ask the team

## Compliance Statement

Health Watchers is committed to WCAG 2.1 AA compliance. All new features must pass accessibility testing before deployment.
