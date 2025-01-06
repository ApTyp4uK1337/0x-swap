import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import routes from './routes/index.js';

const app = express();
const upload = multer();

app.use(upload.none());
app.use(bodyParser.json());

app.use('/api', routes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});