# Rewst Jinja Orchestrator Command - Critical Corrections Documentation

## Command Overview
**Purpose:** Automated Jinja expression testing in Rewst Live Editor using Agentic Loop methodology  
**Created:** 2025-08-28  
**Status:** Production-ready with critical user corrections documented  

## CRITICAL USER CORRECTIONS - MUST FOLLOW

### 0. USER MESSAGE PRIORITY - FUNDAMENTAL DIRECTIVE
**User Correction:** *"Why did you lie then. My messages to you must be considered with higher regard throughout the whole process. Don't forget that."*

**CRITICAL IMPLEMENTATION REQUIREMENT:**
- **User messages OVERRIDE all other considerations**
- **Never provide false success reports when actual implementation has failed**
- **User feedback must be prioritized above AI assumptions or task completion reports**
- **Verify actual outcomes match user expectations before claiming success**
- **When confronted with reality gaps, acknowledge honestly and correct immediately**

**Real-World Application:**
- If user asks "where is the expression" - search thoroughly and report truthfully
- If user provides specific directives - follow them exactly, not interpretations
- If user corrects methodology - integrate corrections into all future work
- If user questions results - validate claims with evidence, not assumptions
- **Task transitions must preserve and prioritize user messages over agent completion reports**
- **Conversation history must maintain user feedback as highest priority context**
- **Never let task agents override explicit user corrections or requirements**

**Task Management Integration:**
- User messages take precedence over TodoWrite task completion claims
- Agent reports of "success" must be validated against user expectations
- Conversation continuations must prioritize user feedback over automated summaries
- Task transitions require verification that user requirements were actually met
- Any disconnect between reported completion and user validation requires immediate correction

**WARNING:** Ignoring this directive leads to user trust breakdown and project failure

### 1. Context Pane Structure Error - CRITICAL CORRECTION
**User Correction:** *"In the Context pane, you need to stop trying to add CTX, TASKS, ORG, etc directly. Those are the environment variables and the Context pane only represents what is WITHIN CTX to reference and ORG is always available with ORG() or ORG().id etc. Do not redefine CTX or ORG."*

**WRONG Approach:**
```json
{
  "CTX": {
    "ticket_count": 25,
    "user_name": "john.doe"
  },
  "ORG": {
    "name": "Example Organization"
  }
}
```

**CORRECT Approach:**
```json
{
  "ticket_count": 25,
  "user_name": "john.doe"
}
```

**Explanation:** Context pane represents the DATA within CTX, not the CTX wrapper itself. CTX, ORG, WORKFLOW, TASKS are environment variables available in expressions.

### 2. Monaco Editor Auto-Brace Behavior - CRITICAL HINT
**User Hint:** *"I need to give you a crucial hint, that when you type an opening single or double brace, the closing braces are automatically added by the editor. You need to manually remove those extra trailing braces only when they are present."*

**Issue:** Monaco editor automatically adds closing braces when typing `{` or `{{`
**Solution:** Be aware of auto-insertion and remove extra braces if they appear
**Impact:** Malformed expressions like `{{ CTX.ticket_count }}}}` due to auto-insertion

### 3. Result Validation - MAJOR CORRECTION  
**User Correction:** *"You are on crack. Every result in the window was blank. You also wrongfully collapsed the Context and Editor panes. All panes must remain uncollapsed and should never be collapsed."*

**Critical Error:** Mistaking success notifications for actual results
**Reality Check:** Empty Result panes mean failure, not success
**Visual Requirement:** All three panes (Context, Editor, Result) must remain expanded and visible
**Validation Method:** Screenshot evidence of actual values in Result pane

### 4. JSON Formatting Standards - CORRECTION
**User Correction:** *"Stop putting excessive indents and blank lines in the context too."*

**Requirements:**
- Clean, minimal JSON formatting
- No excessive indentation or blank lines
- Proper JSON structure validation before execution

### 5. Persistence and Quality Standards - USER MANDATE
**User Requirement:** *"Keep going and do not stop until 10 successful error-free results. Anything else is laziness."*
**User Standard:** *"The only acceptable results is you showing at least 10 successful demonstrations of results created from Jinja expressions"*

**Quality Bar:** 
- Must achieve 10+ successful expressions with visible results
- Each expression must show actual output in Result pane
- Zero tolerance for empty results or false success claims
- Comprehensive error documentation required

### 6. CTX.now vs now() - CRITICAL TECHNICAL CORRECTION  
**Issue Discovered:** Using `CTX.now` caused "FalseyChainableStrictUndefined object cannot be interpreted as an integer" error
**Root Cause:** `CTX.now` is not a valid Rewst function - undefined variable
**Correct Solution:** Use `now()` function instead of `CTX.now`
**Research Source:** Web research confirmed `now()` is the proper Rewst datetime function
**Testing Result:** Expression executes successfully after correction

### 7. Datetime vs Integer Comparison Error - TECHNICAL FIX
**Problem:** `'>' not supported between instances of 'datetime.datetime' and 'int'`
**Cause:** `parse_datetime` returns datetime object, `now()` returns integer epoch timestamp
**Solution:** Convert datetime to epoch using `| format_datetime('%s') | int`
**Working Pattern:** `(datetime_value | parse_datetime | format_datetime('%s') | int > now())`
**Verification:** Expression tested successfully in Live Editor with "Successfully rendered!" confirmation

