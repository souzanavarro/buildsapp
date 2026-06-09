I will implement address-based grouping of deliveries in the map and list views, and fix the "Facade Unavailable" issue by improving the Mapillary integration.

### Proposed Changes

#### 1. Optimization & Bug Fixes
- **Fix "Facade Unavailable":** Improve the Mapillary image retrieval logic to ensure it falls back correctly to Google Street View and handles coordinate formatting properly.
- **StreetView Component:** Create a dedicated `StreetViewImage` component to unify facade display logic between the list and the map.

#### 2. Grouping Feature
- **Route Hook:** Modify the route data processing to group deliveries with the exact same address.
- **Map View:** Update the marker logic to display a special indicator when a location has multiple deliveries (grouping).
- **Details Card:** When clicking a grouped marker, show a list of all tracking codes and details for that address instead of just one.
- **List View:** Group deliveries by address in the sidebar list to reduce clutter, showing all tracking codes for that location.

#### 3. UI/UX Improvements
- **Left-side Popup:** Ensure the delivery details card remains on the left side (as requested) and is responsive for mobile.
- **Group Details:** Add a sub-list within the details card to allow individual tracking of items at the same address.

### Technical Details
- **Data Structure:** Deliveries at the same location will be nested under a primary "stop" object.
- **UI:** Use `framer-motion` for smooth transitions when expanding groups.
- **API:** Optimize Mapillary calls by caching results per session/address.
