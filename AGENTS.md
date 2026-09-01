## Development

This application uses Vue 3, Vite, and Express.

For local frontend development, run:

```
yarn dev
```

For an end-to-end production check, run `yarn build` and then `yarn start`.

## Deployment

Toolforge runs the Express server through `yarn start`; it serves the Vite output in `dist/client` and the `/api` routes from `server.js`.
