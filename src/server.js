const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🐾 AdoPet Backend ejecutándose en http://localhost:${PORT}`);
});