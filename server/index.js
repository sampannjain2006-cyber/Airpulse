import app from './src/app.js';
import { env } from './src/config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[AirPulse API] Server running on port ${PORT}`);
  console.log(`[AirPulse API] Environment: ${env.NODE_ENV}`);
});
