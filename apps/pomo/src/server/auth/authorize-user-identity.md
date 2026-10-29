# User identity authorization

`authorizeUserIdentity` applies the existing calendar and cloud text HTTP policy to an
already resolved identity. Invalid authentication returns a private 503 response before
checking for a missing user, which returns a private 401 response. Both responses preserve
refreshed cookies through `noStoreJson`. Success exposes the non-null user ID and the same
cookie collection synchronously.

This is not a role or user ID format validator: non-invalid access with a non-null ID keeps
the existing authorization result, including an empty ID. Endpoints with a different policy
(such as guest access or treating invalid authentication as 401) keep their own decisions.

Identity lookup, lookup failure translation, logging, route-specific error codes, request
validation, and service calls remain with the existing resolver and routes. This function
adds no lookup, shared state, asynchronous boundary, or resource ownership.

Native responses and the internal response/resolution helpers cover this contract. No
additional dependency is needed; administrator authorization has a different role and
provider contract and remains separate.
