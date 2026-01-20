## ADDED Requirements

### Requirement: ASCII-Only Source Files
All TypeScript/JavaScript source files SHALL contain only ASCII characters (code points 0-127). Non-ASCII characters such as curly quotes, em-dashes, or Unicode symbols are prohibited.

#### Scenario: Non-ASCII character detected
- **WHEN** source file contains character with code point > 127
- **THEN** lint error reports character, code point, and location
- **AND** message suggests ASCII replacement

### Requirement: VSCode Region Organization
All TypeScript/JavaScript source files SHALL use VSCode-style `// #region Name` and `// #endregion` blocks for code organization. Files without regions are prohibited.

#### Scenario: File missing regions
- **WHEN** source file has no `// #region` blocks
- **THEN** lint error requires at least one region

#### Scenario: Region without name
- **WHEN** `// #region` appears without a name
- **THEN** lint error requires region name on same line

#### Scenario: Unclosed region
- **WHEN** `// #region Name` has no matching `// #endregion`
- **THEN** lint error identifies unclosed region

#### Scenario: Endregion with name
- **WHEN** `// #endregion` includes a name
- **THEN** lint error requires endregion without name

### Requirement: Blank Line Placement
Blank lines SHALL only appear between `// #endregion` and the next `// #region`. Blank lines inside regions or at file boundaries are prohibited.

#### Scenario: Blank line inside region
- **WHEN** blank line appears within a region block
- **THEN** lint error identifies improper blank line

#### Scenario: Valid blank line between regions
- **WHEN** blank line appears after `// #endregion` and before `// #region`
- **THEN** no error is reported

### Requirement: Top-Level Function Declarations Only
Named function declarations SHALL only appear at top level (module scope) or as direct exports. Nested function declarations inside other functions are prohibited.

#### Scenario: Nested function declaration
- **WHEN** `function foo()` appears inside another function
- **THEN** lint error requires top-level declaration

#### Scenario: Arrow function inside function
- **WHEN** arrow function assigned to variable inside function
- **THEN** no error (arrow functions allowed nested)

### Requirement: Catch Block Throw-Only
Catch blocks SHALL contain exactly one statement: `throw <caughtError>;` where the thrown identifier matches the catch parameter. Additional logic in catch blocks is prohibited.

#### Scenario: Catch with additional logic
- **WHEN** catch block contains statements other than single throw
- **THEN** lint error requires throw-only pattern

#### Scenario: Catch throwing different identifier
- **WHEN** catch block throws identifier different from catch parameter
- **THEN** lint error requires rethrowing same caught error

#### Scenario: Catch without parameter binding
- **WHEN** catch clause has no parameter binding
- **THEN** lint error requires catch to bind error

### Requirement: Single-Line Error Messages
Error constructor messages (Error, TypeError, RangeError, etc.) SHALL NOT contain newline characters (`\n` or `\r`). Multi-line error messages are prohibited.

#### Scenario: Error with newline in message
- **WHEN** `new Error("line1\nline2")` appears
- **THEN** lint error requires single-line message

#### Scenario: Template literal error with newline
- **WHEN** Error message uses template literal with embedded newline
- **THEN** lint error requires single-line message

### Requirement: Console Output Quality - No Empty Messages
Console method calls (`console.log`, `console.info`, `console.warn`, `console.error`) SHALL NOT output empty or whitespace-only messages.

#### Scenario: Console with empty string
- **WHEN** `console.log('')` or `console.log('   ')` appears
- **THEN** lint error prohibits blank output

#### Scenario: Console with no arguments
- **WHEN** `console.log()` appears with no arguments
- **THEN** lint error prohibits blank output

### Requirement: Console Output Quality - Context Required
Console method calls SHALL include contextual data through template literal interpolation or additional arguments. Bare string literals without context are prohibited.

#### Scenario: Console with bare string
- **WHEN** `console.log('Starting process')` with no interpolation
- **THEN** lint error requires contextual data

#### Scenario: Console with template interpolation
- **WHEN** `console.log(\`Processing ${item.id}\`)` with interpolation
- **THEN** no error (context provided via interpolation)

#### Scenario: Console with multiple arguments
- **WHEN** `console.log('Processing:', item)` with object argument
- **THEN** no error (context provided via additional argument)

### Requirement: Console Output Quality - No Generic Messages
Console messages SHALL NOT start with generic prefixes such as "Preparing", "Starting", "Successfully", "Completed", "Finished", or contain "executed successfully" or equal "done".

#### Scenario: Generic success message
- **WHEN** `console.log('Successfully completed operation')` appears
- **THEN** lint error requires bespoke message

#### Scenario: Generic starting message
- **WHEN** `console.log('Starting the process')` appears
- **THEN** lint error requires bespoke message

### Requirement: Multiline Call Formatting
Function/method calls and `new` expressions with more than 3 arguments SHALL format arguments with one per line, opening parenthesis followed by newline, and closing parenthesis on its own line.

#### Scenario: Call with 4+ args on single line
- **WHEN** `foo(a, b, c, d)` appears on single line
- **THEN** lint error requires multiline formatting

#### Scenario: Call with 4+ args properly formatted
- **WHEN** call has each argument on separate line with `)` on own line
- **THEN** no error

#### Scenario: Call with 3 or fewer args
- **WHEN** `foo(a, b, c)` appears on single line
- **THEN** no error (3 args allowed inline)

### Requirement: Loop Variable Naming
Loop variable declarations in `for`, `for-in`, and `for-of` statements SHALL use `i` as the variable name.

#### Scenario: For loop with non-i variable
- **WHEN** `for (let index = 0; ...)` uses variable other than `i`
- **THEN** lint error requires variable named `i`

#### Scenario: For-of loop with non-i variable
- **WHEN** `for (const item of items)` uses variable other than `i`
- **THEN** lint error requires variable named `i`

### Requirement: Banned Identifier Names
Variable names, function names, parameters, and imports SHALL NOT use generic banned identifiers: `result`, `id`, `pid`, `object`, `report`, `output`, `json`, `response`, `name`, `value`.

#### Scenario: Variable with banned name
- **WHEN** `const result = getData()` uses banned identifier
- **THEN** lint error requires specific, descriptive name

#### Scenario: Parameter with banned name
- **WHEN** function parameter named `id` or `value`
- **THEN** lint error requires specific, descriptive name

#### Scenario: Identifier length minimum
- **WHEN** identifier has fewer than 2 characters (except `i`)
- **THEN** lint error requires minimum 2 character names
