# ENFORCER AUDIT CHECKLIST

## Purpose
3rd-party review of specification before BUILD phase approval.

## Instructions
Use `architect-reviewer` subagent to perform enforcer audit:

```javascript
Task({
  subagent_type: "architect-reviewer",
  prompt: `
    ENFORCER AUDIT REQUIRED

    Project Directive: {paste PROJECT-DIRECTIVE.md content}

    Node Spec to Audit:
    {paste the node spec}

    Perform full enforcer audit checklist and return verdict.
  `
})
```

## Checklist Template

### 1. Project Directive Alignment
- [ ] Read PROJECT-DIRECTIVE.md
- Project Purpose: "{copy the purpose statement}"
- [ ] This node serves the stated purpose
- [ ] This node does NOT violate constraints
- [ ] This node is IN SCOPE

### 2. Spec Completeness
- [ ] All inputs documented with types/sources
- [ ] Logic is step-by-step, no ambiguity
- [ ] All outputs documented with schemas
- [ ] All routes documented (success/failure/error)
- [ ] Test cases cover all paths

### 3. Code Rules Compliance
- [ ] Follows org code standards
- [ ] No security vulnerabilities in logic
- [ ] No obvious performance issues
- [ ] Error handling is complete

### 4. Higher-Order Reflection
Q: "Does this node move us toward the project goal?"
A: {enforcer's assessment}

Q: "Is there a simpler way to achieve this?"
A: {enforcer's assessment}

Q: "What could go wrong that isn't handled?"
A: {enforcer's assessment}

### VERDICT
- [ ] APPROVED - Proceed to BUILD
- [ ] CORRECTIONS REQUIRED - See list below
- [ ] REJECTED - Reason: {reason}

### Corrections Required (if any)
1. {correction 1}
2. {correction 2}
