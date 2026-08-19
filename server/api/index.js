import "dotenv/config";
import app from "../src/app.js";

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`CDAR API running at http://127.0.0.1:${PORT}`);
  });
}

export default app;