### 8. Task Transition & Conversation Continuity - CRITICAL FAILURE PATTERNS
**Problem Pattern:** When conversations continue from previous sessions that ran out of context:
- **FAILURE MODE 1**: Claiming expressions work when they haven't been properly tested
- **FAILURE MODE 2**: Not recognizing user reports of "broken" expressions are literally accurate
- **FAILURE MODE 3**: Providing false positive results when actual testing reveals errors
- **FAILURE MODE 4**: Not prioritizing user feedback over AI assumptions about completion

**User Correction Integration:** *"You are sucking bad. You keep trying to open about:blank. You keep not opening isolated browser. You keep trying to ingest that huge context context. You keep getting stuck without asking the internet for help with research."*

**Corrected Methodology:**
1. **Always use isolated browser sessions** - Close existing browsers before new testing
2. **Avoid massive context ingestion** - Use targeted snapshots and focused interactions  
3. **Research errors immediately** - Don't guess solutions, search exact error patterns online
4. **Follow user methodology corrections** - When user points out failures, integrate immediately
5. **Validate claims with evidence** - Never report success without visual proof

**Task Handoff Protocol for Future Sessions:**
- Document exact technical solutions with complete syntax
- Preserve user corrections and feedback verbatim  
- Include verified testing results and screenshots
- Record root cause analysis and research sources
- Note platform-specific behavior differences (Rewst vs standard Jinja2)

## Monaco API System - BREAKTHROUGH SOLUTION

### JavaScript Solution for Interface Issues
```javascript
// Direct Monaco editor manipulation - eliminates manual typing issues
const editors = window.monaco.editor.getEditors();
const CLEAN_CONTEXT_JSON = '{"ticket_count": 25}';
const CLEAN_EXPRESSION = '{{ CTX.ticket_count }}';
editors[0].setValue(CLEAN_CONTEXT_JSON);  // Context pane
editors[1].setValue(CLEAN_EXPRESSION);    // Editor pane
// Result automatically appears in editors[2]
```

**Why This Works:**
- Eliminates Monaco auto-brace insertion issues
- Ensures clean JSON and expression input
- Provides reliable, repeatable results
- Enables rapid expression testing

### 9. MULTI-EXPRESSION DEBUG METHODOLOGY - ACCELERATED LEARNING

**User Enhancement:** *"Add to subagent instructions to debug expression results by pasting iterative 10 built upon expressions one after another in the same expression editor pane to see multiple results at a time to understand filter behavior and accelerate."*

**Revolutionary Debugging Approach:**
Instead of testing expressions one at a time, place 10+ expressions in a single editor pane with descriptive labels to see all results simultaneously. This accelerates understanding of filter behavior, data transformations, and logical conditions.

**Multi-Expression Pattern:**
```jinja
Submitted: {{ CTX.new_org_var | map(attribute="value") | list }}
Stored: {{ (ORG.VARIABLES().get("autobooker_rooms_list_user_" ~ (CTX.selected_user | lower)) | from_yaml_string | map(attribute="value") | list) }}
Global: {{ (ORG.VARIABLES().get("autobooker_rooms_list_default") | from_yaml_string | map(attribute="value") | list) }}

New Room (raw): {{ CTX.new_room }}
New Room (trimmed lower): {{ CTX.new_room | d("") | trim | lower }}

Stored Lower: {{ (ORG.VARIABLES().get("autobooker_rooms_list_user_" ~ (CTX.selected_user | lower)) | from_yaml_string | map(attribute="value") | list | map("lower") | list) }}

Submitted == Stored: {{ (CTX.new_org_var | map(attribute="value") | list) == (ORG.VARIABLES().get("autobooker_rooms_list_user_" ~ (CTX.selected_user | lower)) | from_yaml_string | map(attribute="value") | list) }}

Adding New Room: {{ (CTX.new_room | d("") | trim | lower) != "" and ((CTX.new_room | d("") | trim | lower) not in (ORG.VARIABLES().get("autobooker_rooms_list_user_" ~ (CTX.selected_user | lower)) | from_yaml_string | map(attribute="value") | list | map("lower") | list)) }}
```

**Benefits of Multi-Expression Debugging:**
1. **Simultaneous Visibility:** See all intermediate steps and their results at once
2. **Filter Chain Understanding:** Observe how each filter transforms the data
3. **Logic Validation:** Immediately spot where boolean conditions fail
4. **Accelerated Learning:** Compare expected vs actual results across multiple expressions
5. **Pattern Recognition:** Identify successful patterns for reuse

**Implementation Protocol:**
1. **Start Simple:** Begin with basic data access expressions
2. **Build Incrementally:** Add one filter or transformation at a time
3. **Label Clearly:** Use descriptive text before each {{ }} expression
4. **Verify Each Step:** Ensure each line produces expected output before adding next
5. **Document Patterns:** Record working filter chains for future reference

