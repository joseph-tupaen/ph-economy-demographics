# Implementation Plan: Interactive regional map

## Overview

Add a dependency-free, accessible national view that lets readers select a Philippine region and understand its latest published inflation value. Keep the existing comparison table as the complete fallback.

## Decisions

- Use build-time SVG paths from the existing lightweight open boundary snapshot; do not add a map library.
- Use the current PSA region slugs as the join key, with a visible note that city-level values are not published yet.
- Follow map-explorer patterns: legend, selected-area detail, table fallback, source/reference-period context.

## Tasks

- [x] Create a minimized region geometry data module and projection helper.
- [x] Add an interactive map component with keyboard selection and selected-region details.
- [x] Add the map to the regional comparison page and retain the table fallback.
- [ ] Verify tests, type checks, build, route/link integrity, and map data coverage.

## Checkpoint

- [ ] All regions with published values are selectable or explicitly explained.
- [ ] `npm test`, `npm run check`, and `npm run build` pass.
