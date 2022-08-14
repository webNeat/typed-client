# The story of typed-client

This the step by step story of me creating this library. I will try to explain the goal of the library, the reasoning and choices that I made, the issues I encoutered and how I solved them.

# The context and the goal of the typed-client library

I am currently working on a project that contains multiple inter-dependent REST APIs. Each API is consumed by many of the other ones. We currently use Swagger to document the APIs endpoints. But the Swagger yaml file often falls behind and doesn't get updated with changes to the codebase which makes it mostly useless. Also the code that calls an API is duplicated on all its consumers and needs to be updated on multiple places when something changes. It would be really useful if every API could provide a small library (something like an SDK or a custom client) that all its consumers can just install and use. The goal of `typed-client` is to make it easy to create such custom client library for any API.

# Desired features

- Easily create a client library to consume a specific API (The priority is for APIs that return JSON responses, but should be possible to support other types easily).
- Ability to create clients for external APIs based on their documentation (you don't need access to source code or a specific form of documentation like Swagger to create a client of an API).
- The resulting library should be fully typed (offers autocomplete for URL and query parameters, returns typed responses, ...).
- Ability to mock calls to the API during tests (easy way to plan the expected calls and define the mock responses).

# Steps

- [Designing the library API](1-designing-the-api.md)