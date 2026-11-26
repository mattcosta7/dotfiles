# Dashboard conventions

- Fetch data with @tanstack/react-query (`useQuery`). Don't fetch in `useEffect` or pass Promises to `use()`.
- The `QueryClientProvider` lives in `src/main.jsx`. Components assume it is present.
- Use `getJSON` from `src/api.js` as the query function so errors are handled the same way everywhere.
- Components are default exports in `src/`, one per file.