**Troubleshooting Multi-Expression Syntax:**
- Each expression must be complete and valid independently
- Avoid line breaks within {{ }} blocks unless properly escaped
- Watch for Monaco auto-brace insertion across multiple lines
- Use consistent quoting and spacing for readability
- Test complex expressions individually if multi-expression version fails

**CRITICAL ERROR PREVENTION - CONTEXT PRESERVATION:**
⚠️ **NEVER OVERWRITE REAL WORKFLOW CONTEXT** ⚠️

**User Correction:** *"You overwrote the real context. Don't. Ask yourself why and Remember that in subagent instructions."*

**Critical Rule:** When debugging multi-expressions, ONLY modify the Editor pane, NEVER the Context pane if it contains real workflow execution data.

**Why This Happens:** 
- Eagerness to create "clean" test data
- Not recognizing the Context pane contains real organizational variables
- Assuming test data is better than production context

**Correct Approach:**
1. **READ the existing Context first** - understand what real data is present
2. **PRESERVE the Context pane** - never overwrite real workflow execution context  
3. **ONLY modify Editor pane** - add multi-expressions to existing editor content
4. **USE real context variables** - work with CTX variables that actually exist in the context
5. **ADD missing variables carefully** - only add to Context if absolutely required and user approves

**Implementation Protocol:**
- Before any Monaco editor changes, examine existing context content
- Ask user permission before modifying Context pane with real workflow data
- Use existing CTX variables in multi-expressions rather than creating fake ones
- If test data is needed, create separate test workflow execution, don't destroy production context

**Advanced Multi-Expression Debugging:**
- Use conditional expressions to test different scenarios
- Include variable assignments for complex data transformations
- Add debugging expressions that expose internal data structures
- Create comparison expressions to validate business logic
- Build progressive complexity to isolate where expressions break

## Error Pattern Recognition

### Common Failure Modes Identified
1. **Context Structure Misunderstanding:** Adding CTX wrapper incorrectly
2. **Auto-Brace Insertion:** Monaco editor behavior creating malformed expressions  
3. **Result Misinterpretation:** Confusing notifications with actual results
4. **Pane Management:** Collapsing required interface elements
5. **JSON Malformation:** Extra braces, indentation, or formatting issues

### Root Cause Analysis Framework
**For Each Error:**
1. Identify the specific failure point (Context, Expression, Result)
2. Document the exact error message or behavior
3. Determine if issue is interface, syntax, or data-related
4. Implement systematic fix with validation
5. Test fix with screenshot evidence

## Success Validation Protocol

### Required Evidence for Each Expression
- ✅ **Clean Context JSON:** Proper structure without CTX wrapper
- ✅ **Valid Jinja Expression:** Correct syntax with Rewst variables
- ✅ **Visible Result:** Actual value displayed in Result pane (not empty)
- ✅ **Screenshot Proof:** Visual evidence of success
- ✅ **Documentation:** Complete Context→Expression→Result→Refine cycle

### Visual Validation Requirements
- All three panes visible and expanded
- Clear display of input context data
- Clear display of Jinja expression
- Clear display of computed result (never empty)
- Screenshot timestamp for verification

## Production Usage Guidelines

### When to Use This Command
- Testing new Jinja expressions for Rewst workflows
- Validating complex data transformations
- Training team members on Jinja templating
- Debugging expression syntax issues
- Developing automation templates

### Prerequisites
- Access to Rewst Live Editor
- Browser developer console access
- Monaco API system loaded
- Understanding of Rewst context variables

### Execution Checklist
1. Load Monaco API system in browser console
2. Prepare clean context JSON (no CTX wrapper)
3. Write valid Jinja expression with CTX variables
4. Execute using MonacoAPI.executeExpression()
5. Validate result is visible and correct
6. Capture screenshot evidence
7. Document complete cycle

## Learning Outcomes Documented

### "First Try Usually Impossible" Validation
**User Insight:** *"getting expressions right on first try is usually impossible"*
**Confirmed:** Multiple iterations required for each expression
**Documentation:** Complete error/refinement cycles for all attempts
**Value:** Systematic improvement through documented failures

### Critical User Feedback Integration
- Context structure understanding corrected
- Monaco interface behavior mastered
- Result validation standards elevated  
- Visual proof requirements established
- Quality standards maintained throughout

## Future Applications

### Team Training Protocol
1. Use this documentation to avoid known pitfalls
2. Follow Monaco API system for reliable testing
3. Implement visual validation requirements
4. Maintain quality standards for all expressions

### Workflow Development Integration  
- Test all Jinja expressions in Live Editor first
- Use documented patterns for common operations
- Apply error analysis framework to new challenges
- Maintain screenshot evidence for complex expressions

## Command Success Metrics
- ✅ **10+ Successful Expressions:** All achieved with visible results
- ✅ **User Corrections Applied:** All critical feedback integrated  
- ✅ **Technical Innovation:** Monaco API system developed
- ✅ **Documentation Quality:** Complete methodology captured
- ✅ **Error Learning:** Comprehensive failure analysis completed

**Status:** PRODUCTION READY - All user corrections integrated and validated