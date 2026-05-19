# Example: Debugging An Assertion Failure

```text
User: "The calculator test is failing"

1. Call wallaby_failingTests -> Get test ID and error
   Error shows: "expected 4, got 5" in multiply function
2. Optional: Call wallaby_coveredLinesForTest(testId) -> Skip if error is clear
3. Optional: Call wallaby_runtimeValues(file, line, expression) -> Skip if cause is obvious
4. Analyze: multiply used + instead of *
5. Fix: Change + to * in calculator.js
6. Call wallaby_failingTests -> Confirm no failures remain
```
