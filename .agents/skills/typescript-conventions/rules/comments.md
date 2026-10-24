# Comments

- Write comments above the target code, never on its right side, and follow the repository’s comment-language policy.
- Function JSDoc describes the contract (what), not the implementation. Call-site comments explain intent (why).
- Document every property of a function's options object with JSDoc explaining its role and usage contract. For optional properties, explain the behavior when omitted. For callbacks, explain when they are called and the meaning of their arguments and return values. For resource-related properties, explain ownership and cleanup responsibilities.
- When adding or changing option properties, update their JSDoc and verify that every property is documented before reporting completion.
